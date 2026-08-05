import GObject from 'gi://GObject';
import Soup from 'gi://Soup?version=3.0';

import {buildEntries} from './entry-model.js';
import {QuotesCoordinator} from './quotes-coordinator.js';
import {QuoteStore} from './quote-store.js';
import {HyperliquidProvider} from './providers/hyperliquid-live.js';
import {KrakenProvider} from './providers/kraken-live.js';
import {restProvider} from './providers/rest-quotes.js';
import {createLoadingEntries} from '../utils/format.js';
import {
    hasSettingsKey,
    loadDisplaySettings,
    loadRefreshIntervalSeconds,
    loadTickerConfigs,
    SETTINGS_KEYS,
} from '../utils/settings.js';
import {createMarketScheduleNow, shouldRefreshTicker} from '../utils/market-schedule.js';

/*
 * Top-level market-data orchestration runs settings -> providers -> QuoteStore -> entries.
 * Provider formats, schedule policy, and display formatting remain outside this class.
 */
export const QuotesService = GObject.registerClass({
    Signals: {
        'entries-changed': {},
    },
}, class QuotesService extends GObject.Object {
    /*
     * Construction wires provider and timer events into the entry pipeline.
     * The flat provider list below is the single runtime composition point.
     */
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
        this._coordinator = new QuotesCoordinator({
            onRefresh: forced => this._running ? this._refreshQuotes(forced) : null,
            onReconnectLiveProviders: () => this._providers.forEach(provider => provider.reconnectNow?.()),
            onRebuildEntries: async () => {
                if (!this._running)
                    return;

                this._entries = buildEntries(
                    this._tickers,
                    this._quoteStore,
                    this._displaySettings,
                    this._entries
                );
                this.emit('entries-changed');
                this._coordinator.schedulePriceFlashReset(this._entries);
            },
            onResetPriceFlash: nextEntries => {
                if (!this._running)
                    return;

                this._entries = nextEntries;
                this.emit('entries-changed');
            },
        });
        const liveProviderOptions = {
            uuid,
            onQuotes: quotesBySymbol => this._handleLiveQuotes(quotesBySymbol),
            onStale: tickers => this._handleStaleTickers(tickers),
        };
        this._providers = [
            restProvider,
            new KrakenProvider(liveProviderOptions),
            new HyperliquidProvider(liveProviderOptions),
        ];
    }

    /* start() boots the full quote pipeline: settings, providers, initial loading state, and timers. */
    start() {
        if (this._running)
            return;

        this._running = true;
        this._session = new Soup.Session();
        this._loadConfiguration();
        this._connectSettingsSignals();
        this._entries = createLoadingEntries(this._tickers, this._displaySettings);
        this.emit('entries-changed');

        this._providers.forEach(provider => provider.start?.(this._session));
        this._updateProviderSubscriptions();

        this._coordinator.scheduleRefreshTimer(this._refreshIntervalSeconds);
        this._coordinator.requestRefresh(true);
    }

    /* stop() shuts down the quote pipeline in reverse order so sockets, timers, and cache state cannot leak. */
    stop() {
        if (!this._running && !this._session)
            return;

        this._running = false;

        this._disconnectSettingsSignals();
        this._coordinator.stop();

        this._providers.forEach(provider => provider.stop?.());
        this._session?.abort();
        this._session = null;

        this._quoteStore.clear();
        this._entries = createLoadingEntries(this._tickers, this._displaySettings);
    }

    /* The extension reads the current entry snapshot through this accessor when indicators need to redraw. */
    getEntries() {
        return this._entries;
    }

    /*
     * A refresh pass first decides what needs data right now, then delegates to
     * the provider that owns each ticker. Live providers participate in normal
     * polling only while their websocket is unavailable.
     */
    async _refreshQuotes(forceRefreshAll = false) {
        if (!this._running)
            return null;

        const now = createMarketScheduleNow();
        const tickersToRefresh = forceRefreshAll
            ? this._tickers
            : this._tickers.filter(ticker => this._shouldRefreshTicker(ticker, now));
        const providerRefreshPlan = this._providers
            .filter(provider => provider.shouldPoll?.() ?? true)
            .map(provider => ({
                provider,
                tickers: tickersToRefresh.filter(ticker => provider.ownsTicker(ticker)),
            }))
            .filter(({tickers}) => tickers.length > 0);

        let directRestOutcome = null;
        for (const {provider, tickers} of providerRefreshPlan) {
            const outcome = await this._pollProvider(provider, tickers);
            if (!this._running || outcome === null)
                return null;

            if (provider === restProvider)
                directRestOutcome = outcome;
        }

        if (providerRefreshPlan.length > 0)
            this._coordinator.requestEntriesUpdate(true);

        return directRestOutcome;
    }

    /*
     * Settings changes feed back into the runtime here. Some changes trigger a
     * full configuration reload, while display-only changes rebuild entries
     * without touching network state.
     */
    _connectSettingsSignals() {
        this._disconnectSettingsSignals();

        this._settingsSignalIds = [
            this._settings.connect(`changed::${SETTINGS_KEYS.TICKERS_JSON}`, () => {
                this._loadConfiguration();
                this._quoteStore.prune(this._tickers.map(ticker => ticker.symbol));
                this._entries = createLoadingEntries(this._tickers, this._displaySettings);
                this.emit('entries-changed');
                this._coordinator.scheduleRefreshTimer(this._refreshIntervalSeconds);
                this._updateProviderSubscriptions();
                this._coordinator.requestRefresh(true);
            }),
            this._settings.connect(`changed::${SETTINGS_KEYS.REFRESH_INTERVAL_SECONDS}`, () => {
                this._refreshIntervalSeconds = loadRefreshIntervalSeconds(this._settings);
                this._coordinator.scheduleRefreshTimer(this._refreshIntervalSeconds);
            }),
            this._settings.connect(`changed::${SETTINGS_KEYS.FORMAT_PRESET}`, () => this._handleDisplaySettingsChanged()),
            this._settings.connect(`changed::${SETTINGS_KEYS.SHOW_PRICE}`, () => this._handleDisplaySettingsChanged()),
            this._settings.connect(`changed::${SETTINGS_KEYS.SHOW_ARROW}`, () => this._handleDisplaySettingsChanged()),
            this._settings.connect(`changed::${SETTINGS_KEYS.SHOW_PERCENT}`, () => this._handleDisplaySettingsChanged()),
            this._settings.connect(`changed::${SETTINGS_KEYS.SEPARATOR_STYLE}`, () => this._handleDisplaySettingsChanged()),
        ];

        if (hasSettingsKey(this._settings, SETTINGS_KEYS.FONT_PRESET)) {
            this._settingsSignalIds.push(
                this._settings.connect(`changed::${SETTINGS_KEYS.FONT_PRESET}`, () => this._handleDisplaySettingsChanged())
            );
        }
    }

    /* Signal teardown is centralized so startup/shutdown and hot reconfiguration use the same cleanup path. */
    _disconnectSettingsSignals() {
        this._settingsSignalIds.forEach(signalId => this._settings?.disconnect(signalId));
        this._settingsSignalIds = [];
    }

    /* Display-only settings do not require refetching quotes, only rebuilding the current entry models. */
    _handleDisplaySettingsChanged() {
        this._displaySettings = loadDisplaySettings(this._settings);
        this._coordinator.requestEntriesUpdate(true);
    }

    /* Configuration is always reloaded from settings before major orchestration steps. */
    _loadConfiguration() {
        this._tickers = loadTickerConfigs(this._settings);
        this._displaySettings = loadDisplaySettings(this._settings);
        this._refreshIntervalSeconds = loadRefreshIntervalSeconds(this._settings);
    }

    /* Provider polls are isolated and merge into the same normalized QuoteStore boundary. */
    async _pollProvider(provider, tickers) {
        try {
            const quotesBySymbol = await provider.poll(tickers, {
                session: this._session,
            });
            if (!this._running)
                return null;

            quotesBySymbol.forEach((quote, symbol) => this._quoteStore.setQuote(symbol, quote));
            const refreshedTickers = tickers.filter(ticker => quotesBySymbol.has(ticker.symbol.toUpperCase()));
            const staleTickers = tickers.filter(ticker => !quotesBySymbol.has(ticker.symbol.toUpperCase()));
            this._quoteStore.markRefreshed(refreshedTickers);
            this._quoteStore.markStale(staleTickers);
            return true;
        } catch (error) {
            if (!this._running)
                return null;

            this._quoteStore.markStale(tickers);
            if (this._running)
                logError(error, `${this._uuid}: failed to poll ${provider.id} quotes`);
            return false;
        }
    }

    /* Live providers push quote bursts through this path so the coordinator can throttle UI churn. */
    _handleLiveQuotes(quotesBySymbol) {
        if (!this._running || !quotesBySymbol || quotesBySymbol.size === 0)
            return;

        quotesBySymbol.forEach((quote, symbol) => this._quoteStore.setQuote(symbol, quote));
        this._coordinator.requestEntriesUpdate(false);
    }

    /* Live transport failures preserve cached quotes but mark them stale until fresh provider data arrives. */
    _handleStaleTickers(tickers) {
        if (!this._running || !tickers || tickers.length === 0)
            return;

        this._quoteStore.markStale(tickers);
        this._coordinator.requestEntriesUpdate(true);
    }

    /* Saved ticker changes are reconciled into both live providers through this shared handoff. */
    _updateProviderSubscriptions() {
        this._providers.forEach(provider => provider.updateSubscriptions?.(this._tickers));
    }

    /*
     * Schedule decisions are delegated so this service only asks "should this
     * symbol refresh now?" rather than embedding time-zone and market-session
     * rules directly in the orchestration flow.
     */
    _shouldRefreshTicker(ticker, now) {
        if (this._quoteStore.isStale(ticker.symbol))
            return true;

        return shouldRefreshTicker(
            ticker,
            now,
            this._quoteStore.getLastRefreshUsec(ticker.symbol),
            this._refreshIntervalSeconds
        );
    }

});
