import {CRYPTO_PROVIDERS} from '../../utils/asset-categories.js';
import {hyperliquidAdapter} from '../../utils/crypto-providers/hyperliquid-adapter.js';
import {LiveWebsocketProvider} from './live-websocket-provider.js';

/*
 * HyperliquidProvider owns snapshot polling and websocket protocol messages.
 * LiveWebsocketProvider supplies routing, lifecycle, reconnect, and stale notification.
 */
export class HyperliquidProvider extends LiveWebsocketProvider {
    constructor(options) {
        super({
            ...options,
            id: CRYPTO_PROVIDERS.HYPERLIQUID,
            name: 'Hyperliquid',
            websocketUrl: hyperliquidAdapter.websocketUrl,
        });
    }

    /* One snapshot response covers every requested Hyperliquid perp and spot market. */
    async poll(tickers, {session}) {
        if (!session || tickers.length === 0) return new Map();

        const snapshots = await hyperliquidAdapter.fetchMarketSnapshots(session);
        const perpsBySymbol = new Map(snapshots.perps.map(entry => [entry.liveSymbol, entry]));
        const spotsBySymbol = new Map(snapshots.spots.map(entry => [entry.liveSymbol, entry]));
        const quotesBySymbol = new Map();

        tickers.forEach(ticker => {
            const entries = ticker.liveSymbol.includes('/') ? spotsBySymbol : perpsBySymbol;
            const quote = hyperliquidAdapter.createQuote(entries.get(ticker.liveSymbol));
            if (quote) quotesBySymbol.set(ticker.symbol.toUpperCase(), quote);
        });

        return quotesBySymbol;
    }

    /* Hyperliquid requires one subscribe message per live market symbol. */
    _subscribe(websocket, symbols) {
        symbols.forEach(symbol => {
            websocket.send_text(JSON.stringify({
                method: 'subscribe',
                subscription: {
                    type: 'activeAssetCtx',
                    coin: symbol,
                },
            }));
        });
    }

    /* Hyperliquid live payloads are normalized through createHyperliquidQuote before leaving the provider layer. */
    _handlePayload(payload) {
        if (payload?.channel === 'subscriptionResponse' && payload?.data?.type === 'activeAssetCtx') return {resetReconnect: true};

        if (payload?.channel !== 'activeAssetCtx' || !payload?.data?.coin || !payload?.data?.ctx) return null;

        const liveSymbol = hyperliquidAdapter.normalizeLiveSymbol(payload.data.coin);
        const tickerSymbol = this._getSymbolToTickerSymbolMap().get(liveSymbol);
        if (!tickerSymbol) return null;

        const quote = hyperliquidAdapter.createQuote({liveSymbol, ctx: payload.data.ctx});

        if (!quote) return null;

        return {resetReconnect: true, quotesBySymbol: new Map([[tickerSymbol, quote]])};
    }
}
