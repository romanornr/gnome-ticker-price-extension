/* Provider quote objects are normalized here so Kraken transport code stays focused on websocket mechanics. */
export function createKrakenQuote(entry) {
    const price = Number.parseFloat(`${entry?.last ?? ''}`);
    const quoteDate = normalizeKrakenTimestampDate(entry?.timestamp ?? '');
    const change = Number.parseFloat(`${entry?.change ?? ''}`);
    const changePct = Number.parseFloat(`${entry?.change_pct ?? ''}`);

    if (!Number.isFinite(price) || quoteDate === '') return null;

    return {price, quoteDate, previousClose: deriveKrakenPreviousClose(price, change, changePct)};
}

/* Kraken can derive previous close from either absolute change or percent change. */
function deriveKrakenPreviousClose(price, change, changePct) {
    if (Number.isFinite(change)) {
        const previousClose = price - change;
        if (Number.isFinite(previousClose) && previousClose > 0) return previousClose;
    }

    if (Number.isFinite(changePct) && changePct > -100) {
        const previousClose = price / (1 + (changePct / 100));
        if (Number.isFinite(previousClose) && previousClose > 0) return previousClose;
    }

    return null;
}

/* Kraken timestamps are normalized to the shared YYYYMMDD quote-date shape here. */
function normalizeKrakenTimestampDate(timestampText) {
    const normalized = timestampText.slice(0, 10).replaceAll('-', '');
    return /^\d{8}$/.test(normalized) ? normalized : '';
}
