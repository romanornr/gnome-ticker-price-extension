/* Provider quote objects are normalized here so both REST and websocket paths emit the same shape. */
export function createHyperliquidQuote(entry, fallbackPreviousClose = null) {
    const price = firstFiniteNumber(entry?.ctx?.midPx, entry?.ctx?.markPx);
    const previousClose = firstFinitePositiveNumber(entry?.ctx?.prevDayPx, fallbackPreviousClose);

    if (!Number.isFinite(price))
        return null;

    return {
        price,
        quoteDate: getCurrentUtcDate(),
        previousClose: Number.isFinite(previousClose) ? previousClose : null,
    };
}

/* Quote normalization picks the first usable numeric field from Hyperliquid's multiple price representations. */
function firstFiniteNumber(...values) {
    for (const value of values) {
        const parsed = Number.parseFloat(`${value ?? ''}`);
        if (Number.isFinite(parsed))
            return parsed;
    }

    return null;
}

/* Previous close fallbacks require a positive finite number, not just any parseable float. */
function firstFinitePositiveNumber(...values) {
    for (const value of values) {
        const parsed = Number.parseFloat(`${value ?? ''}`);
        if (Number.isFinite(parsed) && parsed > 0)
            return parsed;
    }

    return null;
}

/* Hyperliquid quote dates are represented in UTC date form for cache invalidation and display consistency. */
function getCurrentUtcDate() {
    return new Date().toISOString().slice(0, 10).replaceAll('-', '');
}
