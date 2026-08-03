import {httpGetJson} from '../../utils/http.js';
import {
    buildFxSpotSymbol,
    mapSymbolToCnbc,
    parseFxPairSymbol,
    toUsdPerUnit,
} from './cnbc-symbols.js';

const CNBC_REQUEST_TIMEOUT_SECONDS = 12;
const CNBC_BATCH_SIZE = 30;
/* CNBC rejects well-known tool user agents (curl, wget), so identify honestly as this extension. */
const CNBC_USER_AGENT = 'gnome-ticker-price-extension/1.0';
const CNBC_QUOTE_ENDPOINT = 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol';

/*
 * CNBC's quote webservice is the REST provider for non-live symbols and the
 * manual prefs verification flow.
 *
 * This module isolates the CNBC wire format from the rest of the system:
 * QuotesService asks for normalized quotes, and prefs verification asks whether
 * a symbol resolves, without either caller caring about raw JSON details.
 * FX pairs have no direct CNBC symbol; both directions of every pair derive
 * from the per-currency USD spot vector fetched in the same batch.
 */
export async function refresh(tickers, {session}) {
    if (!session || tickers.length === 0)
        return new Map();

    const plan = buildRequestPlan(tickers);
    if (plan.unmappedSymbols.length > 0)
        logCnbcWarning(`No CNBC mapping for ${plan.unmappedSymbols.length} symbol(s): ${plan.unmappedSymbols.join(', ')}`);

    try {
        const quotesByCnbcSymbol = await fetchQuotes(session, plan.requestSymbols);
        const quotesBySymbol = assembleQuotes(plan, quotesByCnbcSymbol);
        logRefreshResult(tickers, quotesBySymbol);
        return quotesBySymbol;
    } catch (error) {
        logCnbcWarning(`CNBC batch request failed for ${tickers.length} symbol(s): ${error.message}`);
        throw error;
    }
}

/* prefs and runtime both use the same verification path so symbol validation stays consistent. */
export async function verifySymbol(session, symbol) {
    const normalizedSymbol = `${symbol ?? ''}`.trim().toLowerCase();
    const fxPair = parseFxPairSymbol(normalizedSymbol);

    if (fxPair) {
        const legSymbols = fxLegSymbols(fxPair);
        const quotesByCnbcSymbol = await fetchQuotes(session, legSymbols);
        const quote = deriveFxQuote(fxPair, quotesByCnbcSymbol);
        if (!quote)
            throw new Error(`Could not verify ${symbol}. No quote data was returned by CNBC.`);

        return {symbol: normalizedSymbol, quoteDate: formatVerifyDate(quote.quoteDate)};
    }

    const cnbcSymbol = mapSymbolToCnbc(normalizedSymbol);
    if (!cnbcSymbol)
        throw new Error(`Could not verify ${symbol}. The symbol format is not supported.`);

    const quotesByCnbcSymbol = await fetchQuotes(session, [cnbcSymbol]);
    const quote = quotesByCnbcSymbol.get(cnbcSymbol);
    if (!quote)
        throw new Error(`Could not verify ${symbol}. No quote data was returned by CNBC.`);

    return {symbol: normalizedSymbol, quoteDate: formatVerifyDate(quote.quoteDate)};
}

/* One batched URL serves runtime polling and verification; "=" and "|" must survive encoding for CNBC's grammar. */
export function buildQuoteUrl(cnbcSymbols) {
    const joinedSymbols = cnbcSymbols
        .map(cnbcSymbol => encodeURIComponent(cnbcSymbol).replace(/%3D/g, '='))
        .join('|');

    return `${CNBC_QUOTE_ENDPOINT}?symbols=${joinedSymbols}&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1`;
}

/*
 * Runtime batch parsing is intentionally tolerant: one unusable CNBC entry
 * should not prevent every other symbol in the batch from reaching QuoteStore.
 * Unknown symbols come back as bare {code, symbol} stubs and are skipped here.
 */
export function parseRestQuoteResponse(payload) {
    const quotesByCnbcSymbol = new Map();
    const entries = payload?.FormattedQuoteResult?.FormattedQuote;
    const quoteList = Array.isArray(entries) ? entries : entries ? [entries] : [];

    quoteList.forEach(entry => {
        const cnbcSymbol = `${entry?.symbol ?? ''}`.trim().toUpperCase();
        const price = parseQuoteNumber(entry?.last);
        const quoteDate = normalizeQuoteDate(entry?.last_time);

        if (cnbcSymbol === '' || !Number.isFinite(price) || quoteDate === '')
            return;

        const previousClose = parseQuoteNumber(entry?.previous_day_closing);
        quotesByCnbcSymbol.set(cnbcSymbol, {
            price,
            quoteDate,
            previousClose: Number.isFinite(previousClose) ? previousClose : null,
        });
    });

    return quotesByCnbcSymbol;
}

/* CNBC prices carry thousands separators ("4,118.90"), so numeric parsing strips them first. */
export function parseQuoteNumber(text) {
    const normalized = `${text ?? ''}`.replace(/,/g, '').trim();
    if (normalized === '')
        return null;

    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? value : null;
}

/* CNBC last_time is either a bare date or a full ISO timestamp; both normalize into YYYYMMDD. */
export function normalizeQuoteDate(dateText) {
    const normalized = `${dateText ?? ''}`.slice(0, 10).replaceAll('-', '');
    return /^\d{8}$/.test(normalized) ? normalized : '';
}

/* An FX pair quote is the ratio of both legs' USD-per-unit rates, dated by the freshest leg. */
export function deriveFxQuote({baseCurrency, quoteCurrency}, quotesByCnbcSymbol) {
    const baseLeg = resolveFxLeg(baseCurrency, quotesByCnbcSymbol);
    const quoteLeg = resolveFxLeg(quoteCurrency, quotesByCnbcSymbol);
    if (!baseLeg || !quoteLeg)
        return null;

    const price = baseLeg.usdPerUnit / quoteLeg.usdPerUnit;
    if (!Number.isFinite(price))
        return null;

    const previousCloseRatio = baseLeg.previousUsdPerUnit !== null && quoteLeg.previousUsdPerUnit !== null
        ? baseLeg.previousUsdPerUnit / quoteLeg.previousUsdPerUnit
        : null;
    /* Validated like price, so a degenerate leg cannot leak a non-finite previous close downstream. */
    const previousClose = Number.isFinite(previousCloseRatio) ? previousCloseRatio : null;
    const quoteDate = [baseLeg.quoteDate, quoteLeg.quoteDate]
        .filter(date => date !== null)
        .sort()
        .at(-1) ?? '';
    if (quoteDate === '')
        return null;

    return {price, quoteDate, previousClose};
}

/* USD is the vector anchor with no request of its own; every other leg must resolve from the fetched spot quotes. */
function resolveFxLeg(currencyCode, quotesByCnbcSymbol) {
    if (currencyCode === 'USD')
        return {usdPerUnit: 1, previousUsdPerUnit: 1, quoteDate: null};

    const quote = quotesByCnbcSymbol.get(buildFxSpotSymbol(currencyCode));
    if (!quote)
        return null;

    const usdPerUnit = toUsdPerUnit(currencyCode, quote.price);
    if (usdPerUnit === null)
        return null;

    return {
        usdPerUnit,
        previousUsdPerUnit: quote.previousClose !== null ? toUsdPerUnit(currencyCode, quote.previousClose) : null,
        quoteDate: quote.quoteDate,
    };
}

/* Tickers split into direct CNBC symbols and FX pairs whose spot legs join the same request batch. */
function buildRequestPlan(tickers) {
    const directRequests = [];
    const fxRequests = [];
    const unmappedSymbols = [];
    const requestSymbols = new Set();

    tickers.forEach(ticker => {
        const symbol = `${ticker?.symbol ?? ''}`.trim();
        const storeKey = symbol.toUpperCase();
        const fxPair = parseFxPairSymbol(symbol);

        if (fxPair) {
            fxRequests.push({storeKey, fxPair});
            fxLegSymbols(fxPair).forEach(legSymbol => requestSymbols.add(legSymbol));
            return;
        }

        const cnbcSymbol = mapSymbolToCnbc(symbol);
        if (!cnbcSymbol) {
            unmappedSymbols.push(symbol);
            return;
        }

        directRequests.push({storeKey, cnbcSymbol});
        requestSymbols.add(cnbcSymbol);
    });

    return {directRequests, fxRequests, unmappedSymbols, requestSymbols: [...requestSymbols]};
}

function fxLegSymbols({baseCurrency, quoteCurrency}) {
    return [baseCurrency, quoteCurrency]
        .map(currencyCode => buildFxSpotSymbol(currencyCode))
        .filter(legSymbol => legSymbol !== null);
}

function assembleQuotes({directRequests, fxRequests}, quotesByCnbcSymbol) {
    const quotesBySymbol = new Map();

    directRequests.forEach(({storeKey, cnbcSymbol}) => {
        const quote = quotesByCnbcSymbol.get(cnbcSymbol);
        if (quote)
            quotesBySymbol.set(storeKey, {...quote});
    });

    fxRequests.forEach(({storeKey, fxPair}) => {
        const quote = deriveFxQuote(fxPair, quotesByCnbcSymbol);
        if (quote)
            quotesBySymbol.set(storeKey, quote);
    });

    return quotesBySymbol;
}

/* Larger watchlists split into fixed-size batches so no single URL grows unbounded. */
async function fetchQuotes(session, cnbcSymbols) {
    const quotesByCnbcSymbol = new Map();

    for (let index = 0; index < cnbcSymbols.length; index += CNBC_BATCH_SIZE) {
        const batch = cnbcSymbols.slice(index, index + CNBC_BATCH_SIZE);
        const payload = await httpGetJson(session, buildQuoteUrl(batch), {
            timeoutSeconds: CNBC_REQUEST_TIMEOUT_SECONDS,
            timeoutMessage: `Timed out after ${CNBC_REQUEST_TIMEOUT_SECONDS}s while loading CNBC quotes.`,
            headers: {'User-Agent': CNBC_USER_AGENT},
        });
        parseRestQuoteResponse(payload).forEach((quote, cnbcSymbol) => quotesByCnbcSymbol.set(cnbcSymbol, quote));
    }

    return quotesByCnbcSymbol;
}

/* The verification dialog shows a human-readable date, so YYYYMMDD gains its dashes back. */
export function formatVerifyDate(quoteDate) {
    return `${quoteDate.slice(0, 4)}-${quoteDate.slice(4, 6)}-${quoteDate.slice(6)}`;
}

/* Provider diagnostics are centralized so tolerant parsing still leaves useful GNOME Shell logs. */
function logRefreshResult(tickers, quotesBySymbol) {
    const missingSymbols = tickers
        .map(ticker => `${ticker?.symbol ?? ''}`.trim().toUpperCase())
        .filter(storeKey => storeKey !== '' && !quotesBySymbol.has(storeKey));

    if (quotesBySymbol.size === 0) {
        logCnbcWarning('CNBC batch returned no usable quotes.');
        return;
    }

    if (missingSymbols.length > 0)
        logCnbcWarning(`CNBC batch missed ${missingSymbols.length} symbol(s): ${missingSymbols.join(', ')}`);
}

/* Tests run outside GNOME Shell's logging globals, so logging stays optional at the provider boundary. */
function logCnbcWarning(message) {
    if (typeof log === 'function')
        log(`Ticker Price Extension: ${message}`);
}
