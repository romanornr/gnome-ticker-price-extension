import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {ASSET_CATEGORIES, CRYPTO_PROVIDERS} from '../../utils/asset-categories.js';
import {hyperliquidAdapter} from '../../utils/crypto-providers/hyperliquid-adapter.js';
import {LiveWebsocketProvider} from './live-websocket-provider.js';

/*
 * Hyperliquid uses both REST snapshots and a live websocket in the same provider
 * area:
 * - refresh() handles the REST fallback path used when live data is unavailable
 * - HyperliquidLiveProvider handles the persistent websocket path
 *
 * Both paths normalize into the same quote shape so QuotesService can treat
 * Hyperliquid as one provider regardless of where the latest quote came from.
 */
export async function refresh(tickers, {session, quoteStore}) {
    if (!session || tickers.length === 0)
        return new Map();

    const snapshots = await hyperliquidAdapter.fetchMarketSnapshots(session);
    const perpsBySymbol = new Map(snapshots.perps.map(entry => [entry.liveSymbol, entry]));
    const spotsBySymbol = new Map(snapshots.spots.map(entry => [entry.liveSymbol, entry]));
    const quotesBySymbol = new Map();

    tickers.forEach(ticker => {
        const entry = (ticker.liveSymbol ?? '').includes('/')
            ? spotsBySymbol.get(ticker.liveSymbol)
            : perpsBySymbol.get(ticker.liveSymbol);
        const existingQuote = quoteStore?.getQuote(ticker.symbol);
        const quote = hyperliquidAdapter.createQuote(entry, existingQuote?.previousClose);
        if (quote)
            quotesBySymbol.set(ticker.symbol.toUpperCase(), quote);
    });

    return quotesBySymbol;
}

/*
 * HyperliquidLiveProvider mirrors KrakenLiveProvider structurally, but its
 * provider-specific logic is different: one subscription per market symbol and
 * payload parsing that uses the shared Hyperliquid quote normalizer.
 */
export class HyperliquidLiveProvider extends LiveWebsocketProvider {
    /* Hyperliquid adds quoteStore access because live updates may need previous-close fallback context. */
    constructor({uuid, onQuotes, quoteStore}) {
        super({uuid, onQuotes, filterTicker: isHyperliquidTicker});
        this._quoteStore = quoteStore;
    }

    /* Shared websocket logging uses this provider name so Hyperliquid lifecycle events are easy to spot. */
    get logPrefix() {
        return 'Hyperliquid';
    }

    /* Hyperliquid connection setup is just the provider-specific websocket endpoint for the shared base lifecycle. */
    async _openConnection(session) {
        const message = Soup.Message.new('GET', hyperliquidAdapter.websocketUrl);
        return new Promise((resolve, reject) => {
            session.websocket_connect_async(
                message,
                null,
                [],
                GLib.PRIORITY_DEFAULT,
                null,
                (_session, result) => {
                    try {
                        resolve(session.websocket_connect_finish(result));
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
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
        if (payload?.channel === 'subscriptionResponse' && payload?.data?.type === 'activeAssetCtx')
            return {resetReconnect: true};

        if (payload?.channel !== 'activeAssetCtx' || !payload?.data?.coin || !payload?.data?.ctx)
            return null;

        const liveSymbol = hyperliquidAdapter.normalizeLiveSymbol(payload.data.coin);
        const tickerSymbol = this._getSymbolToTickerSymbolMap().get(liveSymbol);
        if (!tickerSymbol)
            return null;

        const existingQuote = this._quoteStore?.getQuote(tickerSymbol);
        const quote = hyperliquidAdapter.createQuote({
            liveSymbol,
            ctx: payload.data.ctx,
        }, existingQuote?.previousClose);

        if (!quote)
            return null;

        return {
            resetReconnect: true,
            quotesBySymbol: new Map([[tickerSymbol, quote]]),
        };
    }
}

/* Hyperliquid live updates only apply to crypto tickers explicitly assigned there. */
function isHyperliquidTicker(ticker) {
    return ticker?.assetCategory === ASSET_CATEGORIES.CRYPTO &&
        typeof ticker.liveSymbol === 'string' &&
        ticker.liveSymbol !== '' &&
        ticker.cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID;
}
