import GObject from 'gi://GObject';
import Soup from 'gi://Soup?version=3.0';

import {buildEntries} from './entry-model.js';
import {QuotesCoordinator} from './quotes-coordinator.js';
import {QuoteStore} from './quote-store.js';
import {
    createRuntimeProviderRegistry,
    getProviderRefreshPlan,
} from './providers/runtime-provider-registry.js';
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
 * QuotesService is the top-level runtime orchestrator for market data.
 *
 * It sits between GNOME settings/UI state and the lower-level quote plumbing:
 * - loads ticker/display configuration from settings
 * - decides which tickers need refreshes on each pass
 * - coordinates REST and live websocket providers
 * - stores normalized quotes in QuoteStore
 * - asks the coordinator to rebuild panel entries at the right cadence
 *
 * It deliberately does not own provider-specific parsing, market schedule rules,
 * or entry formatting details. Those responsibilities live in the provider,
 * schedule, store, and entry-model modules so the whole quote pipeline reads as
 * one system instead of one giant service class.
 */
export const QuotesService = GObject.registerClass({
    Signals: {
        'entries-changed': {},
    },
}, class QuotesService extends GObject.Object {
    /*
     * The constructor wires the runtime graph together once:
     * settings -> service -> providers/store/coordinator -> entries-changed.
     *
     * After startup, the rest of the system flows through those collaborators
     * instead of accumulating more state machines inside this class.
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
            onRefresh: async () => {
                if (this._running)
                    await this._refreshQuotes(false);
            },
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
        this._runtimeProviders = createRuntimeProviderRegistry({uuid, onQuotes: quotesBySymbol => this._handleLiveQuotes(quotesBySymbol), quoteStore: this._quoteStore});
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

        this._runtimeProviders.forEach(({provider}) => provider?.start(this._session));
        this._updateProviderSubscriptions();

        void this._refreshQuotes(true);
        this._coordinator.scheduleRefreshTimer(this._refreshIntervalSeconds);
    }

    /* stop() shuts down the quote pipeline in reverse order so sockets, timers, and cache state cannot leak. */
    stop() {
        if (!this._running && !this._session)
            return;

        this._running = false;

        this._disconnectSettingsSignals();
        this._coordinator.stop();

        this._runtimeProviders.forEach(({provider}) => provider?.stop());
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
     * the right provider layer. The provider registry owns refresh entrypoints
     * for both normal polling providers such as Stooq and live providers that
     * expose a fallback REST path when their socket is unavailable.
     */
    async _refreshQuotes(forceRefreshAll = false) {
        if (!this._running)
            return;

        const now = createMarketScheduleNow();
        const tickersToRefresh = forceRefreshAll
            ? this._tickers
            : this._tickers.filter(ticker => this._shouldRefreshTicker(ticker, now));
        const providerRefreshPlan = getProviderRefreshPlan(tickersToRefresh, this._runtimeProviders);

        for (const {providerEntry, tickers} of providerRefreshPlan)
            await this._refreshProviderFallback(providerEntry, tickers);

        if (providerRefreshPlan.length > 0)
            this._coordinator.requestEntriesUpdate(true);
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
                void this._refreshQuotes(true);
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

    /*
     * Provider refreshes always normalize into the same in-memory quote shape so
     * the rest of the system can stay provider-agnostic after this point.
     */
    /* Provider fallback refreshes are only used by runtime entries that explicitly define a polling path. */
    async _refreshProviderFallback(providerEntry, tickers) {
        try {
            const quotesBySymbol = await providerEntry.refreshFallback(tickers, {
                session: this._session,
                quoteStore: this._quoteStore,
            });
            if (!this._running)
                return;

            this._mergeQuotes(quotesBySymbol);
            this._quoteStore.markRefreshed(tickers);
        } catch (error) {
            if (this._running)
                logError(error, `${this._uuid}: failed to refresh ${providerEntry.id} fallback quotes`);
        }
    }

    /* Live providers push quote bursts through this path so the coordinator can throttle UI churn. */
    _handleLiveQuotes(quotesBySymbol) {
        if (!this._running || !quotesBySymbol || quotesBySymbol.size === 0)
            return;

        this._mergeQuotes(quotesBySymbol);
        this._coordinator.requestEntriesUpdate(false);
    }

    /*
     * QuoteStore is the system boundary where provider-specific quote updates
     * become a single normalized cache keyed by ticker symbol. From here onward,
     * entry building and panel rendering no longer care where the quote came from.
     */
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

    /* Saved ticker changes are reconciled into both live providers through this shared handoff. */
    _updateProviderSubscriptions() {
        this._runtimeProviders.forEach(({provider}) => provider?.updateSubscriptions(this._tickers));
    }

    /*
     * Schedule decisions are delegated so this service only asks "should this
     * symbol refresh now?" rather than embedding time-zone and market-session
     * rules directly in the orchestration flow.
     */
    _shouldRefreshTicker(ticker, now) {
        return shouldRefreshTicker(
            ticker,
            now,
            this._quoteStore.getLastRefreshUsec(ticker.symbol),
            this._refreshIntervalSeconds
        );
    }

});
