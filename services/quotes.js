import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Soup from 'gi://Soup?version=3.0';

import {
    createDisplayEntry,
    createErrorEntry,
    createLoadingEntry,
    createLoadingEntries,
    DEFAULT_TEXT_COLOR,
    NEGATIVE_COLOR,
    POSITIVE_COLOR,
} from '../utils/format.js';
import {
    ASSET_CATEGORIES,
    DEFAULT_REFRESH_INTERVAL_SECONDS,
    loadDisplaySettings,
    loadRefreshIntervalSeconds,
    loadTickerConfigs,
    MARKET_TYPES,
    SETTINGS_KEYS,
} from '../utils/settings.js';
import {KRAKEN_WEBSOCKET_URL} from '../utils/kraken.js';

const US_SESSION_OVERNIGHT_REFRESH_INTERVAL_SECONDS = 1800;
const KRAKEN_RECONNECT_DELAYS_SECONDS = [2, 5, 10, 20, 30, 60];
const CRYPTO_UI_UPDATE_INTERVAL_SECONDS = 4;
const PRICE_FLASH_DURATION_MS = 700;
const US_MARKET_TIME_ZONE = 'America/New_York';
const US_MARKET_PREMARKET_START_HOUR = 4;
const US_MARKET_AFTER_HOURS_END_HOUR = 20;

export const QuotesService = GObject.registerClass({
    Signals: {
        'entries-changed': {},
    },
}, class QuotesService extends GObject.Object {
    _init(uuid, settings) {
        super._init();
        this._uuid = uuid;
        this._settings = settings;
        this._settingsSignalIds = [];
        this._session = null;
        this._running = false;
        this._tickers = loadTickerConfigs(this._settings);
        this._displaySettings = loadDisplaySettings(this._settings);
        this._refreshIntervalSeconds = loadRefreshIntervalSeconds(this._settings);
        this._entries = createLoadingEntries(this._tickers, this._displaySettings);
        this._latestQuotesBySymbol = new Map();
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
        this._krakenSubscribedSymbols = [];
    }

    start() {
        if (this._running)
            return;

        this._running = true;
        this._session = new Soup.Session();
        this._loadConfiguration();
        this._connectSettingsSignals();
        this._entries = createLoadingEntries(this._tickers, this._displaySettings);
        this.emit('entries-changed');

        void this._refreshQuotes(true);
        void this._connectKrakenWebsocket();
        this._scheduleRefreshTimer();
    }

    stop() {
        if (!this._running && !this._session)
            return;

        this._running = false;

        this._disconnectSettingsSignals();
        this._removeTimeout('_refreshTimeoutId');
        this._removeTimeout('_entriesUpdateTimeoutId');
        this._removeTimeout('_krakenReconnectTimeoutId');
        this._removeTimeout('_priceFlashTimeoutId');

        this._entriesUpdateInProgress = false;
        this._entriesUpdateQueued = false;
        this._lastEntriesUpdateUsec = 0;
        this._krakenReconnectAttempt = 0;
        this._krakenSubscribedSymbols = [];

        this._disconnectKrakenWebsocket();
        this._session?.abort();
        this._session = null;

        this._latestQuotesBySymbol.clear();
        this._lastRefreshTimeBySymbol.clear();
        this._entries = createLoadingEntries(this._tickers, this._displaySettings);
    }

    getEntries() {
        return this._entries;
    }

    async _refreshQuotes(forceRefreshAll = false) {
        if (!this._running)
            return;

        const tickersToRefresh = forceRefreshAll
            ? this._tickers
            : this._tickers.filter(ticker => this._shouldRefreshTicker(ticker));

        const stooqTickers = tickersToRefresh.filter(ticker => !this._isKrakenTicker(ticker));

        if (stooqTickers.length > 0)
            await this._refreshStooqQuotes(stooqTickers);

        if (stooqTickers.length > 0)
            this._requestEntriesUpdate(true);
    }

    _connectSettingsSignals() {
        this._disconnectSettingsSignals();

        this._settingsSignalIds = [
            this._settings.connect(`changed::${SETTINGS_KEYS.TICKERS_JSON}`, () => {
                this._loadConfiguration();
                this._pruneCachedQuotes();
                this._entries = createLoadingEntries(this._tickers, this._displaySettings);
                this.emit('entries-changed');
                this._scheduleRefreshTimer();
                this._reconnectKrakenWebsocketIfNeeded();
                void this._refreshQuotes(true);
            }),
            this._settings.connect(`changed::${SETTINGS_KEYS.REFRESH_INTERVAL_SECONDS}`, () => {
                this._refreshIntervalSeconds = loadRefreshIntervalSeconds(this._settings);
                this._scheduleRefreshTimer();
            }),
            this._settings.connect(`changed::${SETTINGS_KEYS.FORMAT_PRESET}`, () => this._handleDisplaySettingsChanged()),
            this._settings.connect(`changed::${SETTINGS_KEYS.SHOW_PRICE}`, () => this._handleDisplaySettingsChanged()),
            this._settings.connect(`changed::${SETTINGS_KEYS.SHOW_ARROW}`, () => this._handleDisplaySettingsChanged()),
            this._settings.connect(`changed::${SETTINGS_KEYS.SHOW_PERCENT}`, () => this._handleDisplaySettingsChanged()),
            this._settings.connect(`changed::${SETTINGS_KEYS.SEPARATOR_STYLE}`, () => this._handleDisplaySettingsChanged()),
        ];
    }

    _disconnectSettingsSignals() {
        this._settingsSignalIds.forEach(signalId => this._settings?.disconnect(signalId));
        this._settingsSignalIds = [];
    }

    _handleDisplaySettingsChanged() {
        this._displaySettings = loadDisplaySettings(this._settings);
        this._requestEntriesUpdate(true);
    }

    _loadConfiguration() {
        this._tickers = loadTickerConfigs(this._settings);
        this._displaySettings = loadDisplaySettings(this._settings);
        this._refreshIntervalSeconds = loadRefreshIntervalSeconds(this._settings);
    }

    _pruneCachedQuotes() {
        const activeSymbols = new Set(this._tickers.map(ticker => ticker.symbol.toUpperCase()));

        [...this._latestQuotesBySymbol.keys()].forEach(symbol => {
            if (!activeSymbols.has(symbol))
                this._latestQuotesBySymbol.delete(symbol);
        });

        [...this._lastRefreshTimeBySymbol.keys()].forEach(symbol => {
            if (!activeSymbols.has(symbol))
                this._lastRefreshTimeBySymbol.delete(symbol);
        });
    }

    _scheduleRefreshTimer() {
        this._removeTimeout('_refreshTimeoutId');

        if (!this._running)
            return;

        this._refreshTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            this._refreshIntervalSeconds,
            () => {
                void this._refreshQuotes(false);
                return GLib.SOURCE_CONTINUE;
            }
        );
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
                this._tickers.map(async (ticker, index) => {
                    try {
                        return await this._buildTickerEntry(ticker, index);
                    } catch (error) {
                        if (this._running)
                            logError(error, `${this._uuid}: failed to refresh ${ticker.label}`);

                        return createErrorEntry(ticker, index, this._displaySettings);
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

    async _buildTickerEntry(ticker, index) {
        const quote = this._latestQuotesBySymbol.get(ticker.symbol.toUpperCase());

        if (!quote && this._isKrakenTicker(ticker))
            return createLoadingEntry(ticker, index, this._displaySettings);

        if (!quote)
            throw new Error(`Missing quote for ${ticker.symbol}`);

        return createDisplayEntry(ticker, quote, quote.previousClose, index, this._displaySettings);
    }

    async _fetchText(url) {
        if (!this._session)
            throw new Error('Quotes session is not available');

        const message = Soup.Message.new('GET', url);
        const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        return new TextDecoder().decode(bytes.get_data()).trim();
    }

    async _refreshStooqQuotes(tickers) {
        try {
            const quoteCsv = await this._fetchText(this._buildBatchQuoteUrl(tickers));
            if (!this._running)
                return;

            const quotesBySymbol = this._parseBatchQuotes(quoteCsv, tickers.length);
            quotesBySymbol.forEach((quote, symbol) => {
                this._latestQuotesBySymbol.set(symbol, quote);
            });
            this._markTickersRefreshed(tickers);
        } catch (error) {
            if (this._running)
                logError(error, `${this._uuid}: failed to refresh Stooq quotes`);
        }
    }

    async _connectKrakenWebsocket() {
        const liveSymbols = this._getDesiredKrakenSymbols();
        if (!this._running || !this._session || this._krakenWebsocket || liveSymbols.length === 0)
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

            this._krakenSubscribedSymbols = liveSymbols;
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
        this._krakenSubscribedSymbols = [];

        if (!this._running || this._getDesiredKrakenSymbols().length === 0)
            return;

        this._scheduleKrakenReconnect();
    }

    _scheduleKrakenReconnect() {
        if (!this._running || this._krakenReconnectTimeoutId !== 0 || this._getDesiredKrakenSymbols().length === 0)
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
        const liveSymbolMap = this._getKrakenSymbolToTickerSymbolMap();

        payload.data.forEach(entry => {
            const tickerSymbol = liveSymbolMap.get(entry?.symbol ?? '');
            const price = Number.parseFloat(`${entry?.last ?? ''}`);
            const quoteDate = this._normalizeTimestampDate(entry?.timestamp ?? '');
            const change = Number.parseFloat(`${entry?.change ?? ''}`);
            const changePct = Number.parseFloat(`${entry?.change_pct ?? ''}`);

            if (!tickerSymbol || !Number.isFinite(price) || !quoteDate)
                return;

            const existingQuote = this._latestQuotesBySymbol.get(tickerSymbol);
            this._latestQuotesBySymbol.set(tickerSymbol, {
                price,
                quoteDate,
                previousClose: this._deriveKrakenPreviousClose(
                    price,
                    change,
                    changePct,
                    existingQuote?.previousClose
                ),
            });
            updated = true;
        });

        if (updated) {
            this._krakenReconnectAttempt = 0;
            this._requestEntriesUpdate(false);
        }
    }

    _reconnectKrakenWebsocketIfNeeded() {
        const desiredSymbols = this._getDesiredKrakenSymbols();
        const currentSymbols = [...this._krakenSubscribedSymbols].sort().join('|');
        const nextSymbols = [...desiredSymbols].sort().join('|');

        if (currentSymbols === nextSymbols && (desiredSymbols.length === 0 || this._krakenWebsocket))
            return;

        this._removeTimeout('_krakenReconnectTimeoutId');
        this._krakenReconnectAttempt = 0;
        this._disconnectKrakenWebsocket();

        if (desiredSymbols.length === 0)
            return;

        void this._connectKrakenWebsocket();
    }

    _getDesiredKrakenSymbols() {
        return [...new Set(
            this._tickers
                .filter(ticker => this._isKrakenTicker(ticker))
                .map(ticker => ticker.liveSymbol)
        )];
    }

    _getKrakenSymbolToTickerSymbolMap() {
        return new Map(
            this._tickers
                .filter(ticker => this._isKrakenTicker(ticker))
                .map(ticker => [ticker.liveSymbol, ticker.symbol.toUpperCase()])
        );
    }

    _isKrakenTicker(ticker) {
        return ticker?.assetCategory === ASSET_CATEGORIES.CRYPTO &&
            typeof ticker.liveSymbol === 'string' &&
            ticker.liveSymbol !== '';
    }

    _buildBatchQuoteUrl(tickers) {
        const joinedSymbols = tickers
            .map(ticker => ticker.symbol)
            .join('+');

        return `https://stooq.com/q/l/?s=${encodeURIComponent(joinedSymbols).replace(/%2B/g, '+')}&f=sd2t2cp&i=d`;
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
            const price = Number.parseFloat(fields[3]?.trim() ?? '');
            const previousClose = Number.parseFloat(fields[4]?.trim() ?? '');

            if (!symbol || !quoteDate || !Number.isFinite(price))
                throw new Error(`Unexpected batched quote row: ${row}`);

            quotesBySymbol.set(symbol, {
                price,
                quoteDate,
                previousClose: Number.isFinite(previousClose) ? previousClose : null,
            });
        });

        if (quotesBySymbol.size !== expectedCount)
            throw new Error(`Unexpected batched quote response: ${csv}`);

        return quotesBySymbol;
    }

    _normalizeQuoteDate(dateText) {
        const normalized = dateText.replaceAll('-', '');
        return /^\d{8}$/.test(normalized) ? normalized : '';
    }

    _normalizeTimestampDate(timestampText) {
        return this._normalizeQuoteDate(timestampText.slice(0, 10));
    }

    _markTickersRefreshed(tickers) {
        const refreshedAtUsec = GLib.get_monotonic_time();
        tickers.forEach(ticker => {
            this._lastRefreshTimeBySymbol.set(ticker.symbol.toUpperCase(), refreshedAtUsec);
        });
    }

    _shouldRefreshTicker(ticker) {
        if (ticker.marketType === MARKET_TYPES.ALWAYS_OPEN)
            return true;

        if (ticker.marketType === MARKET_TYPES.WEEKDAY_SESSION)
            return !this._isUsMarketWeekend();

        if (ticker.marketType === MARKET_TYPES.US_SESSION) {
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
        if (ticker.marketType !== MARKET_TYPES.US_SESSION)
            return this._refreshIntervalSeconds || DEFAULT_REFRESH_INTERVAL_SECONDS;

        return this._isUsMarketExtendedHoursActive()
            ? (this._refreshIntervalSeconds || DEFAULT_REFRESH_INTERVAL_SECONDS)
            : Math.max(this._refreshIntervalSeconds || DEFAULT_REFRESH_INTERVAL_SECONDS, US_SESSION_OVERNIGHT_REFRESH_INTERVAL_SECONDS);
    }

    _deriveKrakenPreviousClose(price, change, changePct, fallbackPreviousClose) {
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

        return Number.isFinite(fallbackPreviousClose) ? fallbackPreviousClose : null;
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
        const previousEntriesBySymbol = new Map(
            this._entries.map(entry => [entry.symbol?.toUpperCase() ?? entry.label, entry])
        );

        return entries.map(entry => {
            const previousEntry = previousEntriesBySymbol.get(entry.symbol?.toUpperCase() ?? entry.label);
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
