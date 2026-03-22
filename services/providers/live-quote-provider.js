import GLib from 'gi://GLib';

/*
 * LiveQuoteProvider shape contract
 *
 * This file documents the common system contract between QuotesService and the
 * concrete live providers. It is intentionally small: the goal is not to hide
 * provider differences, but to make the orchestration layer depend on one
 * predictable interface and one normalized quote shape.
 *
 * A live quote provider is expected to expose:
 * - start(session): begin provider lifecycle using the shared Soup.Session
 * - stop(): tear down sockets, timers, and internal subscription state
 * - updateSubscriptions(tickers): reconcile desired live-symbol subscriptions
 * - isConnected(): report whether the live transport is currently connected
 *
 * When provider data arrives it should call the supplied onQuotes callback with:
 *   Map<normalizedTickerSymbolUppercase, {
 *       price: number,
 *       quoteDate: string,
 *       previousClose: number | null,
 *   }>
 */

/* Saved ticker configs are reduced to the unique live-symbol subscriptions providers should request. */
export function getDesiredLiveSymbols(tickers) {
    return [...new Set(
        tickers
            .map(ticker => ticker.liveSymbol)
            .filter(liveSymbol => typeof liveSymbol === 'string' && liveSymbol !== '')
    )];
}

/* Providers subscribe by live symbol, but the rest of the system renders by saved ticker symbol. */
/* Live payloads are translated back to saved ticker symbols through this lookup map. */
export function createTickerSymbolMap(tickers) {
    return new Map(
        tickers
            .filter(ticker => typeof ticker.liveSymbol === 'string' && ticker.liveSymbol !== '')
            .map(ticker => [ticker.liveSymbol, ticker.symbol.toUpperCase()])
    );
}

/* Shared timeout cleanup keeps provider lifecycle helpers using one consistent convention. */
export function removeTimeout(sourceId) {
    if (sourceId === 0)
        return 0;

    GLib.Source.remove(sourceId);
    return 0;
}
