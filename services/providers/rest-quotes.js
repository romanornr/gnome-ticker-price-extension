import {isLiveCryptoTicker} from '../../utils/asset-categories.js';

import {refresh as refreshCnbcQuotes} from './cnbc.js';
import {refresh as refreshNasdaqQuotes} from './nasdaq.js';
import {refresh as refreshFallbackFxQuotes} from './open-er-api.js';
import {mapSymbolToCnbc, parseFxPairSymbol} from './cnbc-symbols.js';

/*
 * Runtime and prefs share this CNBC-first chain with narrow Nasdaq/FX fallbacks.
 * Complete CNBC passes make no fallback requests; prefs runs the same chain quietly.
 */
export async function refresh(tickers, context) {
    let quotesBySymbol = new Map();
    let cnbcError = null;

    try {
        quotesBySymbol = await refreshCnbcQuotes(tickers, context);
    } catch (error) {
        cnbcError = error;
    }

    const missingTickers = tickers.filter(ticker => !quotesBySymbol.has(`${ticker?.symbol ?? ''}`.trim().toUpperCase()));
    if (missingTickers.length === 0) {
        if (cnbcError)
            throw cnbcError;

        return quotesBySymbol;
    }

    const recoveredCount = await runFallbacks(missingTickers, context, quotesBySymbol);
    if (!context?.quiet)
        logRestWarning(`CNBC missed ${missingTickers.length} symbol(s); fallbacks recovered ${recoveredCount}.`);

    if (quotesBySymbol.size === 0 && cnbcError)
        throw cnbcError;

    return quotesBySymbol;
}

/* QuotesService composes this flat capability directly while live crypto remains owned by its socket provider. */
export const restProvider = {
    id: 'rest',
    ownsTicker: ticker => !isLiveCryptoTicker(ticker),
    poll: refresh,
};

/*
 * Prefs verification resolves through the same chain as a refresh pass, so the
 * dialog cannot reject a symbol that the panel would then display happily.
 * The asset category comes from the dialog because Nasdaq needs it to pick an
 * asset class; without one, only CNBC and the FX table can answer.
 */
export async function verifySymbol(session, symbol, assetCategory = null) {
    const normalizedSymbol = `${symbol ?? ''}`.trim().toLowerCase();
    if (!parseFxPairSymbol(normalizedSymbol) && !mapSymbolToCnbc(normalizedSymbol))
        throw new Error(`Could not verify ${symbol}. The symbol format is not supported.`);

    const quotesBySymbol = await refresh([{symbol: normalizedSymbol, assetCategory}], {session, quiet: true});
    const quote = quotesBySymbol.get(normalizedSymbol.toUpperCase());
    if (!quote)
        throw new Error(`Could not verify ${symbol}. No quote data was returned by CNBC.`);

    return {
        symbol: normalizedSymbol,
        quoteDate: `${quote.quoteDate.slice(0, 4)}-${quote.quoteDate.slice(4, 6)}-${quote.quoteDate.slice(6)}`,
    };
}

/* Both providers receive every miss and enforce their own ownership without duplicating eligibility policy here. */
async function runFallbacks(missingTickers, context, quotesBySymbol) {
    /* The two fallbacks hit unrelated hosts, so a slow one must not delay the other. */
    const recoveredCounts = await Promise.all([
        mergeFallbackQuotes('Nasdaq', () => refreshNasdaqQuotes(missingTickers, context), quotesBySymbol, context?.quiet),
        mergeFallbackQuotes('FX rate table', () => refreshFallbackFxQuotes(missingTickers, context), quotesBySymbol, context?.quiet),
    ]);

    return recoveredCounts.reduce((total, count) => total + count, 0);
}

async function mergeFallbackQuotes(fallbackName, refreshFallback, quotesBySymbol, quiet) {
    try {
        const fallbackQuotes = await refreshFallback();
        fallbackQuotes.forEach((quote, storeKey) => quotesBySymbol.set(storeKey, quote));
        return fallbackQuotes.size;
    } catch (error) {
        if (!quiet) logRestError(error, `${fallbackName} fallback refresh failed`);
        return 0;
    }
}

/* Tests run outside GNOME Shell's logging globals, so logging stays optional at the provider boundary. */
function logRestWarning(message) {
    if (typeof log === 'function')
        log(`Ticker Price Extension: ${message}`);
}

/* Swallowed fallback failures never reach QuotesService, so the stack trace has to be logged here or it is lost. */
function logRestError(error, message) {
    if (typeof logError === 'function')
        logError(error, `Ticker Price Extension: ${message}`);
    else
        logRestWarning(`${message}: ${error.message}`);
}
