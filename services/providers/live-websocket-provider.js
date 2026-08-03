import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {isLiveCryptoTicker} from '../../utils/asset-categories.js';

const LIVE_CRYPTO_RECONNECT_DELAYS_SECONDS = [2, 5, 10, 20, 30, 60];
const LIVE_SILENCE_TIMEOUT_SECONDS = 60;
const LIVE_WATCHDOG_INTERVAL_SECONDS = 15;

/* Soup's callback-style websocket handshake becomes the promise used by the shared lifecycle. */
function openWebsocketConnection(session, websocketUrl) {
    const message = Soup.Message.new('GET', websocketUrl);
    return new Promise((resolve, reject) => {
        session.websocket_connect_async(message, null, [], GLib.PRIORITY_DEFAULT, null, (_session, result) => {
                try {
                    resolve(session.websocket_connect_finish(result));
                } catch (error) {
                    reject(error);
                }
            });
    });
}

/*
 * Live providers share this websocket lifecycle while retaining their own REST
 * polling, subscription payload, and quote parsing. Instances also implement
 * the routing and polling gates consumed directly by QuotesService.
 */
export class LiveWebsocketProvider {
    constructor({id, name, websocketUrl, uuid, onQuotes, onStale}) {
        this.id = id;
        this._name = name;
        this._websocketUrl = websocketUrl;
        this._uuid = uuid;
        this._onQuotes = onQuotes;
        this._onStale = onStale;
        this._session = null;
        this._running = false;
        this._tickers = [];
        this._websocket = null;
        this._websocketSignalIds = [];
        this._reconnectTimeoutId = 0;
        this._reconnectAttempt = 0;
        this._subscribedSymbols = [];
        this._watchdogTimeoutId = 0;
        this._lastMessageUsec = 0;
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
        this._reconnectTimeoutId = removeTimeout(this._reconnectTimeoutId);
        this._disconnectWebsocket();
    }

    updateSubscriptions(tickers) {
        this._tickers = tickers.filter(ticker => this.ownsTicker(ticker));

        const desiredSymbols = this._getDesiredSymbols();
        const currentSymbols = [...this._subscribedSymbols].sort().join('|');
        const nextSymbols = [...desiredSymbols].sort().join('|');

        if (currentSymbols === nextSymbols && (desiredSymbols.length === 0 || this._websocket))
            return;

        this._reconnectTimeoutId = removeTimeout(this._reconnectTimeoutId);
        this._reconnectAttempt = 0;
        this._disconnectWebsocket();

        if (desiredSymbols.length === 0 || !this._running)
            return;

        void this._connectIfNeeded();
    }

    isConnected() {
        return this._websocket !== null;
    }

    /* Provider identity and live-symbol validity together define both subscription and polling ownership. */
    ownsTicker(ticker) {
        return isLiveCryptoTicker(ticker, this.id);
    }

    /* REST polling is the normal-cadence fallback while the provider's websocket is unavailable. */
    shouldPoll() {
        return !this.isConnected();
    }

    _getDesiredSymbols() {
        return [...new Set(this._tickers.map(ticker => ticker.liveSymbol))];
    }

    _getSymbolToTickerSymbolMap() {
        return new Map(this._tickers.map(ticker => [ticker.liveSymbol, ticker.symbol.toUpperCase()]));
    }

    /*
     * _connectIfNeeded() is the shared socket bootstrap path used on startup,
     * reconnect, and subscription changes.
     */
    async _connectIfNeeded() {
        const liveSymbols = this._getDesiredSymbols();
        if (!this._running || !this._session || this._websocket || liveSymbols.length === 0)
            return;

        try {
            const websocket = await openWebsocketConnection(this._session, this._websocketUrl);

            if (!this._running) {
                websocket.close(1000, null);
                return;
            }

            this._websocket = websocket;
            this._websocketSignalIds = [
                websocket.connect('message', (_connection, type, messageBytes) => {
                    this._handleSocketMessage(type, messageBytes);
                }),
                websocket.connect('error', (_connection, error) => {
                    logError(error, `${this._uuid}: ${this._name} websocket error`);
                }),
                websocket.connect('closed', () => {
                    this._handleDisconnect();
                }),
            ];

            this._subscribedSymbols = liveSymbols;
            this._subscribe(websocket, liveSymbols);
            this._markLiveTraffic();
            this._startWatchdog();
        } catch (error) {
            if (!this._running)
                return;

            logError(error, `${this._uuid}: failed to connect ${this._name} websocket`);
            this._notifyStaleTickers();
            this._scheduleReconnect();
        }
    }

    /* All socket cleanup funnels through one helper so stop(), reconnect, and resubscribe behave the same way. */
    _disconnectWebsocket() {
        this._watchdogTimeoutId = removeTimeout(this._watchdogTimeoutId);

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

    /* Closed sockets only trigger reconnect when there are still saved live symbols to care about. */
    _handleDisconnect() {
        this._websocket = null;
        this._websocketSignalIds = [];
        this._subscribedSymbols = [];

        if (!this._running || this._getDesiredSymbols().length === 0)
            return;

        this._notifyStaleTickers();
        this._scheduleReconnect();
    }

    /* Transport failures tell QuotesService that cached live quotes should render as stale. */
    _notifyStaleTickers() {
        if (this._tickers.length > 0)
            this._onStale?.(this._tickers);
    }

    /* All live providers share the same conservative reconnect policy so runtime behavior stays predictable. */
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

    /*
     * Half-open sockets can survive network changes without a close event.
     * Prolonged silence therefore follows the normal disconnect recovery path.
     */
    _startWatchdog() {
        this._watchdogTimeoutId = removeTimeout(this._watchdogTimeoutId);
        this._watchdogTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            LIVE_WATCHDOG_INTERVAL_SECONDS,
            () => {
                if (!this._running || !this._websocket) {
                    this._watchdogTimeoutId = 0;
                    return GLib.SOURCE_REMOVE;
                }

                if (!this._hasLiveTrafficTimedOut())
                    return GLib.SOURCE_CONTINUE;

                this._watchdogTimeoutId = 0;
                this._handleSilentConnection();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    /* Any inbound frame counts as proof of a live transport, including provider heartbeats. */
    _markLiveTraffic() {
        this._lastMessageUsec = GLib.get_monotonic_time();
    }

    _hasLiveTrafficTimedOut(nowUsec = GLib.get_monotonic_time()) {
        return (nowUsec - this._lastMessageUsec) / 1_000_000 >= LIVE_SILENCE_TIMEOUT_SECONDS;
    }

    /* Silent sockets follow the same recovery path as closed sockets: drop, mark stale, reconnect. */
    _handleSilentConnection() {
        log(`${this._uuid}: ${this._name} websocket silent for ${LIVE_SILENCE_TIMEOUT_SECONDS}s; reconnecting`);
        this._disconnectWebsocket();
        this._handleDisconnect();
    }

    /* The base class handles decode/error/reconnect flow; subclasses only decide what a payload means. */
    _handleSocketMessage(type, messageBytes) {
        this._markLiveTraffic();

        if (type !== Soup.WebsocketDataType.TEXT)
            return;

        let payload;

        try {
            payload = JSON.parse(new TextDecoder().decode(messageBytes.get_data()));
        } catch (error) {
            logError(error, `${this._uuid}: failed to parse ${this._name} websocket payload`);
            return;
        }

        const result = this._handlePayload(payload);

        if (result?.reconnect) {
            this._disconnectWebsocket();
            this._scheduleReconnect();
            return;
        }

        if (result?.resetReconnect)
            this._reconnectAttempt = 0;

        if (result?.quotesBySymbol?.size > 0)
            this._onQuotes?.(result.quotesBySymbol);
    }

    /* Hook: send the provider-specific subscription messages. */
    _subscribe(_websocket, _symbols) {
        throw new Error('Subclasses must implement _subscribe()');
    }

    /* Hook: convert one decoded provider payload into reconnect and quote actions. */
    _handlePayload(_payload) {
        throw new Error('Subclasses must implement _handlePayload()');
    }
}

function removeTimeout(sourceId) {
    if (sourceId === 0) return 0;

    GLib.Source.remove(sourceId);
    return 0;
}
