import {
    buildBatchQuoteUrl,
    buildLookupUrl,
    normalizeQuoteDate,
    parseBatchQuotes,
} from '../services/providers/stooq.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export function runTests() {
    assertEqual(buildLookupUrl('brk.b.us'),
        'https://stooq.com/q/l/?s=brk.b.us&f=sd2t2cp&i=d',
    'Stooq lookup URLs should preserve provider symbol punctuation');
    assertEqual(buildBatchQuoteUrl([{symbol: 'aapl.us'}, {symbol: 'msft.us'}]),
        'https://stooq.com/q/l/?s=aapl.us+msft.us&f=sd2t2cp&i=d',
    'Stooq batch URLs should join ticker symbols with provider-style plus separators');
    assertEqual(buildLookupUrl('brk.b.us+spy.us'),
        'https://stooq.com/q/l/?s=brk.b.us+spy.us&f=sd2t2cp&i=d',
    'Stooq lookup URLs should preserve plus separators for batched symbol requests');
    assertEqual(normalizeQuoteDate('2026-03-22'), '20260322',
        'Stooq quote dates should normalize into YYYYMMDD form');
    assertEqual(normalizeQuoteDate('N/D'), '',
        'Invalid Stooq quote dates should normalize to an empty string');

    const quotesBySymbol = parseBatchQuotes([
        'aapl.us,2026-03-22,21:00:00,210.5,205.1',
        'msft.us,2026-03-22,21:00:00,415.25,N/D',
    ].join('\n'), 2);
    assertDeepEqual(Array.from(quotesBySymbol.entries()), [
        ['AAPL.US', {price: 210.5, quoteDate: '20260322', previousClose: 205.1}],
        ['MSFT.US', {price: 415.25, quoteDate: '20260322', previousClose: null}],
    ], 'Stooq batch parsing should normalize symbols, dates, prices, and optional previous closes');

    const partialQuotesBySymbol = parseBatchQuotes([
        'aapl.us,2026-03-22,21:00:00,210.5,205.1',
        'bad.us,N/D,N/D,N/D,N/D',
        'msft.us,2026-03-22,21:00:00,415.25,410.1',
    ].join('\n'), [{symbol: 'aapl.us'}, {symbol: 'bad.us'}, {symbol: 'msft.us'}]);
    assertDeepEqual(Array.from(partialQuotesBySymbol.entries()), [
        ['AAPL.US', {price: 210.5, quoteDate: '20260322', previousClose: 205.1}],
        ['MSFT.US', {price: 415.25, quoteDate: '20260322', previousClose: 410.1}],
    ], 'Stooq batch parsing should salvage valid rows when one symbol has no quote data');

    const malformedQuotesBySymbol = parseBatchQuotes([
        'not-enough-fields',
        'aapl.us,2026-03-22,21:00:00,N/D,205.1',
    ].join('\n'), 2);
    assertDeepEqual(Array.from(malformedQuotesBySymbol.entries()), [],
        'Stooq batch parsing should skip malformed rows instead of throwing');

    assertDeepEqual(Array.from(parseBatchQuotes('', 2).entries()), [],
        'Stooq batch parsing should return no quotes for an empty response');
}
