import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

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

    const csv = await fetchText(session, buildBatchQuoteUrl(tickers));
    return parseBatchQuotes(csv, tickers.length);
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
    const bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    return new TextDecoder().decode(bytes.get_data()).trim();
}

/* Raw Stooq CSV rows are converted here into the normalized quote shape used by the rest of the system. */
export function parseBatchQuotes(csv, expectedCount) {
    const quotesBySymbol = new Map();
    const rows = csv
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');

    rows.forEach(row => {
        const fields = row.split(',');
        const symbol = fields[0]?.trim().toUpperCase();
        const quoteDate = normalizeQuoteDate(fields[1]?.trim() ?? '');
        const price = Number.parseFloat(fields[3]?.trim() ?? '');
        const previousClose = Number.parseFloat(fields[4]?.trim() ?? '');

        if (!symbol || !quoteDate || !Number.isFinite(price))
            throw new Error(`Unexpected batched quote row: ${row}`);

        quotesBySymbol.set(symbol, {
            price,
            quoteDate,
            previousClose: Number.isFinite(previousClose) ? previousClose : null,
        });
    });

    if (quotesBySymbol.size !== expectedCount)
        throw new Error(`Unexpected batched quote response: ${csv}`);

    return quotesBySymbol;
}

/* Stooq dates are normalized once here so callers never reason about provider-specific date formatting. */
export function normalizeQuoteDate(dateText) {
    const normalized = dateText.replaceAll('-', '');
    return /^\d{8}$/.test(normalized) ? normalized : '';
}
