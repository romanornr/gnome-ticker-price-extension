import Soup from 'gi://Soup?version=3.0';

import {LiveWebsocketProvider} from '../services/providers/live-websocket-provider.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export function runTests() {
    testHandleSocketMessageEmitsQuotesAndResetsReconnect();
    testHandleSocketMessageReconnectsOnProviderRequest();
    testHandleSocketMessageIgnoresInvalidJson();
    testHandleSocketMessageIgnoresNonTextFrames();
    testHandleSocketMessageCanResetReconnectWithoutEmittingQuotes();
    testSharedMappingHelpersRemainAvailableThroughTheBaseClass();
    testDisconnectMarksCurrentTickersStale();
}

function testHandleSocketMessageEmitsQuotesAndResetsReconnect() {
    const emittedQuotes = [];
    const provider = new TestLiveWebsocketProvider({onQuotes: quotesBySymbol => emittedQuotes.push(Array.from(quotesBySymbol.entries()))});
    provider._reconnectAttempt = 3;

    provider.setHandlePayloadResult({
        resetReconnect: true,
        quotesBySymbol: new Map([['BTCUSD', {
            price: 100,
            quoteDate: '20260322',
            previousClose: 90,
        }]]),
    });

    provider._handleSocketMessage(Soup.WebsocketDataType.TEXT, createTextMessageBytes('{"ok":true}'));

    assertEqual(provider._reconnectAttempt, 0,
        'LiveWebsocketProvider should reset reconnect attempts when providers acknowledge healthy traffic');
    assertDeepEqual(emittedQuotes, [[[
        'BTCUSD',
        {price: 100, quoteDate: '20260322', previousClose: 90},
    ]]], 'LiveWebsocketProvider should forward normalized quote maps to its onQuotes callback');
}

function testHandleSocketMessageReconnectsOnProviderRequest() {
    const provider = new TestLiveWebsocketProvider();
    provider.setHandlePayloadResult({reconnect: true});

    provider._handleSocketMessage(Soup.WebsocketDataType.TEXT, createTextMessageBytes('{"reconnect":true}'));

    assertEqual(provider.disconnectCalls, 1,
        'LiveWebsocketProvider should disconnect the websocket when a provider requests reconnect');
    assertEqual(provider.scheduleReconnectCalls, 1,
        'LiveWebsocketProvider should schedule reconnect after a provider-level reconnect signal');
}

function testHandleSocketMessageIgnoresInvalidJson() {
    const provider = new TestLiveWebsocketProvider();
    const originalLogError = globalThis.logError;
    globalThis.logError = () => {};

    try {
        provider._handleSocketMessage(Soup.WebsocketDataType.TEXT, createTextMessageBytes('{not-json'));
    } finally {
        globalThis.logError = originalLogError;
    }

    assertEqual(provider.handlePayloadCalls.length, 0,
        'LiveWebsocketProvider should ignore invalid JSON payloads before provider parsing runs');
}

function testHandleSocketMessageIgnoresNonTextFrames() {
    const provider = new TestLiveWebsocketProvider();

    provider._handleSocketMessage(Soup.WebsocketDataType.BINARY, createTextMessageBytes('{"ok":true}'));

    assertEqual(provider.handlePayloadCalls.length, 0,
        'LiveWebsocketProvider should ignore non-text websocket frames');
}

function testHandleSocketMessageCanResetReconnectWithoutEmittingQuotes() {
    const emittedQuotes = [];
    const provider = new TestLiveWebsocketProvider({onQuotes: quotesBySymbol => emittedQuotes.push(quotesBySymbol)});
    provider._reconnectAttempt = 2;
    provider.setHandlePayloadResult({resetReconnect: true});

    provider._handleSocketMessage(Soup.WebsocketDataType.TEXT, createTextMessageBytes('{"ok":true}'));

    assertEqual(provider._reconnectAttempt, 0,
        'LiveWebsocketProvider should reset reconnect state even when the provider payload emits no quotes');
    assertEqual(emittedQuotes.length, 0,
        'LiveWebsocketProvider should not emit quote callbacks when no quotes are present');
}

function testSharedMappingHelpersRemainAvailableThroughTheBaseClass() {
    const provider = new TestLiveWebsocketProvider();
    provider._tickers = [
        {liveSymbol: 'BTC/USD', symbol: 'btcusd'},
        {liveSymbol: 'ETH/USD', symbol: 'ethusd'},
        {liveSymbol: 'BTC/USD', symbol: 'btcusd'},
    ];

    assertDeepEqual(provider._getDesiredSymbols(), ['BTC/USD', 'ETH/USD'],
        'LiveWebsocketProvider should expose deduplicated desired symbol lists through the base helper');
    assertDeepEqual(Array.from(provider._getSymbolToTickerSymbolMap().entries()), [
        ['BTC/USD', 'BTCUSD'],
        ['ETH/USD', 'ETHUSD'],
    ],
    'LiveWebsocketProvider should expose a symbol-to-ticker lookup map through the base helper');
}

function testDisconnectMarksCurrentTickersStale() {
    const staleTickers = [];
    const provider = new TestLiveWebsocketProvider({onStale: tickers => staleTickers.push(tickers)});
    provider._running = true;
    provider._tickers = [{liveSymbol: 'BTC/USD', symbol: 'btcusd'}];

    provider._handleDisconnect();

    assertDeepEqual(staleTickers, [[{liveSymbol: 'BTC/USD', symbol: 'btcusd'}]],
        'LiveWebsocketProvider should report current tickers as stale when live transport disconnects');
    assertEqual(provider.scheduleReconnectCalls, 1,
        'LiveWebsocketProvider should still schedule reconnect after marking live tickers stale');
}

class TestLiveWebsocketProvider extends LiveWebsocketProvider {
    constructor({onQuotes = null, onStale = null} = {}) {
        super({uuid: 'test', onQuotes, onStale, filterTicker: ticker => Boolean(ticker?.liveSymbol)});
        this._nextHandlePayloadResult = null;
        this.handlePayloadCalls = [];
        this.disconnectCalls = 0;
        this.scheduleReconnectCalls = 0;
    }

    setHandlePayloadResult(result) {
        this._nextHandlePayloadResult = result;
    }

    _disconnectWebsocket() {
        this.disconnectCalls += 1;
    }

    _scheduleReconnect() {
        this.scheduleReconnectCalls += 1;
    }

    async _openConnection() {
        return null;
    }

    _subscribe() {
    }

    _handlePayload(payload) {
        this.handlePayloadCalls.push(payload);
        return this._nextHandlePayloadResult;
    }
}

function createTextMessageBytes(text) {
    return {
        get_data() {
            return new TextEncoder().encode(text);
        },
    };
}
