import {CRYPTO_PROVIDERS} from '../../utils/asset-categories.js';
import {krakenAdapter} from '../../utils/crypto-providers/kraken-adapter.js';
import {
    getDesiredLiveSymbols,
    isLiveCryptoTickerForProvider,
} from './live-quote-provider.js';
import {
    LiveWebsocketProvider,
    openWebsocketConnection,
} from './live-websocket-provider.js';

/*
 * Kraken uses both a REST fallback and a live websocket in the same provider
 * area, mirroring Hyperliquid:
 * - refresh() handles the REST polling path used when live data is unavailable
 * - KrakenLiveProvider handles the persistent websocket path
 *
 * Both paths normalize into the same quote shape so QuotesService can treat
 * Kraken as one provider regardless of where the latest quote came from.
 */
export async function refresh(tickers, {session}) {
    if (!session || tickers.length === 0) return new Map();

    const quotesByPair = await krakenAdapter.fetchTickerQuotes(session, getDesiredLiveSymbols(tickers));
    const quotesBySymbol = new Map();

    tickers.forEach(ticker => {
        const quote = quotesByPair.get(ticker.liveSymbol);
        if (quote)
            quotesBySymbol.set(ticker.symbol.toUpperCase(), quote);
    });

    return quotesBySymbol;
}

/*
 * KrakenLiveProvider plugs Kraken-specific transport details into the shared
 * live-websocket lifecycle. It only needs to define:
 * - how to connect to Kraken
 * - how to subscribe to ticker updates
 * - how Kraken payloads become normalized quote updates
 *
 * Everything else, including reconnect and subscription reconciliation, comes
 * from LiveWebsocketProvider so it stays parallel with Hyperliquid.
 */
export class KrakenLiveProvider extends LiveWebsocketProvider {
    /* Kraken only needs to supply its provider-specific hooks because lifecycle behavior comes from the base class. */
    constructor({uuid, onQuotes, onStale}) {
        super({uuid, onQuotes, onStale, filterTicker: isKrakenTicker});
    }

    /* Shared websocket logging uses this provider name so errors stay distinguishable at runtime. */
    get logPrefix() {
        return 'Kraken';
    }

    /* Kraken connection setup is just the provider-specific websocket endpoint for the shared base lifecycle. */
    async _openConnection(session) {
        return openWebsocketConnection(session, krakenAdapter.websocketUrl);
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

/* Kraken live support is limited to crypto tickers with a valid live symbol. */
function isKrakenTicker(ticker) {
    return isLiveCryptoTickerForProvider(ticker, CRYPTO_PROVIDERS.KRAKEN);
}
