import {CRYPTO_PROVIDERS} from '../../utils/asset-categories.js';
import {krakenAdapter} from '../../utils/crypto-providers/index.js';
import {LiveWebsocketProvider} from './live-websocket-provider.js';

/*
 * KrakenProvider owns polling and websocket protocol messages.
 * LiveWebsocketProvider supplies routing, lifecycle, reconnect, and stale notification.
 */
export class KrakenProvider extends LiveWebsocketProvider {
    constructor(options) {
        super({
            ...options,
            id: CRYPTO_PROVIDERS.KRAKEN,
            name: 'Kraken',
            websocketUrl: krakenAdapter.websocketUrl,
        });
    }

    /* Kraken's REST endpoint accepts the same live symbols used by its websocket. */
    async poll(tickers, {session}) {
        if (!session || tickers.length === 0) return new Map();

        const quotesByPair = await krakenAdapter.fetchTickerQuotes(
            session,
            [...new Set(tickers.map(ticker => ticker.liveSymbol))]
        );
        const quotesBySymbol = new Map();

        tickers.forEach(ticker => {
            const quote = quotesByPair.get(ticker.liveSymbol);
            if (quote) quotesBySymbol.set(ticker.symbol.toUpperCase(), quote);
        });

        return quotesBySymbol;
    }

    /* Kraken uses one subscribe request containing the full symbol list. */
    _subscribe(websocket, symbols) {
        websocket.send_text(JSON.stringify({
            method: 'subscribe',
            params: {
                channel: 'ticker',
                event_trigger: 'trades',
                symbol: symbols,
                snapshot: true,
            },
        }));
    }

    /* Kraken payloads are converted here into the normalized quote map expected by QuotesService. */
    _handlePayload(payload) {
        if (payload?.success === false) {
            logError(
                new Error(payload.error ?? 'Kraken websocket subscription failed'),
                `${this._uuid}: Kraken websocket rejected request`
            );
            return {reconnect: true};
        }

        if (
            payload?.method === 'subscribe' &&
            payload?.success === true &&
            payload?.result?.channel === 'ticker'
        ) {
            return {resetReconnect: true};
        }

        if (payload?.channel !== 'ticker' || !Array.isArray(payload.data)) return null;

        const updatedQuotes = new Map();
        const liveSymbolMap = this._getSymbolToTickerSymbolMap();

        payload.data.forEach(entry => {
            const tickerSymbol = liveSymbolMap.get(entry?.symbol ?? '');
            const quote = krakenAdapter.createQuote(entry);

            if (!tickerSymbol || !quote)
                return;

            updatedQuotes.set(tickerSymbol, quote);
        });

        return {resetReconnect: updatedQuotes.size > 0, quotesBySymbol: updatedQuotes};
    }
}
