import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {ASSET_CATEGORIES, CRYPTO_PROVIDERS} from '../../utils/asset-categories.js';
import {KRAKEN_WEBSOCKET_URL} from '../../utils/kraken.js';

const LIVE_CRYPTO_RECONNECT_DELAYS_SECONDS = [2, 5, 10, 20, 30, 60];

export class KrakenLiveProvider {
    constructor({uuid, onQuotes}) {
        this._uuid = uuid;
        this._onQuotes = onQuotes;
        this._session = null;
        this._running = false;
        this._tickers = [];
        this._websocket = null;
        this._websocketSignalIds = [];
        this._reconnectTimeoutId = 0;
        this._reconnectAttempt = 0;
        this._subscribedSymbols = [];
    }

    start(session) {
        this._session = session;
        this._running = true;
        void this._connectIfNeeded();
    }

    stop() {
        this._running = false;
        this._session = null;
        this._tickers = [];
        this._subscribedSymbols = [];
        this._reconnectAttempt = 0;
        this._removeReconnectTimeout();
        this._disconnectWebsocket();
    }

    updateSubscriptions(tickers) {
        this._tickers = tickers.filter(ticker => isKrakenTicker(ticker));

        const desiredSymbols = this._getDesiredSymbols();
        const currentSymbols = [...this._subscribedSymbols].sort().join('|');
        const nextSymbols = [...desiredSymbols].sort().join('|');

        if (currentSymbols === nextSymbols && (desiredSymbols.length === 0 || this._websocket))
            return;

        this._removeReconnectTimeout();
        this._reconnectAttempt = 0;
        this._disconnectWebsocket();

        if (desiredSymbols.length === 0 || !this._running)
            return;

        void this._connectIfNeeded();
    }

    isConnected() {
        return this._websocket !== null;
    }

    async _connectIfNeeded() {
        const liveSymbols = this._getDesiredSymbols();
        if (!this._running || !this._session || this._websocket || liveSymbols.length === 0)
            return;

        try {
            const message = Soup.Message.new('GET', KRAKEN_WEBSOCKET_URL);
            const session = this._session;
            const websocket = await new Promise((resolve, reject) => {
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

            if (!this._running) {
                websocket.close(1000, null);
                return;
            }

            this._websocket = websocket;
            this._websocketSignalIds = [
                websocket.connect('message', (_connection, type, messageBytes) => {
                    this._handleMessage(type, messageBytes);
                }),
                websocket.connect('error', (_connection, error) => {
                    logError(error, `${this._uuid}: Kraken websocket error`);
                }),
                websocket.connect('closed', () => {
                    this._handleDisconnect();
                }),
            ];

            this._subscribedSymbols = liveSymbols;
            websocket.send_text(JSON.stringify({
                method: 'subscribe',
                params: {
                    channel: 'ticker',
                    event_trigger: 'trades',
                    symbol: liveSymbols,
                    snapshot: true,
                },
            }));
        } catch (error) {
            if (!this._running)
                return;

            logError(error, `${this._uuid}: failed to connect Kraken websocket`);
            this._scheduleReconnect();
        }
    }

    _disconnectWebsocket() {
        const websocket = this._websocket;
        this._websocket = null;

        if (!websocket)
            return;

        this._websocketSignalIds.forEach(signalId => websocket.disconnect(signalId));
        this._websocketSignalIds = [];

        const state = websocket.get_state();
        if (state !== Soup.WebsocketState.CLOSING && state !== Soup.WebsocketState.CLOSED)
            websocket.close(1000, null);
    }

    _handleDisconnect() {
        this._websocket = null;
        this._websocketSignalIds = [];
        this._subscribedSymbols = [];

        if (!this._running || this._getDesiredSymbols().length === 0)
            return;

        this._scheduleReconnect();
    }

    _scheduleReconnect() {
        if (!this._running || this._reconnectTimeoutId !== 0 || this._getDesiredSymbols().length === 0)
            return;

        const index = Math.min(this._reconnectAttempt, LIVE_CRYPTO_RECONNECT_DELAYS_SECONDS.length - 1);
        const delaySeconds = LIVE_CRYPTO_RECONNECT_DELAYS_SECONDS[index];
        this._reconnectAttempt += 1;

        this._reconnectTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            delaySeconds,
            () => {
                this._reconnectTimeoutId = 0;
                void this._connectIfNeeded();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    _handleMessage(type, messageBytes) {
        if (type !== Soup.WebsocketDataType.TEXT)
            return;

        let payload;

        try {
            payload = JSON.parse(new TextDecoder().decode(messageBytes.get_data()));
        } catch (error) {
            logError(error, `${this._uuid}: failed to parse Kraken websocket payload`);
            return;
        }

        if (payload?.success === false) {
            logError(
                new Error(payload.error ?? 'Kraken websocket subscription failed'),
                `${this._uuid}: Kraken websocket rejected request`
            );
            this._disconnectWebsocket();
            this._scheduleReconnect();
            return;
        }

        if (
            payload?.method === 'subscribe' &&
            payload?.success === true &&
            payload?.result?.channel === 'ticker'
        ) {
            this._reconnectAttempt = 0;
            return;
        }

        if (payload?.channel !== 'ticker' || !Array.isArray(payload.data))
            return;

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

        if (updatedQuotes.size > 0) {
            this._reconnectAttempt = 0;
            this._onQuotes?.(updatedQuotes);
        }
    }

    _getDesiredSymbols() {
        return [...new Set(this._tickers.map(ticker => ticker.liveSymbol).filter(Boolean))];
    }

    _getSymbolToTickerSymbolMap() {
        return new Map(this._tickers.map(ticker => [ticker.liveSymbol, ticker.symbol.toUpperCase()]));
    }

    _removeReconnectTimeout() {
        if (this._reconnectTimeoutId === 0)
            return;

        GLib.Source.remove(this._reconnectTimeoutId);
        this._reconnectTimeoutId = 0;
    }
}

function isKrakenTicker(ticker) {
    return ticker?.assetCategory === ASSET_CATEGORIES.CRYPTO &&
        typeof ticker.liveSymbol === 'string' &&
        ticker.liveSymbol !== '' &&
        (ticker.cryptoProvider ?? CRYPTO_PROVIDERS.KRAKEN) === CRYPTO_PROVIDERS.KRAKEN;
}

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

function normalizeTimestampDate(timestampText) {
    const normalized = timestampText.slice(0, 10).replaceAll('-', '');
    return /^\d{8}$/.test(normalized) ? normalized : '';
}
