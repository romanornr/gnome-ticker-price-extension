import GLib from 'gi://GLib';

/*
 * QuoteStore is the shared in-memory state for normalized quote data.
 *
 * Providers write quotes here, schedulers consult refresh timestamps here, and
 * entry building reads from here. That makes this store the stable data boundary
 * between the transport layer and the UI-facing formatting layer.
 */
export class QuoteStore {
    /* The store keeps both quote values and refresh timestamps because scheduling depends on both. */
    constructor() {
        this._quotesBySymbol = new Map();
        this._lastRefreshTimeBySymbol = new Map();
    }

    /* Providers write normalized quotes here so later layers read one stable shape. */
    setQuote(symbol, quote) {
        const normalizedSymbol = normalizeSymbol(symbol);
        if (normalizedSymbol === '' || !quote)
            return;

        this._quotesBySymbol.set(normalizedSymbol, {...quote});
    }

    /* Entry-building and provider fallback logic read from the same cache through this lookup. */
    getQuote(symbol) {
        const normalizedSymbol = normalizeSymbol(symbol);
        return normalizedSymbol === '' ? null : (this._quotesBySymbol.get(normalizedSymbol) ?? null);
    }

    /* When saved tickers change, stale symbols are removed here so old quotes cannot leak back into the panel. */
    prune(activeSymbols) {
        const activeSymbolSet = new Set(
            [...activeSymbols].map(symbol => normalizeSymbol(symbol)).filter(symbol => symbol !== '')
        );

        [...this._quotesBySymbol.keys()].forEach(symbol => {
            if (!activeSymbolSet.has(symbol))
                this._quotesBySymbol.delete(symbol);
        });

        [...this._lastRefreshTimeBySymbol.keys()].forEach(symbol => {
            if (!activeSymbolSet.has(symbol))
                this._lastRefreshTimeBySymbol.delete(symbol);
        });
    }

    /* After a refresh succeeds, scheduling records the new monotonic refresh timestamp here. */
    markRefreshed(symbols) {
        const refreshedAtUsec = GLib.get_monotonic_time();
        [...symbols].forEach(symbol => {
            const normalizedSymbol = normalizeSymbol(symbol?.symbol ?? symbol);
            if (normalizedSymbol !== '')
                this._lastRefreshTimeBySymbol.set(normalizedSymbol, refreshedAtUsec);
        });
    }

    /* Scheduling asks the store whether a symbol has waited long enough for another refresh. */
    hasReachedCadence(symbol, refreshIntervalSeconds, nowUsec = GLib.get_monotonic_time()) {
        const normalizedSymbol = normalizeSymbol(symbol);
        if (normalizedSymbol === '')
            return true;

        const lastRefreshUsec = this._lastRefreshTimeBySymbol.get(normalizedSymbol);
        if (!lastRefreshUsec)
            return true;

        const elapsedSeconds = (nowUsec - lastRefreshUsec) / 1_000_000;
        return elapsedSeconds >= refreshIntervalSeconds;
    }

    /* QuotesService asks for the last refresh timestamp when delegating schedule-policy decisions. */
    getLastRefreshUsec(symbol) {
        const normalizedSymbol = normalizeSymbol(symbol);
        return normalizedSymbol === '' ? 0 : (this._lastRefreshTimeBySymbol.get(normalizedSymbol) ?? 0);
    }

    /* Full shutdown clears both quote values and cadence history so restart begins cleanly. */
    clear() {
        this._quotesBySymbol.clear();
        this._lastRefreshTimeBySymbol.clear();
    }
}

/* Symbol normalization keeps provider outputs and saved tickers keyed consistently across the system. */
function normalizeSymbol(symbol) {
    return `${symbol ?? ''}`.trim().toUpperCase();
}
