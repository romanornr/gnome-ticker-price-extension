import {KrakenLiveProvider} from '../services/providers/kraken-live.js';
import {HyperliquidLiveProvider} from '../services/providers/hyperliquid-live.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export function runTests() {
    testKrakenPayloadHandling();
    testHyperliquidPayloadHandling();
    testKrakenReconnectPayloadHandling();
    testHyperliquidIgnoresUnmappedPayloads();
}

function testKrakenPayloadHandling() {
    const provider = new KrakenLiveProvider({uuid: 'test', onQuotes() {}});
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
    const quoteStore = {getQuote() {
        return {previousClose: 0.4};
    }};
    const provider = new HyperliquidLiveProvider({uuid: 'test', quoteStore, onQuotes() {}});
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
    const provider = new KrakenLiveProvider({uuid: 'test', onQuotes() {}});
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
    const provider = new HyperliquidLiveProvider({
        uuid: 'test',
        quoteStore: {getQuote() {
            return null;
        }},
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
