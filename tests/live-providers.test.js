import {ASSET_CATEGORIES, CRYPTO_PROVIDERS} from '../utils/asset-categories.js';
import {hyperliquidAdapter, krakenAdapter} from '../utils/crypto-providers/index.js';
import {KrakenProvider} from '../services/providers/kraken-live.js';
import {HyperliquidProvider} from '../services/providers/hyperliquid-live.js';
import {restProvider} from '../services/providers/rest-quotes.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export async function runTests() {
    testKrakenPayloadHandling();
    testHyperliquidPayloadHandling();
    testKrakenReconnectPayloadHandling();
    testHyperliquidIgnoresUnmappedPayloads();
    testProviderOwnership();
    await testProviderPolling();
}

function testKrakenPayloadHandling() {
    const provider = new KrakenProvider({uuid: 'test', onQuotes() {}});
    provider._tickers = [{liveSymbol: 'BTC/USD', symbol: 'btcusd'}];

    assertDeepEqual(provider._handlePayload({
        method: 'subscribe',
        success: true,
        result: {channel: 'ticker'},
    }), {resetReconnect: true},
    'Kraken live providers should reset reconnect backoff after a successful subscribe acknowledgement');

    const result = provider._handlePayload({
        channel: 'ticker',
        data: [{
            symbol: 'BTC/USD',
            last: '104321.50',
            timestamp: '2026-03-22T12:34:56.789Z',
            change: '321.5',
            change_pct: '0.3',
        }],
    });
    assertEqual(result.resetReconnect, true,
        'Kraken live providers should reset reconnect state after receiving quote data');
    assertDeepEqual(Array.from(result.quotesBySymbol.entries()), [[
        'BTCUSD',
        {price: 104321.5, quoteDate: '20260322', previousClose: 104000},
    ]], 'Kraken live providers should normalize websocket payloads into quote updates');
}

function testHyperliquidPayloadHandling() {
    const provider = new HyperliquidProvider({uuid: 'test', onQuotes() {}});
    provider._tickers = [{liveSymbol: 'PURR/USDC', symbol: 'purrusdc'}];

    assertDeepEqual(provider._handlePayload({
        channel: 'subscriptionResponse',
        data: {type: 'activeAssetCtx'},
    }), {resetReconnect: true},
    'Hyperliquid live providers should reset reconnect backoff after a successful subscribe acknowledgement');

    const result = provider._handlePayload({
        channel: 'activeAssetCtx',
        data: {
            coin: ' purr / usdc ',
            ctx: {
                midPx: '0.42',
                prevDayPx: '0.39',
            },
        },
    });
    assertEqual(result.resetReconnect, true,
        'Hyperliquid live providers should reset reconnect state after receiving quote data');
    assertEqual(Array.from(result.quotesBySymbol.keys())[0], 'PURRUSDC',
        'Hyperliquid live providers should route payloads back to saved ticker symbols');
    assertEqual(Array.from(result.quotesBySymbol.values())[0].price, 0.42,
        'Hyperliquid live providers should normalize provider prices into quote updates');
}

function testKrakenReconnectPayloadHandling() {
    const provider = new KrakenProvider({uuid: 'test', onQuotes() {}});
    const originalLogError = globalThis.logError;
    globalThis.logError = () => {};

    try {
        assertDeepEqual(provider._handlePayload({
            success: false,
            error: 'bad subscription',
        }), {reconnect: true},
        'Kraken live providers should request reconnect after a rejected subscription payload');
    } finally {
        globalThis.logError = originalLogError;
    }
}

function testHyperliquidIgnoresUnmappedPayloads() {
    const provider = new HyperliquidProvider({
        uuid: 'test',
        onQuotes() {},
    });
    provider._tickers = [{liveSymbol: 'BTC', symbol: 'btc'}];

    assertEqual(provider._handlePayload({
        channel: 'activeAssetCtx',
        data: {
            coin: 'ETH',
            ctx: {midPx: '2000'},
        },
    }), null,
    'Hyperliquid live providers should ignore payloads that do not map back to a saved ticker');
}

function testProviderOwnership() {
    const kraken = new KrakenProvider({uuid: 'test'});
    const hyperliquid = new HyperliquidProvider({uuid: 'test'});
    const defaultKrakenTicker = {assetCategory: ASSET_CATEGORIES.CRYPTO, liveSymbol: 'BTC/USD'};
    const hyperliquidTicker = {
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID,
        liveSymbol: 'PURR/USDC',
    };
    const unknownProviderTicker = {
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: 'unknown-provider',
        liveSymbol: 'UNKNOWN/USD',
    };
    const equityTicker = {assetCategory: ASSET_CATEGORIES.EQUITY, symbol: 'aapl.us'};

    assertEqual(kraken.ownsTicker(defaultKrakenTicker), true,
        'Missing crypto provider ids should retain default Kraken ownership');
    assertEqual(kraken.ownsTicker(hyperliquidTicker), false,
        'Kraken ownership should not include explicit Hyperliquid tickers');
    assertEqual(hyperliquid.ownsTicker(hyperliquidTicker), true,
        'Hyperliquid should own explicitly assigned live tickers');
    assertEqual(restProvider.ownsTicker(equityTicker), true,
        'The REST provider should own non-live tickers');
    assertEqual(restProvider.ownsTicker(unknownProviderTicker), false,
        'Live crypto with an unknown provider should not leak into REST pricing');
    assertEqual(kraken.ownsTicker(unknownProviderTicker) || hyperliquid.ownsTicker(unknownProviderTicker), false,
        'Unknown explicit provider ids should remain unowned rather than silently changing providers');
}

async function testProviderPolling() {
    const originalKrakenFetch = krakenAdapter.fetchTickerQuotes;
    const originalHyperliquidFetch = hyperliquidAdapter.fetchMarketSnapshots;
    krakenAdapter.fetchTickerQuotes = async (_session, symbols) => {
        assertDeepEqual(symbols, ['BTC/USD'],
            'Kraken polling should request the owned live symbols once');
        return new Map([['BTC/USD', {price: 100, quoteDate: '20260803', previousClose: 90}]]);
    };
    hyperliquidAdapter.fetchMarketSnapshots = async () => ({
        perps: [{liveSymbol: 'BTC', ctx: {midPx: '101', prevDayPx: '91'}}],
        spots: [{liveSymbol: 'PURR/USDC', ctx: {midPx: '0.42', prevDayPx: '0.4'}}],
    });

    try {
        const krakenQuotes = await new KrakenProvider({uuid: 'test'}).poll([
            {liveSymbol: 'BTC/USD', symbol: 'btcusd'},
        ], {session: {}});
        assertDeepEqual(Array.from(krakenQuotes.entries()), [[
            'BTCUSD', {price: 100, quoteDate: '20260803', previousClose: 90},
        ]], 'Kraken polling should route pair quotes back to uppercase saved symbols');

        const hyperliquidQuotes = await new HyperliquidProvider({uuid: 'test'}).poll([
            {liveSymbol: 'BTC', symbol: 'btc'},
            {liveSymbol: 'PURR/USDC', symbol: 'purrusdc'},
        ], {session: {}});
        assertDeepEqual(Array.from(hyperliquidQuotes.entries()).map(([symbol, quote]) => [symbol, {
            price: quote.price,
            previousClose: quote.previousClose,
        }]), [
            ['BTC', {price: 101, previousClose: 91}],
            ['PURRUSDC', {price: 0.42, previousClose: 0.4}],
        ], 'Hyperliquid polling should route perp and spot snapshots back to uppercase saved symbols');
    } finally {
        krakenAdapter.fetchTickerQuotes = originalKrakenFetch;
        hyperliquidAdapter.fetchMarketSnapshots = originalHyperliquidFetch;
    }
}
