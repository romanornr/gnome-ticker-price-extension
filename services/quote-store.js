import GLib from 'gi://GLib';

export class QuoteStore {
    constructor() {
        this._quotesBySymbol = new Map();
        this._lastRefreshTimeBySymbol = new Map();
    }

    setQuote(symbol, quote) {
        const normalizedSymbol = normalizeSymbol(symbol);
        if (normalizedSymbol === '' || !quote)
            return;

        this._quotesBySymbol.set(normalizedSymbol, {...quote});
    }

    getQuote(symbol) {
        const normalizedSymbol = normalizeSymbol(symbol);
        return normalizedSymbol === '' ? null : (this._quotesBySymbol.get(normalizedSymbol) ?? null);
    }

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

    markRefreshed(symbols) {
        const refreshedAtUsec = GLib.get_monotonic_time();
        [...symbols].forEach(symbol => {
            const normalizedSymbol = normalizeSymbol(symbol?.symbol ?? symbol);
            if (normalizedSymbol !== '')
                this._lastRefreshTimeBySymbol.set(normalizedSymbol, refreshedAtUsec);
        });
    }

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

    getLastRefreshUsec(symbol) {
        const normalizedSymbol = normalizeSymbol(symbol);
        return normalizedSymbol === '' ? 0 : (this._lastRefreshTimeBySymbol.get(normalizedSymbol) ?? 0);
    }

    clear() {
        this._quotesBySymbol.clear();
        this._lastRefreshTimeBySymbol.clear();
    }
}

function normalizeSymbol(symbol) {
    return `${symbol ?? ''}`.trim().toUpperCase();
}
