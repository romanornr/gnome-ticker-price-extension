import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {ASSET_CATEGORIES, CRYPTO_PROVIDERS} from '../../utils/asset-categories.js';
import {krakenAdapter} from '../../utils/crypto-providers/kraken-adapter.js';
import {LiveWebsocketProvider} from './live-websocket-provider.js';

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
    constructor({uuid, onQuotes}) {
        super({uuid, onQuotes, filterTicker: isKrakenTicker});
    }

    /* Shared websocket logging uses this provider name so errors stay distinguishable at runtime. */
    get logPrefix() {
        return 'Kraken';
    }

    /* Kraken connection setup is just the provider-specific websocket endpoint for the shared base lifecycle. */
    async _openConnection(session) {
        const message = Soup.Message.new('GET', krakenAdapter.websocketUrl);
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

        if (payload?.channel !== 'ticker' || !Array.isArray(payload.data))
            return null;

        const updatedQuotes = new Map();
        const liveSymbolMap = this._getSymbolToTickerSymbolMap();

        payload.data.forEach(entry => {
            const tickerSymbol = liveSymbolMap.get(entry?.symbol ?? '');
            const price = Number.parseFloat(`${entry?.last ?? ''}`);
            const quoteDate = normalizeTimestampDate(entry?.timestamp ?? '');
            const change = Number.parseFloat(`${entry?.change ?? ''}`);
            const changePct = Number.parseFloat(`${entry?.change_pct ?? ''}`);

            if (!tickerSymbol || !Number.isFinite(price) || !quoteDate)
                return;

            const previousClose = deriveKrakenPreviousClose(price, change, changePct);
            updatedQuotes.set(tickerSymbol, {
                price,
                quoteDate,
                previousClose,
            });
        });

        return {
            resetReconnect: updatedQuotes.size > 0,
            quotesBySymbol: updatedQuotes,
        };
    }
}

/* Kraken live support is limited to crypto tickers with a valid live symbol. */
function isKrakenTicker(ticker) {
    return ticker?.assetCategory === ASSET_CATEGORIES.CRYPTO &&
        typeof ticker.liveSymbol === 'string' &&
        ticker.liveSymbol !== '' &&
        (ticker.cryptoProvider ?? CRYPTO_PROVIDERS.KRAKEN) === CRYPTO_PROVIDERS.KRAKEN;
}

/* Kraken can derive previous close from either absolute change or percent change. */
function deriveKrakenPreviousClose(price, change, changePct) {
    if (Number.isFinite(change)) {
        const previousClose = price - change;
        if (Number.isFinite(previousClose) && previousClose > 0)
            return previousClose;
    }

    if (Number.isFinite(changePct) && changePct > -100) {
        const previousClose = price / (1 + (changePct / 100));
        if (Number.isFinite(previousClose) && previousClose > 0)
            return previousClose;
    }

    return null;
}

/* Kraken timestamps are normalized to the shared YYYYMMDD quote-date shape here. */
function normalizeTimestampDate(timestampText) {
    const normalized = timestampText.slice(0, 10).replaceAll('-', '');
    return /^\d{8}$/.test(normalized) ? normalized : '';
}
