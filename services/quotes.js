import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Soup from 'gi://Soup?version=3.0';

import {buildEntries, clearPriceFlash} from './entry-model.js';
import {QuoteStore} from './quote-store.js';
import {
    HyperliquidLiveProvider,
    refresh as refreshHyperliquidQuotes,
} from './providers/hyperliquid-live.js';
import {KrakenLiveProvider} from './providers/kraken-live.js';
import {refresh as refreshStooqQuotes} from './providers/stooq.js';
import {DEFAULT_TEXT_COLOR} from '../utils/format.js';
import {createLoadingEntries} from '../utils/format.js';
import {ASSET_CATEGORIES, CRYPTO_PROVIDERS, SETTINGS_KEYS} from '../utils/settings.js';
import {
    loadDisplaySettings,
    loadRefreshIntervalSeconds,
    loadTickerConfigs,
} from '../utils/settings.js';
import {createMarketScheduleNow, shouldRefreshTicker} from '../utils/market-schedule.js';

const CRYPTO_UI_UPDATE_INTERVAL_SECONDS = 4;
const PRICE_FLASH_DURATION_MS = 700;

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
        this._quoteStore = new QuoteStore();
        this._refreshTimeoutId = 0;
        this._entriesUpdateTimeoutId = 0;
        this._entriesUpdateInProgress = false;
        this._entriesUpdateQueued = false;
        this._lastEntriesUpdateUsec = 0;
        this._priceFlashTimeoutId = 0;
        this._krakenProvider = new KrakenLiveProvider({
            uuid,
            onQuotes: quotesBySymbol => {
                this._handleLiveQuotes(quotesBySymbol);
            },
        });
        this._hyperliquidProvider = new HyperliquidLiveProvider({
            uuid,
            quoteStore: this._quoteStore,
            onQuotes: quotesBySymbol => {
                this._handleLiveQuotes(quotesBySymbol);
            },
        });
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

        this._krakenProvider.start(this._session);
        this._hyperliquidProvider.start(this._session);
        this._updateProviderSubscriptions();

        void this._refreshQuotes(true);
        this._scheduleRefreshTimer();
    }

    stop() {
        if (!this._running && !this._session)
            return;

        this._running = false;

        this._disconnectSettingsSignals();
        this._removeTimeout('_refreshTimeoutId');
        this._removeTimeout('_entriesUpdateTimeoutId');
        this._removeTimeout('_priceFlashTimeoutId');

        this._entriesUpdateInProgress = false;
        this._entriesUpdateQueued = false;
        this._lastEntriesUpdateUsec = 0;

        this._krakenProvider.stop();
        this._hyperliquidProvider.stop();
        this._session?.abort();
        this._session = null;

        this._quoteStore.clear();
        this._entries = createLoadingEntries(this._tickers, this._displaySettings);
    }

    getEntries() {
        return this._entries;
    }

    async _refreshQuotes(forceRefreshAll = false) {
        if (!this._running)
            return;

        const now = createMarketScheduleNow();
        const tickersToRefresh = forceRefreshAll
            ? this._tickers
            : this._tickers.filter(ticker => this._shouldRefreshTicker(ticker, now));

        const stooqTickers = tickersToRefresh.filter(ticker => !this._isLiveCryptoTicker(ticker));
        const hyperliquidTickers = tickersToRefresh.filter(ticker => this._isHyperliquidTicker(ticker));

        if (stooqTickers.length > 0)
            await this._refreshStooqQuotes(stooqTickers);

        if (hyperliquidTickers.length > 0 && !this._hasHyperliquidSocketConnected())
            await this._refreshHyperliquidQuotes(hyperliquidTickers);

        if (stooqTickers.length > 0 || hyperliquidTickers.length > 0)
            this._requestEntriesUpdate(true);
    }

    _connectSettingsSignals() {
        this._disconnectSettingsSignals();

        this._settingsSignalIds = [
            this._settings.connect(`changed::${SETTINGS_KEYS.TICKERS_JSON}`, () => {
                this._loadConfiguration();
                this._quoteStore.prune(this._tickers.map(ticker => ticker.symbol));
                this._entries = createLoadingEntries(this._tickers, this._displaySettings);
                this.emit('entries-changed');
                this._scheduleRefreshTimer();
                this._updateProviderSubscriptions();
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
            if (this._running) {
                this._entries = buildEntries(
                    this._tickers,
                    this._quoteStore,
                    this._displaySettings,
                    this._entries
                );
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

    async _refreshStooqQuotes(tickers) {
        try {
            const quotesBySymbol = await refreshStooqQuotes(tickers, {session: this._session});
            if (!this._running)
                return;

            this._mergeQuotes(quotesBySymbol);
            this._quoteStore.markRefreshed(tickers);
        } catch (error) {
            if (this._running)
                logError(error, `${this._uuid}: failed to refresh Stooq quotes`);
        }
    }

    async _refreshHyperliquidQuotes(tickers) {
        try {
            const quotesBySymbol = await refreshHyperliquidQuotes(tickers, {
                session: this._session,
                quoteStore: this._quoteStore,
            });
            if (!this._running)
                return;

            this._mergeQuotes(quotesBySymbol);
            this._quoteStore.markRefreshed(tickers);
        } catch (error) {
            if (this._running)
                logError(error, `${this._uuid}: failed to refresh Hyperliquid quotes`);
        }
    }

    _handleLiveQuotes(quotesBySymbol) {
        if (!this._running || !quotesBySymbol || quotesBySymbol.size === 0)
            return;

        this._mergeQuotes(quotesBySymbol);
        this._requestEntriesUpdate(false);
    }

    _mergeQuotes(quotesBySymbol) {
        quotesBySymbol.forEach((quote, symbol) => {
            const existingQuote = this._quoteStore.getQuote(symbol);
            const nextQuote = {
                ...quote,
                previousClose: Number.isFinite(quote?.previousClose)
                    ? quote.previousClose
                    : (existingQuote?.previousClose ?? null),
            };
            this._quoteStore.setQuote(symbol, nextQuote);
        });
    }

    _updateProviderSubscriptions() {
        this._krakenProvider.updateSubscriptions(this._tickers);
        this._hyperliquidProvider.updateSubscriptions(this._tickers);
    }

    _hasHyperliquidSocketConnected() {
        return this._hyperliquidProvider.isConnected();
    }

    _shouldRefreshTicker(ticker, now) {
        return shouldRefreshTicker(
            ticker,
            now,
            this._quoteStore.getLastRefreshUsec(ticker.symbol),
            this._refreshIntervalSeconds
        );
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

                this._entries = clearPriceFlash(this._entries);
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

    _isLiveCryptoTicker(ticker) {
        return ticker?.assetCategory === ASSET_CATEGORIES.CRYPTO &&
            typeof ticker.liveSymbol === 'string' &&
            ticker.liveSymbol !== '';
    }

    _isHyperliquidTicker(ticker) {
        return this._isLiveCryptoTicker(ticker) &&
            ticker.cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID;
    }
});
