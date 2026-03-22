import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Soup from 'gi://Soup?version=3.0';

import {
    createDisplayEntry,
    createErrorEntry,
    createLoadingEntries,
    DEFAULT_TEXT_COLOR,
    NEGATIVE_COLOR,
    POSITIVE_COLOR,
} from '../utils/format.js';

const REFRESH_INTERVAL_SECONDS = 300;
const US_SESSION_OVERNIGHT_REFRESH_INTERVAL_SECONDS = 1800;
const HISTORY_LOOKBACK_DAYS = 7;
const KRAKEN_WEBSOCKET_URL = 'wss://ws.kraken.com/v2';
const KRAKEN_TICKER_SYMBOLS = ['BTC/USD', 'ETH/USD'];
const KRAKEN_RECONNECT_DELAYS_SECONDS = [2, 5, 10, 20, 30, 60];
const CRYPTO_UI_UPDATE_INTERVAL_SECONDS = 4;
const PRICE_FLASH_DURATION_MS = 700;
const US_MARKET_TIME_ZONE = 'America/New_York';
const US_MARKET_PREMARKET_START_HOUR = 4;
const US_MARKET_AFTER_HOURS_END_HOUR = 20;
const KRAKEN_SYMBOL_TO_TICKER_SYMBOL = new Map([
    ['BTC/USD', 'BTC.V'],
    ['ETH/USD', 'ETH.V'],
]);

export const TICKERS = [
    {label: 'SPX', symbol: '^spx', priceDecimals: 0, marketType: 'us-session', panelSide: 'right'},
    {label: 'NDX', symbol: '^ndq', priceDecimals: 0, marketType: 'us-session', panelSide: 'right'},
    {label: 'DXY', symbol: 'dx.f', priceDecimals: 2, marketType: 'weekday-session', panelSide: 'left'},
    {label: 'EUR/USD', symbol: 'eurusd', priceDecimals: 4, marketType: 'weekday-session', panelSide: 'left'},
    {label: 'Gold', symbol: 'xauusd', priceDecimals: 0, marketType: 'weekday-session', panelSide: 'right'},
    {label: 'USO', symbol: 'uso.us', priceDecimals: 2, marketType: 'us-session', panelSide: 'right'},
    {label: 'ETH', symbol: 'eth.v', priceDecimals: 0, marketType: 'always-open', panelSide: 'right', separatorBefore: ' || '},
    {label: 'BTC', symbol: 'btc.v', priceDecimals: 0, marketType: 'always-open', panelSide: 'right'},
];

export const QuotesService = GObject.registerClass({
    Signals: {
        'entries-changed': {},
    },
}, class QuotesService extends GObject.Object {
    _init(uuid) {
        super._init();
        this._uuid = uuid;
        this._session = null;
        this._running = false;
        this._entries = createLoadingEntries(TICKERS);
        this._latestQuotesBySymbol = new Map();
        this._previousCloseCache = new Map();
        this._lastRefreshTimeBySymbol = new Map();
        this._refreshTimeoutId = 0;
        this._entriesUpdateTimeoutId = 0;
        this._entriesUpdateInProgress = false;
        this._entriesUpdateQueued = false;
        this._lastEntriesUpdateUsec = 0;
        this._priceFlashTimeoutId = 0;
        this._krakenWebsocket = null;
        this._krakenWebsocketSignalIds = [];
        this._krakenReconnectTimeoutId = 0;
        this._krakenReconnectAttempt = 0;
    }

    start() {
        if (this._running)
            return;

        this._running = true;
        this._session = new Soup.Session();
        this._entries = createLoadingEntries(TICKERS);
        this.emit('entries-changed');

        void this._refreshQuotes(true);
        void this._connectKrakenWebsocket();

        this._refreshTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            REFRESH_INTERVAL_SECONDS,
            () => {
                void this._refreshQuotes(false);
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    stop() {
        if (!this._running && !this._session)
            return;

        this._running = false;

        this._removeTimeout('_refreshTimeoutId');
        this._removeTimeout('_entriesUpdateTimeoutId');
        this._removeTimeout('_krakenReconnectTimeoutId');
        this._removeTimeout('_priceFlashTimeoutId');

        this._entriesUpdateInProgress = false;
        this._entriesUpdateQueued = false;
        this._lastEntriesUpdateUsec = 0;
        this._krakenReconnectAttempt = 0;

        this._disconnectKrakenWebsocket();
        this._session?.abort();
        this._session = null;

        this._latestQuotesBySymbol.clear();
        this._previousCloseCache.clear();
        this._lastRefreshTimeBySymbol.clear();
        this._entries = createLoadingEntries(TICKERS);
    }

    getEntries() {
        return this._entries;
    }

    async _refreshQuotes(forceRefreshAll = false) {
        if (!this._running)
            return;

        const tickersToRefresh = forceRefreshAll
            ? TICKERS
            : TICKERS.filter(ticker => this._shouldRefreshTicker(ticker));

        if (tickersToRefresh.length > 0) {
            try {
                const quoteCsv = await this._fetchText(this._buildBatchQuoteUrl(tickersToRefresh));
                if (!this._running)
                    return;

                const quotesBySymbol = this._parseBatchQuotes(quoteCsv, tickersToRefresh.length);
                quotesBySymbol.forEach((quote, symbol) => {
                    this._latestQuotesBySymbol.set(symbol, quote);
                });
                const refreshedAtUsec = GLib.get_monotonic_time();
                tickersToRefresh.forEach(ticker => {
                    this._lastRefreshTimeBySymbol.set(ticker.symbol.toUpperCase(), refreshedAtUsec);
                });
            } catch (error) {
                if (this._running)
                    logError(error, `${this._uuid}: failed to refresh batched quotes`);
            }
        }

        this._requestEntriesUpdate(true);
    }

    _requestEntriesUpdate(immediate = false) {
        if (!this._running)
            return;

        if (this._entriesUpdateInProgress) {
            this._entriesUpdateQueued = true;
            return;
        }

        if (immediate) {
            this._removeTimeout('_entriesUpdateTimeoutId');
            void this._rebuildEntries();
            return;
        }

        const elapsedSeconds = (GLib.get_monotonic_time() - this._lastEntriesUpdateUsec) / 1_000_000;
        if (this._lastEntriesUpdateUsec === 0 || elapsedSeconds >= CRYPTO_UI_UPDATE_INTERVAL_SECONDS) {
            void this._rebuildEntries();
            return;
        }

        if (this._entriesUpdateTimeoutId !== 0)
            return;

        const remainingMs = Math.max(
            1,
            Math.round((CRYPTO_UI_UPDATE_INTERVAL_SECONDS - elapsedSeconds) * 1000)
        );

        this._entriesUpdateTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            remainingMs,
            () => {
                this._entriesUpdateTimeoutId = 0;
                void this._rebuildEntries();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    async _rebuildEntries() {
        if (!this._running || this._entriesUpdateInProgress)
            return;

        this._entriesUpdateInProgress = true;

        try {
            const entries = await Promise.all(
                TICKERS.map(async ticker => {
                    try {
                        return await this._buildTickerEntry(ticker);
                    } catch (error) {
                        if (this._running)
                            logError(error, `${this._uuid}: failed to refresh ${ticker.label}`);

                        return createErrorEntry(ticker);
                    }
                })
            );

            if (this._running) {
                this._entries = this._decorateEntriesWithPriceFlash(entries);
                this._lastEntriesUpdateUsec = GLib.get_monotonic_time();
                this.emit('entries-changed');
                this._schedulePriceFlashReset();
            }
        } finally {
            this._entriesUpdateInProgress = false;

            if (!this._entriesUpdateQueued || !this._running)
                return;

            this._entriesUpdateQueued = false;
            this._requestEntriesUpdate(false);
        }
    }

    async _buildTickerEntry(ticker) {
        const quote = this._latestQuotesBySymbol.get(ticker.symbol.toUpperCase());

        if (!quote)
            throw new Error(`Missing batched quote for ${ticker.symbol}`);

        const previousClose = await this._getPreviousClose(ticker, quote.quoteDate);
        return createDisplayEntry(ticker, quote, previousClose);
    }

    async _getPreviousClose(ticker, quoteDate) {
        const cacheKey = ticker.symbol.toUpperCase();
        const cachedEntry = this._previousCloseCache.get(cacheKey);

        if (cachedEntry?.quoteDate === quoteDate)
            return cachedEntry.previousClose;

        try {
            const historyCsv = await this._fetchText(this._buildHistoryUrl(ticker.symbol));
            if (!this._running)
                throw new Error(`History request aborted for ${ticker.symbol}`);

            const previousClose = this._parsePreviousClose(historyCsv, quoteDate);
            this._previousCloseCache.set(cacheKey, {
                quoteDate,
                previousClose,
            });

            return previousClose;
        } catch (error) {
            if (this._running) {
                logError(
                    error,
                    `${this._uuid}: previous close unavailable for ${ticker.label}; showing price without change`
                );
            }

            return null;
        }
    }

    async _fetchText(url) {
        if (!this._session)
            throw new Error('Quotes session is not available');

        const message = Soup.Message.new('GET', url);
        const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        return new TextDecoder().decode(bytes.get_data()).trim();
    }

    async _connectKrakenWebsocket() {
        if (!this._running || !this._session || this._krakenWebsocket)
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

            this._krakenWebsocket = websocket;
            this._krakenWebsocketSignalIds = [
                websocket.connect('message', (_connection, type, messageBytes) => {
                    this._handleKrakenMessage(type, messageBytes);
                }),
                websocket.connect('error', (_connection, error) => {
                    logError(error, `${this._uuid}: Kraken websocket error`);
                }),
                websocket.connect('closed', () => {
                    this._handleKrakenDisconnect();
                }),
            ];

            websocket.send_text(JSON.stringify({
                method: 'subscribe',
                params: {
                    channel: 'ticker',
                    event_trigger: 'trades',
                    symbol: KRAKEN_TICKER_SYMBOLS,
                    snapshot: true,
                },
            }));
        } catch (error) {
            if (!this._running)
                return;

            logError(error, `${this._uuid}: failed to connect Kraken websocket`);
            this._scheduleKrakenReconnect();
        }
    }

    _disconnectKrakenWebsocket() {
        const websocket = this._krakenWebsocket;
        this._krakenWebsocket = null;

        if (!websocket)
            return;

        this._krakenWebsocketSignalIds.forEach(signalId => websocket.disconnect(signalId));
        this._krakenWebsocketSignalIds = [];

        const state = websocket.get_state();
        if (state !== Soup.WebsocketState.CLOSING && state !== Soup.WebsocketState.CLOSED)
            websocket.close(1000, null);
    }

    _handleKrakenDisconnect() {
        this._krakenWebsocket = null;
        this._krakenWebsocketSignalIds = [];

        if (!this._running)
            return;

        this._scheduleKrakenReconnect();
    }

    _scheduleKrakenReconnect() {
        if (!this._running || this._krakenReconnectTimeoutId !== 0)
            return;

        const index = Math.min(
            this._krakenReconnectAttempt,
            KRAKEN_RECONNECT_DELAYS_SECONDS.length - 1
        );
        const delaySeconds = KRAKEN_RECONNECT_DELAYS_SECONDS[index];
        this._krakenReconnectAttempt += 1;

        this._krakenReconnectTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            delaySeconds,
            () => {
                this._krakenReconnectTimeoutId = 0;
                void this._connectKrakenWebsocket();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    _handleKrakenMessage(type, messageBytes) {
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
            this._disconnectKrakenWebsocket();
            this._scheduleKrakenReconnect();
            return;
        }

        if (
            payload?.method === 'subscribe' &&
            payload?.success === true &&
            payload?.result?.channel === 'ticker'
        ) {
            this._krakenReconnectAttempt = 0;
            return;
        }

        if (payload?.channel !== 'ticker' || !Array.isArray(payload.data))
            return;

        let updated = false;

        payload.data.forEach(entry => {
            const tickerSymbol = KRAKEN_SYMBOL_TO_TICKER_SYMBOL.get(entry?.symbol ?? '');
            const price = Number.parseFloat(`${entry?.last ?? ''}`);
            const quoteDate = this._normalizeTimestampDate(entry?.timestamp ?? '');

            if (!tickerSymbol || !Number.isFinite(price) || !quoteDate)
                return;

            this._latestQuotesBySymbol.set(tickerSymbol, {price, quoteDate});
            updated = true;
        });

        if (updated) {
            this._krakenReconnectAttempt = 0;
            this._requestEntriesUpdate(false);
        }
    }

    _buildBatchQuoteUrl(tickers) {
        const joinedSymbols = tickers
            .map(ticker => ticker.symbol)
            .join('+');

        return `https://stooq.com/q/l/?s=${encodeURIComponent(joinedSymbols).replace(/%2B/g, '+')}&i=d`;
    }

    _buildHistoryUrl(symbol) {
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setUTCDate(startDate.getUTCDate() - HISTORY_LOOKBACK_DAYS);

        return `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&d1=${this._formatApiDate(startDate)}&d2=${this._formatApiDate(endDate)}&i=d`;
    }

    _formatApiDate(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    _parseBatchQuotes(csv, expectedCount) {
        const quotesBySymbol = new Map();
        const rows = csv
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');

        rows.forEach(row => {
            const fields = row.split(',');
            const symbol = fields[0]?.trim().toUpperCase();
            const quoteDate = this._normalizeQuoteDate(fields[1]?.trim() ?? '');
            const price = Number.parseFloat(fields[6]?.trim() ?? '');

            if (!symbol || !quoteDate || !Number.isFinite(price))
                throw new Error(`Unexpected batched quote row: ${row}`);

            quotesBySymbol.set(symbol, {price, quoteDate});
        });

        if (quotesBySymbol.size !== expectedCount)
            throw new Error(`Unexpected batched quote response: ${csv}`);

        return quotesBySymbol;
    }

    _parsePreviousClose(csv, quoteDate) {
        const rows = csv
            .split('\n')
            .slice(1)
            .filter(line => line.trim() !== '')
            .map(line => {
                const fields = line.split(',');
                return {
                    date: this._normalizeQuoteDate(fields[0]?.trim() ?? ''),
                    close: Number.parseFloat(fields[4]?.trim() ?? ''),
                };
            });

        if (rows.length < 2)
            throw new Error(`Not enough history rows: ${csv}`);

        const previousRow = rows.findLast(row => row.date && row.date < quoteDate);
        const previousClose = previousRow?.close;

        if (!Number.isFinite(previousClose))
            throw new Error(`Unexpected history response: ${csv}`);

        return previousClose;
    }

    _normalizeQuoteDate(dateText) {
        const normalized = dateText.replaceAll('-', '');
        return /^\d{8}$/.test(normalized) ? normalized : '';
    }

    _normalizeTimestampDate(timestampText) {
        return this._normalizeQuoteDate(timestampText.slice(0, 10));
    }

    _shouldRefreshTicker(ticker) {
        if (ticker.marketType === 'always-open')
            return true;

        if (ticker.marketType === 'weekday-session')
            return !this._isUsMarketWeekend();

        if (ticker.marketType === 'us-session') {
            if (this._isUsMarketWeekend())
                return false;

            return this._hasTickerReachedRefreshCadence(
                ticker,
                this._getRefreshIntervalSecondsForTicker(ticker)
            );
        }

        return true;
    }

    _hasTickerReachedRefreshCadence(ticker, refreshIntervalSeconds) {
        const lastRefreshUsec = this._lastRefreshTimeBySymbol.get(ticker.symbol.toUpperCase());
        if (!lastRefreshUsec)
            return true;

        const elapsedSeconds = (GLib.get_monotonic_time() - lastRefreshUsec) / 1_000_000;
        return elapsedSeconds >= refreshIntervalSeconds;
    }

    _getRefreshIntervalSecondsForTicker(ticker) {
        if (ticker.marketType !== 'us-session')
            return REFRESH_INTERVAL_SECONDS;

        return this._isUsMarketExtendedHoursActive()
            ? REFRESH_INTERVAL_SECONDS
            : US_SESSION_OVERNIGHT_REFRESH_INTERVAL_SECONDS;
    }

    _isUsMarketWeekend() {
        const weekday = new Intl.DateTimeFormat('en-US', {
            timeZone: US_MARKET_TIME_ZONE,
            weekday: 'short',
        }).format(new Date());

        return weekday === 'Sat' || weekday === 'Sun';
    }

    _isUsMarketExtendedHoursActive() {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: US_MARKET_TIME_ZONE,
            hour: 'numeric',
            hourCycle: 'h23',
            minute: 'numeric',
        }).formatToParts(new Date());

        const hour = Number.parseInt(
            parts.find(part => part.type === 'hour')?.value ?? '',
            10
        );
        const minute = Number.parseInt(
            parts.find(part => part.type === 'minute')?.value ?? '',
            10
        );

        if (!Number.isInteger(hour) || !Number.isInteger(minute))
            return true;

        const minutesSinceMidnight = (hour * 60) + minute;
        return minutesSinceMidnight >= US_MARKET_PREMARKET_START_HOUR * 60 &&
            minutesSinceMidnight < US_MARKET_AFTER_HOURS_END_HOUR * 60;
    }

    _decorateEntriesWithPriceFlash(entries) {
        const previousEntriesByLabel = new Map(
            this._entries.map(entry => [entry.label, entry])
        );

        return entries.map(entry => {
            const previousEntry = previousEntriesByLabel.get(entry.label);
            const previousPrice = previousEntry?.displayPrice;

            if (
                !previousEntry ||
                !Number.isFinite(previousPrice) ||
                !Number.isFinite(entry.displayPrice) ||
                previousEntry.priceText === entry.priceText
            ) {
                return entry;
            }

            return {
                ...entry,
                priceColor: entry.displayPrice > previousPrice ? POSITIVE_COLOR : NEGATIVE_COLOR,
            };
        });
    }

    _schedulePriceFlashReset() {
        this._removeTimeout('_priceFlashTimeoutId');

        if (!this._entries.some(entry => entry.priceColor !== DEFAULT_TEXT_COLOR))
            return;

        this._priceFlashTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            PRICE_FLASH_DURATION_MS,
            () => {
                this._priceFlashTimeoutId = 0;

                if (!this._running)
                    return GLib.SOURCE_REMOVE;

                this._entries = this._entries.map(entry => ({
                    ...entry,
                    priceColor: DEFAULT_TEXT_COLOR,
                }));
                this.emit('entries-changed');
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    _removeTimeout(propertyName) {
        if (this[propertyName] === 0)
            return;

        GLib.Source.remove(this[propertyName]);
        this[propertyName] = 0;
    }
});
