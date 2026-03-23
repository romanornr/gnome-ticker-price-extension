import {ASSET_CATEGORIES, CRYPTO_PROVIDERS} from '../utils/asset-categories.js';
import {
    createRuntimeProviderRegistry,
    getProviderRefreshPlan,
} from '../services/providers/runtime-provider-registry.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export function runTests() {
    testCreateRuntimeProviderRegistry();
    testRefreshPlanSkipsProvidersWithoutRefreshFallback();
    const krakenTicker = {assetCategory: ASSET_CATEGORIES.CRYPTO, cryptoProvider: CRYPTO_PROVIDERS.KRAKEN, liveSymbol: 'BTC/USD', symbol: 'btcusd'};
    const defaultKrakenTicker = {assetCategory: ASSET_CATEGORIES.CRYPTO, liveSymbol: 'ETH/USD', symbol: 'ethusd'};
    const hyperliquidTicker = {assetCategory: ASSET_CATEGORIES.CRYPTO, cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID, liveSymbol: 'PURR/USDC', symbol: 'purrusdc'};
    const stooqTicker = {assetCategory: ASSET_CATEGORIES.US_EQUITY, symbol: 'aapl.us'};

    const providerEntries = [
        {
            id: 'stooq',
            ownsTicker: ticker => ticker?.assetCategory !== ASSET_CATEGORIES.CRYPTO ||
                typeof ticker.liveSymbol !== 'string' ||
                ticker.liveSymbol === '',
            refreshFallback: () => new Map(),
        },
        {
            id: CRYPTO_PROVIDERS.KRAKEN,
            ownsTicker: ticker => ticker?.assetCategory === ASSET_CATEGORIES.CRYPTO &&
                typeof ticker.liveSymbol === 'string' &&
                ticker.liveSymbol !== '' &&
                (ticker.cryptoProvider ?? CRYPTO_PROVIDERS.KRAKEN) === CRYPTO_PROVIDERS.KRAKEN,
        },
        {
            id: CRYPTO_PROVIDERS.HYPERLIQUID,
            ownsTicker: ticker => ticker?.assetCategory === ASSET_CATEGORIES.CRYPTO &&
                typeof ticker.liveSymbol === 'string' &&
                ticker.liveSymbol !== '' &&
                ticker.cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID,
            provider: {
                isConnected() {
                    return false;
                },
            },
            hasPollingFallback: providerEntry => !providerEntry.provider.isConnected(),
            refreshFallback: () => new Map(),
        },
    ];

    const refreshPlan = getProviderRefreshPlan([
        krakenTicker,
        defaultKrakenTicker,
        hyperliquidTicker,
        stooqTicker,
    ], providerEntries);
    assertDeepEqual(refreshPlan.map(plan => ({
        id: plan.providerEntry.id,
        symbols: plan.tickers.map(ticker => ticker.symbol),
    })), [{
        id: 'stooq',
        symbols: ['aapl.us'],
    }, {
        id: CRYPTO_PROVIDERS.HYPERLIQUID,
        symbols: ['purrusdc'],
    }], 'Refresh planning should include normal polling providers and disconnected live-provider fallbacks');

    providerEntries[2].provider.isConnected = () => true;
    assertDeepEqual(getProviderRefreshPlan([hyperliquidTicker, stooqTicker], providerEntries).map(plan => ({
        id: plan.providerEntry.id,
        symbols: plan.tickers.map(ticker => ticker.symbol),
    })), [{
        id: 'stooq',
        symbols: ['aapl.us'],
    }],
        'Connected live providers should not schedule a polling fallback refresh');
}

function testCreateRuntimeProviderRegistry() {
    const registry = createRuntimeProviderRegistry({
        uuid: 'test-uuid',
        quoteStore: {getQuote() {
            return null;
        }},
        onQuotes() {},
    });

    assertDeepEqual(registry.map(entry => entry.id), [
        'stooq',
        CRYPTO_PROVIDERS.KRAKEN,
        CRYPTO_PROVIDERS.HYPERLIQUID,
    ], 'Runtime provider registry construction should expose Stooq, Kraken, and Hyperliquid entries in orchestration order');
    assertEqual(typeof registry[1].provider.start, 'function',
        'Runtime provider registry entries should expose live provider lifecycle objects where expected');
}

function testRefreshPlanSkipsProvidersWithoutRefreshFallback() {
    const plan = getProviderRefreshPlan([
        {symbol: 'btcusd', liveSymbol: 'BTC/USD'},
    ], [{
        id: 'no-refresh-provider',
        ownsTicker: () => true,
    }]);

    assertDeepEqual(plan, [],
        'Runtime provider refresh planning should skip provider entries that do not expose a refresh fallback');
}
