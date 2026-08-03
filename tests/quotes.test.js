import {QuotesService} from '../services/quotes.js';
import {ASSET_CATEGORIES, CRYPTO_PROVIDERS} from '../utils/asset-categories.js';
import {SETTINGS_KEYS} from '../utils/settings.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export async function runTests() {
    await testRefreshQuotesUsesProviderPlanAndMarksRefreshed();
    await testRefreshQuotesSkipsEntryUpdateWhenNoProvidersNeedRefresh();
    await testPollProviderPreservesPreviousClose();
    await testPollProviderSwallowsProviderErrors();
    await testRefreshQuotesContinuesAfterProviderError();
    testHandleLiveQuotesMergesQuotesAndRequestsThrottledUpdate();
    await testStartBootsProvidersAndSchedulesRefresh();
    await testStartHandlesPollingOnlyProviders();
    testStopTearsDownProvidersAndClearsState();
    await testTickerSettingsChangeReloadsConfigurationAndRefreshes();
    testRefreshIntervalSettingChangeReschedulesCoordinator();
    testDisplaySettingsChangeRequestsImmediateRebuild();
}

async function testRefreshQuotesUsesProviderPlanAndMarksRefreshed() {
    const service = createQuotesService();
    let entryUpdateRequests = 0;
    const refreshCalls = [];

    service._running = true;
    service._session = {};
    service._tickers = [
        {assetCategory: ASSET_CATEGORIES.EQUITY, symbol: 'aapl.us'},
        {assetCategory: ASSET_CATEGORIES.CRYPTO, cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID, liveSymbol: 'PURR/USDC', symbol: 'purrusdc'},
        {assetCategory: ASSET_CATEGORIES.CRYPTO, cryptoProvider: CRYPTO_PROVIDERS.KRAKEN, liveSymbol: 'BTC/USD', symbol: 'btcusd'},
    ];
    service._coordinator = {
        requestEntriesUpdate(immediate) {
            if (immediate)
                entryUpdateRequests += 1;
        },
    };
    service._providers = [
        {
            id: 'rest',
            ownsTicker: ticker => !ticker.liveSymbol,
            poll: async tickers => {
                refreshCalls.push(['rest', tickers.map(ticker => ticker.symbol)]);
                return new Map([['AAPL.US', {
                    price: 210,
                    quoteDate: '20260322',
                    previousClose: 205,
                }]]);
            },
        },
        {
            id: CRYPTO_PROVIDERS.HYPERLIQUID,
            ownsTicker: ticker => ticker.cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID,
            shouldPoll: () => true,
            poll: async tickers => {
                refreshCalls.push(['hyperliquid', tickers.map(ticker => ticker.symbol)]);
                return new Map([['PURRUSDC', {
                    price: 0.42,
                    quoteDate: '20260322',
                    previousClose: 0.4,
                }]]);
            },
        },
        {
            id: CRYPTO_PROVIDERS.KRAKEN,
            ownsTicker: ticker => (ticker.cryptoProvider ?? CRYPTO_PROVIDERS.KRAKEN) === CRYPTO_PROVIDERS.KRAKEN &&
                typeof ticker.liveSymbol === 'string' &&
                ticker.liveSymbol !== '',
            shouldPoll: () => false,
            poll: async () => new Map(),
        },
    ];
    service._shouldRefreshTicker = ticker => ticker.symbol !== 'btcusd';

    await service._refreshQuotes(false);

    assertDeepEqual(refreshCalls, [
        ['rest', ['aapl.us']],
        ['hyperliquid', ['purrusdc']],
    ], 'QuotesService should refresh only the provider plans returned for due tickers');
    assertEqual(entryUpdateRequests, 1,
        'QuotesService should request one immediate entry rebuild after polling refreshes');
    assertEqual(service._quoteStore.getQuote('aapl.us').price, 210,
        'QuotesService should merge CNBC refresh results into the quote store');
    assertEqual(service._quoteStore.getQuote('purrusdc').price, 0.42,
        'QuotesService should merge provider fallback refresh results into the quote store');
    assertEqual(service._quoteStore.getLastRefreshUsec('aapl.us') > 0, true,
        'QuotesService should mark refreshed symbols after a successful provider refresh');
}

async function testPollProviderPreservesPreviousClose() {
    const service = createQuotesService();

    service._running = true;
    service._session = {};
    service._quoteStore.setQuote('BTCUSD', {
        price: 100,
        quoteDate: '20260321',
        previousClose: 90,
    });

    await service._pollProvider({
        id: CRYPTO_PROVIDERS.KRAKEN,
        poll: async () => new Map([['BTCUSD', {
            price: 101,
            quoteDate: '20260322',
            previousClose: null,
        }]]),
    }, [{symbol: 'btcusd'}]);

    assertDeepEqual(service._quoteStore.getQuote('btcusd'), {
        price: 101,
        quoteDate: '20260322',
        previousClose: 90,
    }, 'QuotesService should preserve cached previous close when a refresh omits it');
}

async function testRefreshQuotesSkipsEntryUpdateWhenNoProvidersNeedRefresh() {
    const service = createQuotesService();
    let entryUpdateRequests = 0;

    service._running = true;
    service._session = {};
    service._tickers = [{assetCategory: ASSET_CATEGORIES.EQUITY, symbol: 'aapl.us'}];
    service._coordinator = {
        requestEntriesUpdate() {
            entryUpdateRequests += 1;
        },
    };
    service._providers = [{
        id: 'rest',
        ownsTicker: () => true,
        shouldPoll: () => false,
        poll: async () => new Map(),
    }];

    await service._refreshQuotes(true);

    assertEqual(entryUpdateRequests, 0,
        'QuotesService should not request an entry update when the provider refresh plan is empty');
}

async function testPollProviderSwallowsProviderErrors() {
    const service = createQuotesService();
    const originalLogError = globalThis.logError;
    globalThis.logError = () => {};

    service._running = true;
    service._session = {};

    try {
        await service._pollProvider({
            id: 'broken-provider',
            poll: async () => {
                throw new Error('broken');
            },
        }, [{symbol: 'aapl.us'}]);
    } finally {
        globalThis.logError = originalLogError;
    }
}

async function testRefreshQuotesContinuesAfterProviderError() {
    const service = createQuotesService();
    const originalLogError = globalThis.logError;
    let entryUpdateRequests = 0;
    globalThis.logError = () => {};

    service._running = true;
    service._session = {};
    service._tickers = [
        {assetCategory: ASSET_CATEGORIES.EQUITY, symbol: 'bad.us'},
        {assetCategory: ASSET_CATEGORIES.CRYPTO, cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID, liveSymbol: 'PURR/USDC', symbol: 'purrusdc'},
    ];
    service._coordinator = {
        requestEntriesUpdate(immediate) {
            if (immediate)
                entryUpdateRequests += 1;
        },
    };
    service._providers = [
        {
            id: 'rest',
            ownsTicker: ticker => ticker.assetCategory === ASSET_CATEGORIES.EQUITY,
            poll: async () => {
                throw new Error('broken cnbc');
            },
        },
        {
            id: CRYPTO_PROVIDERS.HYPERLIQUID,
            ownsTicker: ticker => ticker.cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID,
            poll: async () => new Map([['PURRUSDC', {
                price: 0.42,
                quoteDate: '20260322',
                previousClose: 0.4,
            }]]),
        },
    ];

    try {
        await service._refreshQuotes(true);
    } finally {
        globalThis.logError = originalLogError;
    }

    assertEqual(service._quoteStore.getQuote('purrusdc').price, 0.42,
        'QuotesService should continue refreshing later providers after one provider fails');
    assertEqual(entryUpdateRequests, 1,
        'QuotesService should still request an entry rebuild when a later provider succeeds');
}

function testHandleLiveQuotesMergesQuotesAndRequestsThrottledUpdate() {
    const service = createQuotesService();
    let throttledUpdateRequests = 0;

    service._running = true;
    service._coordinator = {
        requestEntriesUpdate(immediate) {
            if (!immediate)
                throttledUpdateRequests += 1;
        },
    };

    service._handleLiveQuotes(new Map([['BTCUSD', {
        price: 103,
        quoteDate: '20260322',
        previousClose: 100,
    }]]));

    assertEqual(throttledUpdateRequests, 1,
        'Live quotes should request a throttled entry rebuild instead of an immediate refresh update');
    assertEqual(service._quoteStore.getQuote('btcusd').price, 103,
        'Live quotes should merge directly into the quote store');
}

async function testStartBootsProvidersAndSchedulesRefresh() {
    const service = createQuotesService();
    const providerStarts = [];
    let initialEntries = null;
    let refreshRequested = false;
    let scheduledRefreshInterval = 0;
    let subscriptionsUpdated = 0;

    service._providers = [{
        start(session) {
            providerStarts.push(session);
        },
        stop() {
        },
        updateSubscriptions() {
            subscriptionsUpdated += 1;
        },
    }];
    service._coordinator = {
        scheduleRefreshTimer(interval) {
            scheduledRefreshInterval = interval;
        },
        stop() {
        },
    };
    service._refreshQuotes = async forceRefreshAll => {
        refreshRequested = forceRefreshAll;
    };
    service.connect('entries-changed', () => {
        initialEntries = service.getEntries();
    });

    service.start();
    assertEqual(initialEntries?.length, service._tickers.length,
        'QuotesService.start() should synchronously emit one entry per configured ticker');
    assertEqual(initialEntries?.every(entry => entry.priceText === '...'), true,
        'QuotesService.start() should emit loading entries before provider work begins');
    await Promise.resolve();

    assertEqual(service._running, true,
        'QuotesService.start() should mark the service as running');
    assertEqual(providerStarts.length, 1,
        'QuotesService.start() should start each runtime provider once');
    assertEqual(providerStarts[0] === service._session, true,
        'QuotesService.start() should pass the shared Soup session to runtime providers');
    assertEqual(subscriptionsUpdated, 1,
        'QuotesService.start() should reconcile provider subscriptions immediately');
    assertEqual(refreshRequested, true,
        'QuotesService.start() should trigger an initial full refresh');
    assertEqual(scheduledRefreshInterval, service._refreshIntervalSeconds,
        'QuotesService.start() should schedule the refresh timer using the configured cadence');

    service.stop();
}

async function testStartHandlesPollingOnlyProviders() {
    const service = createQuotesService();
    let providerStarts = 0;
    let subscriptionsUpdated = 0;
    let refreshRequested = false;

    service._providers = [
        {
            id: 'rest',
            poll: async () => new Map(),
        },
        {
            id: CRYPTO_PROVIDERS.KRAKEN,
            start() {
                providerStarts += 1;
            },
            stop() {
            },
            updateSubscriptions() {
                subscriptionsUpdated += 1;
            },
        },
    ];
    service._coordinator = {
        scheduleRefreshTimer() {
        },
        stop() {
        },
    };
    service._refreshQuotes = async forceRefreshAll => {
        refreshRequested = forceRefreshAll;
    };

    service.start();
    await Promise.resolve();

    assertEqual(service._running, true,
        'QuotesService.start() should still run when polling providers omit live lifecycle methods');
    assertEqual(providerStarts, 1,
        'QuotesService.start() should only start providers that expose live lifecycle methods');
    assertEqual(subscriptionsUpdated, 1,
        'QuotesService.start() should only update providers that expose subscription methods');
    assertEqual(refreshRequested, true,
        'QuotesService.start() should trigger the initial refresh with mixed provider capabilities');

    service.stop();
}

function testStopTearsDownProvidersAndClearsState() {
    const service = createQuotesService();
    let providerStops = 0;
    let coordinatorStops = 0;
    let sessionAborts = 0;

    service._running = true;
    service._session = {
        abort() {
            sessionAborts += 1;
        },
    };
    service._providers = [{
        stop() {
            providerStops += 1;
        },
    }];
    service._coordinator = {
        stop() {
            coordinatorStops += 1;
        },
    };
    service._quoteStore.setQuote('BTCUSD', {
        price: 100,
        quoteDate: '20260322',
        previousClose: 90,
    });

    service.stop();

    assertEqual(providerStops, 1,
        'QuotesService.stop() should stop each runtime provider once');
    assertEqual(coordinatorStops, 1,
        'QuotesService.stop() should stop the coordinator');
    assertEqual(sessionAborts, 1,
        'QuotesService.stop() should abort the shared Soup session');
    assertEqual(service._session, null,
        'QuotesService.stop() should clear the shared session reference');
    assertEqual(service._running, false,
        'QuotesService.stop() should mark the service as not running');
    assertEqual(service._quoteStore.getQuote('btcusd'), null,
        'QuotesService.stop() should clear cached quotes for a clean restart');
}

async function testTickerSettingsChangeReloadsConfigurationAndRefreshes() {
    const settings = createObservableFakeSettings();
    const service = new QuotesService('test-uuid', settings);
    let changedEntries = null;
    let refreshRequested = false;
    let subscriptionsUpdated = 0;
    let scheduledRefreshInterval = 0;

    service._running = true;
    service._tickers = [{symbol: 'old.us'}];
    service._quoteStore.setQuote('OLD.US', {
        price: 1,
        quoteDate: '20260322',
        previousClose: 1,
    });
    service._providers = [{
        updateSubscriptions() {
            subscriptionsUpdated += 1;
        },
    }];
    service._coordinator = {
        scheduleRefreshTimer(interval) {
            scheduledRefreshInterval = interval;
        },
    };
    service._refreshQuotes = async forceRefreshAll => {
        refreshRequested = forceRefreshAll;
    };
    service.connect('entries-changed', () => {
        changedEntries = service.getEntries();
    });

    service._connectSettingsSignals();
    settings.values[SETTINGS_KEYS.TICKERS_JSON] = JSON.stringify([{
        label: 'AAPL',
        symbol: 'aapl.us',
        priceDecimals: 2,
        marketType: 'us_session',
        assetCategory: 'us_equity',
        panelSide: 'right',
    }]);
    settings.trigger(`changed::${SETTINGS_KEYS.TICKERS_JSON}`);
    assertDeepEqual(changedEntries?.map(entry => [entry.symbol, entry.priceText]), [['aapl.us', '...']],
        'Ticker setting changes should synchronously emit loading entries for the new configuration');
    await Promise.resolve();

    assertEqual(service._tickers[0].symbol, 'aapl.us',
        'Ticker setting changes should reload saved ticker configuration');
    assertEqual(service._quoteStore.getQuote('old.us'), null,
        'Ticker setting changes should prune stale cached symbols');
    assertEqual(subscriptionsUpdated, 1,
        'Ticker setting changes should reconcile provider subscriptions');
    assertEqual(refreshRequested, true,
        'Ticker setting changes should trigger a full refresh');
    assertEqual(scheduledRefreshInterval, service._refreshIntervalSeconds,
        'Ticker setting changes should reschedule the refresh timer');
}

function testDisplaySettingsChangeRequestsImmediateRebuild() {
    const settings = createObservableFakeSettings();
    settings.settings_schema = {
        has_key(key) {
            return key === SETTINGS_KEYS.FONT_PRESET;
        },
    };
    const service = new QuotesService('test-uuid', settings);
    let immediateRebuildRequests = 0;

    service._coordinator = {
        requestEntriesUpdate(immediate) {
            if (immediate)
                immediateRebuildRequests += 1;
        },
    };

    service._connectSettingsSignals();
    settings.values[SETTINGS_KEYS.SHOW_PRICE] = true;
    settings.trigger(`changed::${SETTINGS_KEYS.SHOW_PRICE}`);
    settings.values[SETTINGS_KEYS.FONT_PRESET] = 'monospace';
    settings.trigger(`changed::${SETTINGS_KEYS.FONT_PRESET}`);

    assertEqual(immediateRebuildRequests, 2,
        'Display-only setting changes including font preset should request an immediate entry rebuild');
}

function testRefreshIntervalSettingChangeReschedulesCoordinator() {
    const settings = createObservableFakeSettings();
    const service = new QuotesService('test-uuid', settings);
    let scheduledRefreshInterval = 0;

    service._coordinator = {
        scheduleRefreshTimer(interval) {
            scheduledRefreshInterval = interval;
        },
    };

    service._connectSettingsSignals();
    settings.values[SETTINGS_KEYS.REFRESH_INTERVAL_SECONDS] = 45;
    settings.trigger(`changed::${SETTINGS_KEYS.REFRESH_INTERVAL_SECONDS}`);

    assertEqual(service._refreshIntervalSeconds, 45,
        'Refresh-interval setting changes should reload the configured cadence');
    assertEqual(scheduledRefreshInterval, 45,
        'Refresh-interval setting changes should reschedule the coordinator timer');
}

function createQuotesService() {
    return new QuotesService('test-uuid', createFakeSettings());
}

function createFakeSettings() {
    return createObservableFakeSettings();
}

function createObservableFakeSettings() {
    return {
        values: {},
        handlers: new Map(),
        get_string(key) {
            return this.values[key] ?? '';
        },
        get_boolean(key) {
            return this.values[key] ?? false;
        },
        get_uint(key) {
            return this.values[key] ?? 5;
        },
        connect(signal, handler) {
            this.handlers.set(signal, handler);
            return signal;
        },
        disconnect(signal) {
            this.handlers.delete(signal);
        },
        trigger(signal) {
            this.handlers.get(signal)?.();
        },
    };
}
