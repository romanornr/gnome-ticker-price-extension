import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {
    createTickerSymbolMap,
    getDesiredLiveSymbols,
    removeTimeout,
} from './live-quote-provider.js';

const LIVE_CRYPTO_RECONNECT_DELAYS_SECONDS = [2, 5, 10, 20, 30, 60];

/* Concrete live providers share one websocket-connect helper because only the URL differs. */
export function openWebsocketConnection(session, websocketUrl) {
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
 * LiveWebsocketProvider is the shared lifecycle shell for concrete live quote
 * providers such as Kraken and Hyperliquid.
 *
 * It standardizes the parts that should behave the same across providers:
 * - connect/disconnect mechanics
 * - reconnect backoff
 * - subscription reconciliation when saved tickers change
 * - socket signal cleanup
 * - stale quote notification when live transport drops
 *
 * Subclasses supply only the provider-specific pieces:
 * endpoint connection, subscribe payloads, and payload-to-quote parsing.
 * That keeps each provider focused on market semantics instead of websocket
 * housekeeping.
 */
export class LiveWebsocketProvider {
    /* Each subclass inherits one shared websocket state machine and only supplies provider-specific hooks. */
    constructor({uuid, onQuotes, onStale, filterTicker}) {
        this._uuid = uuid;
        this._onQuotes = onQuotes;
        this._onStale = onStale;
        this._filterTicker = filterTicker;
        this._session = null;
        this._running = false;
        this._tickers = [];
        this._websocket = null;
        this._websocketSignalIds = [];
        this._reconnectTimeoutId = 0;
        this._reconnectAttempt = 0;
        this._subscribedSymbols = [];
    }

    /* start() attaches the shared Soup session and begins connection attempts for the current saved symbols. */
    start(session) {
        this._session = session;
        this._running = true;
        void this._connectIfNeeded();
    }

    /* stop() clears both the live socket and the reconnect/subscription bookkeeping around it. */
    stop() {
        this._running = false;
        this._session = null;
        this._tickers = [];
        this._subscribedSymbols = [];
        this._reconnectAttempt = 0;
        this._reconnectTimeoutId = removeTimeout(this._reconnectTimeoutId);
        this._disconnectWebsocket();
    }

    /* Subscription reconciliation lets the provider react to saved ticker changes without restarting the service. */
    updateSubscriptions(tickers) {
        this._tickers = tickers.filter(ticker => this._filterTicker(ticker));

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

    /* QuotesService uses this as the single readiness signal for "is live transport available right now?" */
    isConnected() {
        return this._websocket !== null;
    }

    /* Subclasses inherit how desired live symbols are derived from the current saved ticker set. */
    _getDesiredSymbols() {
        return getDesiredLiveSymbols(this._tickers);
    }

    /* Provider payloads are translated back to saved ticker symbols through this shared mapping step. */
    _getSymbolToTickerSymbolMap() {
        return createTickerSymbolMap(this._tickers);
    }

    /*
     * Every live provider follows the same connection flow. If the socket opens,
     * the subclass-specific subscription payload is sent immediately. If not, the
     * shared reconnect policy applies.
     */
    /*
     * _connectIfNeeded() is the shared socket bootstrap path used on startup,
     * reconnect, and subscription changes. Subclasses only fill in the
     * provider-specific connection and subscribe steps.
     */
    async _connectIfNeeded() {
        const liveSymbols = this._getDesiredSymbols();
        if (!this._running || !this._session || this._websocket || liveSymbols.length === 0)
            return;

        try {
            const websocket = await this._openConnection(this._session);

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
                    logError(error, `${this._uuid}: ${this.logPrefix} websocket error`);
                }),
                websocket.connect('closed', () => {
                    this._handleDisconnect();
                }),
            ];

            this._subscribedSymbols = liveSymbols;
            this._subscribe(websocket, liveSymbols);
        } catch (error) {
            if (!this._running)
                return;

            logError(error, `${this._uuid}: failed to connect ${this.logPrefix} websocket`);
            this._notifyStaleTickers();
            this._scheduleReconnect();
        }
    }

    /* All socket cleanup funnels through one helper so stop(), reconnect, and resubscribe behave the same way. */
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

    /* The base class handles decode/error/reconnect flow; subclasses only decide what a payload means. */
    _handleSocketMessage(type, messageBytes) {
        if (type !== Soup.WebsocketDataType.TEXT)
            return;

        let payload;

        try {
            payload = JSON.parse(new TextDecoder().decode(messageBytes.get_data()));
        } catch (error) {
            logError(error, `${this._uuid}: failed to parse ${this.logPrefix} websocket payload`);
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

    /* Hook: open the provider-specific websocket endpoint. */
    async _openConnection(_session) {
        throw new Error('Subclasses must implement _openConnection()');
    }

    /* Hook: send the provider-specific subscription messages. */
    _subscribe(_websocket, _symbols) {
        throw new Error('Subclasses must implement _subscribe()');
    }

    /* Hook: convert one decoded provider payload into reconnect and quote actions. */
    _handlePayload(_payload) {
        throw new Error('Subclasses must implement _handlePayload()');
    }

    /* Hook: subclasses override the provider name used in shared logs. */
    get logPrefix() {
        return 'provider';
    }
}
