import GLib from 'gi://GLib';

import {
    mapSymbolToCnbc,
    parseFxPairSymbol,
    toUsdPerUnit,
} from '../services/providers/cnbc-symbols.js';
import {
    buildQuoteUrl,
    deriveDxyQuote,
    deriveFxQuote,
    normalizeQuoteDate,
    parseQuoteNumber,
    parseRestQuoteResponse,
    refresh,
} from '../services/providers/cnbc.js';
import {verifySymbol} from '../services/providers/rest-quotes.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export async function runTests() {
    const mappingCases = [
        ['aapl.us', 'AAPL', 'US symbols should map to bare uppercase tickers'],
        ['brk-b.us', 'BRK.B', 'US class shares should convert dashes into CNBC dot notation'],
        ['abn.nl', 'ABN-NL', 'Netherlands symbols should map to the -NL suffix'],
        ['bmw.de', 'BMW-DE', 'Germany symbols should map to the -DE suffix'],
        ['azn.uk', 'AZN-GB', 'UK symbols should map to the -GB suffix'],
        ['ba.uk', 'BA.-GB', 'Two-letter LSE tickers should carry their trailing dot'],
        ['ng.uk', 'NG.-GB', 'Two-letter LSE tickers should carry their trailing dot consistently'],
        ['7203.jp', '7203.T', 'Japan symbols should map to the .T suffix'],
        ['1.hk', '0001.HK', 'Hong Kong symbols should zero-pad to four digits'],
        ['700.hk', '0700.HK', 'Hong Kong symbols should zero-pad shorter tickers'],
        ['600519.cn', '600519.SS', 'Shanghai-listed symbols should map to the .SS suffix'],
        ['000001.cn', '000001.SZ', 'Shenzhen-listed symbols should map to the .SZ suffix'],
        ['300750.cn', '300750.SZ', 'ChiNext symbols should map to the .SZ suffix'],
        ['gc.f', '@GC.1', 'Futures symbols should map through the override table'],
        ['zn.f', '@LZN.1', 'Zinc futures should map to LME zinc rather than treasury futures'],
        ['dx.f', null, 'The dollar index should not map to a direct CNBC symbol'],
        ['xagusd', 'XAG=', 'Spot silver should map to the CNBC spot metal symbol'],
        ['^spx', '.SPX', 'Index symbols should map through the override table'],
        ['unknown.xx', null, 'Unknown market suffixes should not map'],
        ['', null, 'Empty symbols should not map'],
    ];
    mappingCases.forEach(([symbol, expected, message]) => assertEqual(mapSymbolToCnbc(symbol), expected, message));

    assertDeepEqual(parseFxPairSymbol('eurusd'), {baseCurrency: 'EUR', quoteCurrency: 'USD'},
        'FX pair symbols should split into catalog currency codes');
    assertDeepEqual(parseFxPairSymbol('audjpy'), {baseCurrency: 'AUD', quoteCurrency: 'JPY'},
        'FX cross pairs should split into catalog currency codes');
    assertEqual(parseFxPairSymbol('xagusd'), null,
        'Spot metals should not parse as FX pairs');
    assertEqual(parseFxPairSymbol('eureur'), null,
        'Same-currency pairs should not parse as FX pairs');
    assertEqual(parseFxPairSymbol('aapl.us'), null,
        'Equity symbols should not parse as FX pairs');

    assertEqual(toUsdPerUnit('EUR', 1.25), 1.25,
        'USD-quoted currencies should pass their spot rate through');
    assertEqual(toUsdPerUnit('JPY', 125), 1 / 125,
        'USD-base currencies should invert their spot rate');
    assertEqual(toUsdPerUnit('USD', null), 1,
        'USD should anchor the vector at one');
    assertEqual(toUsdPerUnit('JPY', 0), null,
        'Non-positive spot rates should not produce a rate');

    assertEqual(buildQuoteUrl(['AAPL', '@GC.1', 'EUR=', 'BA.-GB']),
        'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol'
        + '?symbols=AAPL|%40GC.1|EUR=|BA.-GB&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1',
    'CNBC quote URLs should batch symbols with pipes and keep = and | unencoded');

    assertEqual(normalizeQuoteDate('2026-07-31'), '20260731',
        'Bare CNBC quote dates should normalize into YYYYMMDD form');
    assertEqual(normalizeQuoteDate('2026-08-02T20:47:06.492-0400'), '20260802',
        'ISO timestamp quote dates should normalize into YYYYMMDD form');
    assertEqual(normalizeQuoteDate('N/A'), '',
        'Invalid CNBC quote dates should normalize to an empty string');

    assertEqual(parseQuoteNumber('4,118.90'), 4118.9,
        'CNBC prices should parse with thousands separators removed');
    assertEqual(parseQuoteNumber('308.91'), 308.91,
        'Plain CNBC prices should parse directly');
    assertEqual(parseQuoteNumber(''), null,
        'Empty CNBC prices should parse to null');
    assertEqual(parseQuoteNumber(null), null,
        'Missing CNBC prices should parse to null');

    const parsedQuotes = parseRestQuoteResponse(buildQuotePayload([
        {symbol: 'AAPL', last: '308.91', last_time: '2026-07-31', previous_day_closing: '333.43'},
        {symbol: '@GC.1', last: '4,118.90', last_time: '2026-08-02T20:47:06.492-0400'},
        {symbol: 'BAD-NL', code: 1},
        {symbol: 'NOPRICE', last: '', last_time: '2026-07-31'},
    ]));
    assertDeepEqual(Array.from(parsedQuotes.entries()), [
        ['AAPL', {price: 308.91, quoteDate: '20260731', previousClose: 333.43}],
        ['@GC.1', {price: 4118.9, quoteDate: '20260802', previousClose: null}],
    ], 'CNBC batch parsing should normalize prices and dates while skipping unusable entries');

    assertDeepEqual(Array.from(parseRestQuoteResponse({}).entries()), [],
        'CNBC batch parsing should return no quotes for an empty response');
    assertDeepEqual(Array.from(parseRestQuoteResponse(buildQuotePayload({
        symbol: 'AAPL', last: '308.91', last_time: '2026-07-31',
    })).entries()), [
        ['AAPL', {price: 308.91, quoteDate: '20260731', previousClose: null}],
    ], 'CNBC batch parsing should accept a single-object FormattedQuote payload');

    const fxVector = new Map([
        ['EUR=', {price: 1.25, quoteDate: '20260731', previousClose: 1.2}],
        ['JPY=', {price: 125, quoteDate: '20260801', previousClose: 120}],
    ]);
    assertDeepEqual(deriveFxQuote({baseCurrency: 'EUR', quoteCurrency: 'USD'}, fxVector),
        {price: 1.25, quoteDate: '20260731', previousClose: 1.2},
        'USD-quoted FX pairs should derive directly from their spot leg');
    assertDeepEqual(deriveFxQuote({baseCurrency: 'USD', quoteCurrency: 'JPY'}, fxVector),
        {price: 125, quoteDate: '20260801', previousClose: 120},
        'USD-base FX pairs should invert their spot leg');
    assertDeepEqual(deriveFxQuote({baseCurrency: 'EUR', quoteCurrency: 'JPY'}, fxVector),
        {price: 1.25 * 125, quoteDate: '20260801', previousClose: 1.2 * 120},
        'FX cross pairs should derive from both legs and date from the freshest leg');
    assertEqual(deriveFxQuote({baseCurrency: 'EUR', quoteCurrency: 'CHF'}, fxVector), null,
        'FX pairs with a missing leg should not derive a quote');

    const dxyVector = new Map([
        ['EUR=', {price: 1.1553, quoteDate: '20260804', previousClose: 1.1555}],
        ['JPY=', {price: 157.62, quoteDate: '20260805', previousClose: 157.55}],
        ['GBP=', {price: 1.3464, quoteDate: '20260804', previousClose: 1.346}],
        ['CAD=', {price: 1.4011, quoteDate: '20260804', previousClose: 1.4015}],
        ['SEK=', {price: 9.4832, quoteDate: '20260804', previousClose: 9.49}],
        ['CHF=', {price: 0.8067, quoteDate: '20260804', previousClose: 0.807}],
    ]);
    const dxyQuote = deriveDxyQuote(dxyVector);
    assertEqual(Math.abs(dxyQuote.price - 99.676) / 99.676 <= 0.0001, true,
        'DXY should derive within 0.01% of the recorded CNBC level');
    assertEqual(dxyQuote.previousClose.toFixed(6), '99.674515',
        'DXY previous close should derive from every spot leg previous close');
    assertEqual(dxyQuote.quoteDate, '20260805',
        'DXY should use the freshest contributing spot-leg date');

    const incompleteDxyVector = new Map(dxyVector);
    incompleteDxyVector.delete('SEK=');
    assertEqual(deriveDxyQuote(incompleteDxyVector), null,
        'DXY should not derive a partial quote when a basket leg is missing');

    const invalidDxyVector = new Map(dxyVector);
    invalidDxyVector.set('SEK=', {...invalidDxyVector.get('SEK='), price: Number.NaN});
    assertEqual(deriveDxyQuote(invalidDxyVector), null,
        'DXY should not derive a quote from a non-finite basket leg');

    const refreshSession = new FakeSession(buildQuotePayload([
        {symbol: 'AAPL', last: '308.91', last_time: '2026-07-31', previous_day_closing: '333.43'},
        {symbol: 'EUR=', last: '1.25', last_time: '2026-07-31', previous_day_closing: '1.20'},
        {symbol: 'MISSING-NL', code: 1},
    ]));
    const refreshedQuotes = await refresh([
        {symbol: 'aapl.us'},
        {symbol: 'eurusd'},
        {symbol: 'missing.nl'},
    ], {session: refreshSession});
    assertDeepEqual(Array.from(refreshedQuotes.entries()), [
        ['AAPL.US', {price: 308.91, quoteDate: '20260731', previousClose: 333.43}],
        ['EURUSD', {price: 1.25, quoteDate: '20260731', previousClose: 1.2}],
    ], 'CNBC refresh should key normalized quotes by ticker symbol and salvage partial batches');
    assertEqual(refreshSession.requestedUrls.length, 1,
        'CNBC refresh should batch direct symbols and FX legs into one request');
    assertEqual(refreshSession.requestedUrls[0].includes('AAPL|EUR='), true,
        'CNBC refresh should request direct symbols alongside FX spot legs');

    const dxyRefreshSession = new FakeSession(buildQuotePayload([
        {symbol: 'EUR=', last: '1.1553', last_time: '2026-08-05', previous_day_closing: '1.1555'},
        {symbol: 'JPY=', last: '157.62', last_time: '2026-08-05', previous_day_closing: '157.55'},
        {symbol: 'GBP=', last: '1.3464', last_time: '2026-08-05', previous_day_closing: '1.3460'},
        {symbol: 'CAD=', last: '1.4011', last_time: '2026-08-05', previous_day_closing: '1.4015'},
        {symbol: 'SEK=', last: '9.4832', last_time: '2026-08-05', previous_day_closing: '9.4900'},
        {symbol: 'CHF=', last: '0.8067', last_time: '2026-08-05', previous_day_closing: '0.8070'},
    ]));
    const refreshedDxy = await refresh([{symbol: 'dx.f'}], {session: dxyRefreshSession});
    assertEqual(refreshedDxy.has('DX.F'), true,
        'CNBC refresh should assemble DXY under its normalized saved symbol');
    assertEqual(dxyRefreshSession.requestedUrls.length, 1,
        'DXY refresh should fetch its six spot legs in one batch');
    assertEqual(['EUR=', 'JPY=', 'GBP=', 'CAD=', 'SEK=', 'CHF=']
        .every(legSymbol => dxyRefreshSession.requestedUrls[0].includes(legSymbol)), true,
        'DXY refresh should put all six spot legs into the request batch');
    assertEqual(dxyRefreshSession.requestedUrls.some(url => url.includes('.DXY')), false,
        'DXY refresh should not request the direct CNBC index symbol');

    assertDeepEqual(Array.from((await refresh([], {session: refreshSession})).entries()), [],
        'CNBC refresh should return no quotes when no tickers are requested');

    const verifySession = new FakeSession(buildQuotePayload([
        {symbol: 'ASML-NL', last: '1,434.20', last_time: '2026-07-31'},
    ]));
    assertDeepEqual(await verifySymbol(verifySession, 'ASML.NL'),
        {symbol: 'asml.nl', quoteDate: '2026-07-31'},
        'CNBC verification should resolve mapped symbols and format the quote date');

    const verifyFxSession = new FakeSession(buildQuotePayload([
        {symbol: 'EUR=', last: '1.25', last_time: '2026-07-31'},
        {symbol: 'JPY=', last: '125', last_time: '2026-07-31'},
    ]));
    assertDeepEqual(await verifySymbol(verifyFxSession, 'eurjpy'),
        {symbol: 'eurjpy', quoteDate: '2026-07-31'},
        'CNBC verification should derive FX pairs from their spot legs');

    assertDeepEqual(await verifySymbol(dxyRefreshSession, 'dx.f'),
        {symbol: 'dx.f', quoteDate: '2026-08-05'},
        'CNBC verification should derive the saved DXY symbol from its basket');

    await assertVerifyRejects(new FakeSession(buildQuotePayload([{symbol: 'NOPE-NL', code: 1}])), 'nope.nl',
        'Could not verify nope.nl. No quote data was returned by CNBC.',
        'CNBC verification should fail when no quote data is returned');
    await assertVerifyRejects(new FakeSession(buildQuotePayload([])), 'bad.xx',
        'Could not verify bad.xx. The symbol format is not supported.',
        'CNBC verification should fail for unsupported symbol formats');
}

/* Verification failures surface their message directly in the prefs dialog, so tests pin the exact text. */
async function assertVerifyRejects(session, symbol, expectedMessage, message) {
    let caughtMessage = '';
    try {
        await verifySymbol(session, symbol);
    } catch (error) {
        caughtMessage = error.message;
    }
    assertEqual(caughtMessage, expectedMessage, message);
}

function buildQuotePayload(quotes) {
    return {FormattedQuoteResult: {FormattedQuote: quotes}};
}

class FakeSession {
    constructor(payload) {
        this.bytes = GLib.Bytes.new(new TextEncoder().encode(JSON.stringify(payload)));
        this.requestedUrls = [];
    }

    send_and_read_async(message, _priority, _cancellable, callback) {
        this.requestedUrls.push(message.get_uri().to_string());
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            callback(this, {});
            return GLib.SOURCE_REMOVE;
        });
    }

    send_and_read_finish(_result) {
        return this.bytes;
    }
}
