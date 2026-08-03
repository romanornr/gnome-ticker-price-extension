import GLib from 'gi://GLib';

import {ASSET_CATEGORIES} from '../utils/asset-categories.js';
import {
    mapSymbolToNasdaq,
    normalizeTradeTimestamp,
    ownsFallbackTicker,
    parseNasdaqNumber,
    parseQuoteResponse,
} from '../services/providers/nasdaq.js';
import {
    deriveFxQuotes,
    normalizeUpdateTimestamp,
} from '../services/providers/open-er-api.js';
import {
    refresh as refreshRestQuotes,
    verifySymbol as verifyRestSymbol,
} from '../services/providers/rest-quotes.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export async function runTests() {
    assertEqual(mapSymbolToNasdaq('aapl.us'), 'AAPL',
        'Nasdaq mapping should produce bare uppercase tickers');
    assertEqual(mapSymbolToNasdaq('brk-b.us'), 'BRK.B',
        'Nasdaq mapping should convert dashes into dot notation');
    assertEqual(mapSymbolToNasdaq('asml.nl'), null,
        'Nasdaq mapping should reject non-US symbols');

    assertEqual(ownsFallbackTicker({symbol: 'aapl.us', assetCategory: ASSET_CATEGORIES.EQUITY}), true,
        'Nasdaq fallback should own US equities');
    assertEqual(ownsFallbackTicker({symbol: 'spy.us', assetCategory: ASSET_CATEGORIES.ETF}), true,
        'Nasdaq fallback should own US ETFs');
    assertEqual(ownsFallbackTicker({symbol: 'bar.us', assetCategory: ASSET_CATEGORIES.COMMODITY}), true,
        'Nasdaq fallback should own US-listed commodity ETFs');
    assertEqual(ownsFallbackTicker({symbol: 'asml.nl', assetCategory: ASSET_CATEGORIES.EQUITY}), false,
        'Nasdaq fallback should never own foreign listings');
    assertEqual(ownsFallbackTicker({symbol: 'eurusd', assetCategory: ASSET_CATEGORIES.FX}), false,
        'Nasdaq fallback should never own FX pairs');

    assertEqual(parseNasdaqNumber('$1,234.56'), 1234.56,
        'Nasdaq numbers should parse with currency signs and separators removed');
    assertEqual(parseNasdaqNumber('+9.205'), 9.205,
        'Signed Nasdaq net changes should parse directly');
    assertEqual(parseNasdaqNumber('N/A'), null,
        'Non-numeric Nasdaq values should parse to null');

    assertEqual(normalizeTradeTimestamp('Aug 3, 2026 12:27 PM ET'), '20260803',
        'Nasdaq trade timestamps should normalize into YYYYMMDD form');
    assertEqual(normalizeTradeTimestamp('Dec 31, 2025'), '20251231',
        'Date-only Nasdaq timestamps should normalize into YYYYMMDD form');
    assertEqual(normalizeTradeTimestamp('soon'), '',
        'Invalid Nasdaq timestamps should normalize to an empty string');

    assertDeepEqual(parseQuoteResponse({data: {primaryData: {
        lastSalePrice: '$100.5', netChange: '+0.5', lastTradeTimestamp: 'Aug 3, 2026 12:27 PM ET',
    }}}), {price: 100.5, quoteDate: '20260803', previousClose: 100},
    'Nasdaq quotes should reconstruct previous close from last price and net change');
    assertDeepEqual(parseQuoteResponse({data: {primaryData: {
        lastSalePrice: '$100.5', netChange: 'UNCH', lastTradeTimestamp: 'Aug 3, 2026 12:27 PM ET',
    }}}), {price: 100.5, quoteDate: '20260803', previousClose: null},
    'Nasdaq quotes without a numeric net change should omit previous close');
    assertEqual(parseQuoteResponse({data: null, status: {rCode: 400}}), null,
        'Nasdaq error envelopes should parse to no quote');

    assertEqual(normalizeUpdateTimestamp(1785715352), '20260803',
        'Rate table unix timestamps should normalize into YYYYMMDD form');
    assertEqual(normalizeUpdateTimestamp(null), '',
        'Missing rate table timestamps should normalize to an empty string');

    const rateTable = {result: 'success', time_last_update_unix: 1785715352, rates: {USD: 1, EUR: 0.8, JPY: 160}};
    const fxRequests = [
        {storeKey: 'EURUSD', fxPair: {baseCurrency: 'EUR', quoteCurrency: 'USD'}},
        {storeKey: 'USDJPY', fxPair: {baseCurrency: 'USD', quoteCurrency: 'JPY'}},
        {storeKey: 'EURJPY', fxPair: {baseCurrency: 'EUR', quoteCurrency: 'JPY'}},
        {storeKey: 'EURCHF', fxPair: {baseCurrency: 'EUR', quoteCurrency: 'CHF'}},
    ];
    assertDeepEqual(Array.from(deriveFxQuotes(rateTable, fxRequests).entries()), [
        ['EURUSD', {price: 1.25, quoteDate: '20260803', previousClose: null}],
        ['USDJPY', {price: 160, quoteDate: '20260803', previousClose: null}],
        ['EURJPY', {price: 200, quoteDate: '20260803', previousClose: null}],
    ], 'Rate table FX derivation should cover every pair with known rates and skip unknown ones');
    assertDeepEqual(Array.from(deriveFxQuotes({result: 'error'}, fxRequests).entries()), [],
        'Failed rate table responses should derive no quotes');

    /* Orchestrator: a fully successful CNBC pass must issue no fallback requests. */
    const fullTickers = [{symbol: 'aapl.us', assetCategory: ASSET_CATEGORIES.EQUITY}];
    const fullSession = new RoutingFakeSession([
        ['quote.cnbc.com', cnbcPayload([{symbol: 'AAPL', last: '100.5', last_time: '2026-08-03', previous_day_closing: '100'}])],
    ]);
    const fullQuotes = await refreshRestQuotes(fullTickers, {session: fullSession});
    assertEqual(fullQuotes.get('AAPL.US').price, 100.5,
        'REST refresh should serve quotes from the CNBC primary');
    assertEqual(fullSession.requestedUrls.some(url => !url.includes('quote.cnbc.com')), false,
        'A fully successful CNBC pass should issue no fallback requests');

    /* Orchestrator: CNBC misses split across both fallbacks. */
    const mixedTickers = [
        {symbol: 'aapl.us', assetCategory: ASSET_CATEGORIES.EQUITY},
        {symbol: 'spy.us', assetCategory: ASSET_CATEGORIES.ETF},
        {symbol: 'eurusd', assetCategory: ASSET_CATEGORIES.FX},
    ];
    const mixedSession = new RoutingFakeSession([
        ['quote.cnbc.com', cnbcPayload([{symbol: 'AAPL', last: '100.5', last_time: '2026-08-03'}])],
        ['api.nasdaq.com', {data: {primaryData: {lastSalePrice: '$750', netChange: '+10', lastTradeTimestamp: 'Aug 3, 2026 12:27 PM ET'}}}],
        ['open.er-api.com', rateTable],
    ]);
    /* Fallbacks resolve concurrently, so quote map insertion order is not part of the contract. */
    const mixedQuotes = await refreshRestQuotes(mixedTickers, {session: mixedSession});
    assertDeepEqual(Array.from(mixedQuotes.entries()).sort(), [
        ['AAPL.US', {price: 100.5, quoteDate: '20260803', previousClose: null}],
        ['EURUSD', {price: 1.25, quoteDate: '20260803', previousClose: null}],
        ['SPY.US', {price: 750, quoteDate: '20260803', previousClose: 740}],
    ], 'CNBC misses should recover through the Nasdaq and rate table fallbacks');

    /* Orchestrator: total CNBC failure with working fallbacks returns partial results. */
    const partialSession = new RoutingFakeSession([
        ['quote.cnbc.com', new Error('cnbc down')],
        ['api.nasdaq.com/api/quote/AAPL/', {data: {primaryData: {lastSalePrice: '$300', netChange: '+1', lastTradeTimestamp: 'Aug 3, 2026 12:27 PM ET'}}}],
        ['api.nasdaq.com/api/quote/SPY/', {data: {primaryData: {lastSalePrice: '$750', netChange: '+10', lastTradeTimestamp: 'Aug 3, 2026 12:27 PM ET'}}}],
        ['open.er-api.com', rateTable],
    ]);
    const partialQuotes = await refreshRestQuotes(mixedTickers, {session: partialSession});
    assertDeepEqual(Array.from(partialQuotes.entries()).sort(), [
        ['AAPL.US', {price: 300, quoteDate: '20260803', previousClose: 299}],
        ['EURUSD', {price: 1.25, quoteDate: '20260803', previousClose: null}],
        ['SPY.US', {price: 750, quoteDate: '20260803', previousClose: 740}],
    ], 'A dead CNBC endpoint should still yield every fallback-covered quote with its own symbol values');

    /* Orchestrator: nothing recoverable rethrows the primary error. */
    let thrownMessage = '';
    try {
        await refreshRestQuotes([{symbol: 'asml.nl', assetCategory: ASSET_CATEGORIES.EQUITY}], {
            session: new RoutingFakeSession([['quote.cnbc.com', new Error('cnbc down')]]),
        });
    } catch (error) {
        thrownMessage = error.message;
    }
    assertEqual(thrownMessage, 'cnbc down',
        'A dead CNBC endpoint with no applicable fallback should rethrow the primary error');

    /* Verification: the primary answers, so no fallback request is issued. */
    const verifyPrimarySession = new RoutingFakeSession([
        ['quote.cnbc.com', cnbcPayload([{symbol: 'AAPL', last: '100.5', last_time: '2026-08-03'}])],
    ]);
    assertDeepEqual(await verifyRestSymbol(verifyPrimarySession, 'aapl.us', ASSET_CATEGORIES.EQUITY),
        {symbol: 'aapl.us', quoteDate: '2026-08-03'},
        'Verification should resolve through the CNBC primary');
    assertEqual(verifyPrimarySession.requestedUrls.some(url => url.includes('nasdaq')), false,
        'Verification should not call a fallback when the primary answers');

    /* Verification parity: a symbol CNBC misses must still verify if the panel would show it. */
    const verifyFallbackSession = new RoutingFakeSession([
        ['quote.cnbc.com', cnbcPayload([{symbol: 'SPY', code: 1}])],
        ['api.nasdaq.com', {data: {primaryData: {lastSalePrice: '$750', netChange: '+10', lastTradeTimestamp: 'Aug 3, 2026 12:27 PM ET'}}}],
    ]);
    assertDeepEqual(await verifyRestSymbol(verifyFallbackSession, 'spy.us', ASSET_CATEGORIES.ETF),
        {symbol: 'spy.us', quoteDate: '2026-08-03'},
        'Verification should fall back to Nasdaq when CNBC has no quote');

    /* An FX pair CNBC cannot price still verifies through the rate table. */
    const verifyFxSession = new RoutingFakeSession([
        ['quote.cnbc.com', cnbcPayload([])],
        ['open.er-api.com', rateTable],
    ]);
    assertDeepEqual(await verifyRestSymbol(verifyFxSession, 'eurjpy', ASSET_CATEGORIES.FX),
        {symbol: 'eurjpy', quoteDate: '2026-08-03'},
        'Verification should fall back to the FX rate table when CNBC has no spot legs');

    /* Without an asset category, Nasdaq cannot pick an asset class and must not answer. */
    const verifyNoCategorySession = new RoutingFakeSession([
        ['quote.cnbc.com', cnbcPayload([{symbol: 'SPY', code: 1}])],
        ['api.nasdaq.com', {data: {primaryData: {lastSalePrice: '$750', netChange: '+10', lastTradeTimestamp: 'Aug 3, 2026 12:27 PM ET'}}}],
    ]);
    let noCategoryMessage = '';
    try {
        await verifyRestSymbol(verifyNoCategorySession, 'spy.us');
    } catch (error) {
        noCategoryMessage = error.message;
    }
    assertEqual(noCategoryMessage, 'Could not verify spy.us. No quote data was returned by CNBC.',
        'Verification without an asset category should surface the primary error rather than guess a Nasdaq asset class');

    /* A genuinely unknown symbol still reports the primary provider's message. */
    const verifyUnknownSession = new RoutingFakeSession([
        ['quote.cnbc.com', cnbcPayload([{symbol: 'ZZZQ-NL', code: 1}])],
    ]);
    let unknownMessage = '';
    try {
        await verifyRestSymbol(verifyUnknownSession, 'zzzq.nl', ASSET_CATEGORIES.EQUITY);
    } catch (error) {
        unknownMessage = error.message;
    }
    assertEqual(unknownMessage, 'Could not verify zzzq.nl. No quote data was returned by CNBC.',
        'Verification failures should keep the primary provider message users already see');
}

function cnbcPayload(quotes) {
    return {FormattedQuoteResult: {FormattedQuote: quotes}};
}

/* Routes each request to a payload (or error) by URL substring, mirroring the multi-endpoint fallback flow. */
class RoutingFakeSession {
    constructor(routes) {
        this.routes = routes;
        this.requestedUrls = [];
    }

    send_and_read_async(message, _priority, _cancellable, callback) {
        const url = message.get_uri().to_string();
        this.requestedUrls.push(url);
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            callback(this, url);
            return GLib.SOURCE_REMOVE;
        });
    }

    send_and_read_finish(url) {
        const route = this.routes.find(([needle]) => url.includes(needle));
        if (!route)
            throw new Error(`No fake route for ${url}`);
        if (route[1] instanceof Error)
            throw route[1];

        return GLib.Bytes.new(new TextEncoder().encode(JSON.stringify(route[1])));
    }
}
