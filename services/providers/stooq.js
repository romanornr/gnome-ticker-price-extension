import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

const STOOQ_REQUEST_TIMEOUT_SECONDS = 12;

/*
 * Stooq is the REST provider for non-live symbols and the manual prefs
 * verification flow.
 *
 * This module isolates the Stooq wire format from the rest of the system:
 * QuotesService asks for normalized quotes, and prefs verification asks whether
 * a symbol resolves, without either caller caring about raw CSV details.
 */
export async function refresh(tickers, {session}) {
    if (!session || tickers.length === 0) return new Map();

    try {
        const csv = await fetchText(session, buildBatchQuoteUrl(tickers));
        const expectedSymbols = getExpectedSymbols(tickers);
        const parseResult = parseBatchQuoteResponse(csv, expectedSymbols);
        logBatchParseResult(parseResult, expectedSymbols.size);

        return parseResult.quotesBySymbol;
    } catch (error) {
        logStooqWarning(`Stooq batch request failed for ${tickers.length} symbol(s): ${error.message}`);
        throw error;
    }
}

/* prefs and runtime both use the same verification path so symbol validation stays consistent. */
export async function verifySymbol(session, symbol) {
    const csv = await fetchText(session, buildLookupUrl(symbol));
    const rows = csv
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
    const firstRow = rows[0] ?? '';
    const fields = firstRow.split(',');

    if (fields.length < 4)
        throw new Error(`Could not verify ${symbol}. Stooq returned an unexpected response.`);

    const returnedSymbol = `${fields[0] ?? ''}`.trim().toLowerCase();
    const quoteDate = `${fields[1] ?? ''}`.trim();
    const price = Number.parseFloat(`${fields[3] ?? ''}`.trim());

    if (returnedSymbol === '' || returnedSymbol === 'symbol')
        throw new Error(`Could not verify ${symbol}. Stooq returned an unexpected response.`);

    if (quoteDate.toUpperCase() === 'N/D' || !Number.isFinite(price))
        throw new Error(`Could not verify ${symbol}. No quote data was returned by Stooq.`);

    return {symbol: returnedSymbol, quoteDate};
}

/* Runtime quote polling batches symbols into Stooq's multi-symbol lookup endpoint here. */
export function buildBatchQuoteUrl(tickers) {
    const joinedSymbols = tickers
        .map(ticker => ticker.symbol)
        .join('+');

    return buildLookupUrl(joinedSymbols);
}

/* Both verification and batch refresh build their final Stooq URL through this helper. */
export function buildLookupUrl(symbol) {
    return `https://stooq.com/q/l/?s=${encodeURIComponent(symbol).replace(/%2B/g, '+')}&f=sd2t2cp&i=d`;
}

/* All Stooq interaction ultimately passes through this transport helper. */
async function fetchText(session, url) {
    const message = Soup.Message.new('GET', url);
    const cancellable = new Gio.Cancellable();
    let timeoutId = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        STOOQ_REQUEST_TIMEOUT_SECONDS,
        () => {
            timeoutId = 0;
            cancellable.cancel();
            return GLib.SOURCE_REMOVE;
        }
    );

    try {
        const bytes = await sendAndRead(session, message, cancellable);
        return new TextDecoder().decode(bytes.get_data()).trim();
    } catch (error) {
        if (cancellable.is_cancelled())
            throw new Error(`Timed out after ${STOOQ_REQUEST_TIMEOUT_SECONDS}s while loading Stooq quotes.`);

        throw error;
    } finally {
        if (timeoutId !== 0)
            GLib.Source.remove(timeoutId);
    }
}

/* GJS exposes Soup async methods through callback/finish pairs, so bridge them into the async/await flow here. */
function sendAndRead(session, message, cancellable) {
    return new Promise((resolve, reject) => {
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, cancellable, (_session, result) => {
            try {
                resolve(session.send_and_read_finish(result));
            } catch (error) {
                reject(error);
            }
        });
    });
}

/* Raw Stooq CSV rows are converted here into the normalized quote shape used by the rest of the system. */
export function parseBatchQuotes(csv, tickersOrExpectedCount = 0) {
    const expectedSymbols = getExpectedSymbols(tickersOrExpectedCount);
    const expectedCount = expectedSymbols.size > 0 ? expectedSymbols.size : Number(tickersOrExpectedCount);
    const parseResult = parseBatchQuoteResponse(csv, expectedSymbols);

    logBatchParseResult(parseResult, expectedSymbols.size > 0 ? expectedSymbols.size : expectedCount);
    return parseResult.quotesBySymbol;
}

/*
 * Runtime batch parsing is intentionally tolerant: one bad Stooq row should not
 * prevent every other symbol in the startup seed from reaching QuoteStore.
 */
function parseBatchQuoteResponse(csv, expectedSymbols = new Set()) {
    const quotesBySymbol = new Map();
    const rows = csv
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
    const skippedRows = [];

    rows.forEach(row => {
        const fields = row.split(',');
        const symbol = fields[0]?.trim().toUpperCase();
        const quoteDate = normalizeQuoteDate(fields[1]?.trim() ?? '');
        const price = Number.parseFloat(fields[3]?.trim() ?? '');
        const previousClose = Number.parseFloat(fields[4]?.trim() ?? '');

        if (!symbol || !quoteDate || !Number.isFinite(price)) {
            skippedRows.push(row);
            return;
        }

        quotesBySymbol.set(symbol, {
            price,
            quoteDate,
            previousClose: Number.isFinite(previousClose) ? previousClose : null,
        });
    });

    return {
        csv,
        rows,
        quotesBySymbol,
        skippedRows,
        missingSymbols: [...expectedSymbols].filter(symbol => !quotesBySymbol.has(symbol)),
    };
}

/* Stooq dates are normalized once here so callers never reason about provider-specific date formatting. */
export function normalizeQuoteDate(dateText) {
    const normalized = dateText.replaceAll('-', '');
    return /^\d{8}$/.test(normalized) ? normalized : '';
}

/* Diagnostics compare parsed rows against requested ticker symbols using Stooq's uppercase response shape. */
function getExpectedSymbols(tickersOrExpectedCount) {
    if (!Array.isArray(tickersOrExpectedCount))
        return new Set();

    return new Set(
        tickersOrExpectedCount
            .map(ticker => `${ticker?.symbol ?? ''}`.trim().toUpperCase())
            .filter(symbol => symbol !== '')
    );
}

/* Provider diagnostics are centralized so tolerant parsing still leaves useful GNOME Shell logs. */
function logBatchParseResult(parseResult, expectedCount) {
    const {csv, rows, quotesBySymbol, skippedRows, missingSymbols} = parseResult;

    if (rows.length === 0) {
        logStooqWarning('Stooq batch returned an empty response.');
        return;
    }

    if (skippedRows.length > 0)
        logStooqWarning(`Skipped ${skippedRows.length} unusable Stooq row(s): ${skippedRows.join(' | ')}`);

    if (missingSymbols.length > 0)
        logStooqWarning(`Stooq batch missed ${missingSymbols.length} symbol(s): ${missingSymbols.join(', ')}`);

    if (Number.isFinite(expectedCount) && quotesBySymbol.size !== expectedCount)
        logStooqWarning(`Stooq batch returned ${quotesBySymbol.size}/${expectedCount} usable quotes.`);

    if (quotesBySymbol.size === 0)
        logStooqWarning(`Stooq batch had no usable quote rows: ${csv}`);
}

/* Tests run outside GNOME Shell's logging globals, so logging stays optional at the provider boundary. */
function logStooqWarning(message) {
    if (typeof log === 'function')
        log(`Ticker Price Extension: ${message}`);
}
