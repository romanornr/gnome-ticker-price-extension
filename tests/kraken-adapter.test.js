import {
    buildKrakenTickerUrl,
    createKrakenQuote,
    normalizeKrakenLiveSymbol,
    normalizeKrakenTickerSymbol,
    parseKrakenTickerQuotes,
    scoreKrakenCatalogEntry,
} from '../utils/crypto-providers/kraken-adapter.js';
import {assertDeepEqual, assertEqual, assertTruthy} from './support/assert.js';

export function runTests() {
    assertEqual(normalizeKrakenLiveSymbol(' btc / usd '), 'BTC/USD',
        'Kraken live symbols should normalize whitespace and casing');
    assertEqual(normalizeKrakenLiveSymbol('btc-usd'), '',
        'Invalid Kraken live symbols should be rejected');
    assertEqual(normalizeKrakenTickerSymbol(' btc / usd '), 'btcusd',
        'Kraken ticker symbols should compact normalized pair ids');

    const btcUsdEntry = {
        label: 'BTC/USD',
        symbol: 'btcusd',
        liveSymbol: 'BTC/USD',
        base: 'BTC',
        quote: 'USD',
    };
    const btcEurEntry = {
        label: 'BTC/EUR',
        symbol: 'btceur',
        liveSymbol: 'BTC/EUR',
        base: 'BTC',
        quote: 'EUR',
    };

    assertTruthy(
        scoreKrakenCatalogEntry(btcUsdEntry, 'btc/usd') > scoreKrakenCatalogEntry(btcUsdEntry, 'btc'),
        'Exact Kraken pair matches should outrank broader base-asset queries'
    );
    assertTruthy(
        scoreKrakenCatalogEntry(btcUsdEntry, 'btc') > scoreKrakenCatalogEntry(btcEurEntry, 'btc'),
        'Kraken quote-priority scoring should prefer USD over lower-priority quotes'
    );

    assertDeepEqual(createKrakenQuote({
        last: '104321.50',
        timestamp: '2026-03-22T12:34:56.789Z',
        change: '321.5',
        change_pct: '0.3',
    }), {
        price: 104321.5,
        quoteDate: '20260322',
        previousClose: 104000,
    }, 'Kraken quote normalization should derive price, date, and previous close from ticker payloads');

    assertEqual(createKrakenQuote({
        last: '104321.50',
        timestamp: 'invalid',
    }), null, 'Kraken quote normalization should reject payloads without a valid quote date');

    assertEqual(buildKrakenTickerUrl(['BTC/USD', 'ETH/USD']),
        'https://api.kraken.com/0/public/Ticker?pair=BTC%2FUSD,ETH%2FUSD',
        'Kraken REST ticker URLs should batch encoded websocket pair names');

    assertDeepEqual(Array.from(parseKrakenTickerQuotes({
        error: [],
        result: {
            'BTC/USD': {c: ['61751.3', '0.01'], o: '59964.3'},
            'ETH/USD': {c: ['not-a-price'], o: '1600'},
            'SOL/USD': {c: ['150.5'], o: '0'},
        },
    }, '2026-07-02T10:00:00Z').entries()), [
        ['BTC/USD', {price: 61751.3, quoteDate: '20260702', previousClose: 59964.3}],
        ['SOL/USD', {price: 150.5, quoteDate: '20260702', previousClose: null}],
    ], 'Kraken REST ticker parsing should normalize valid rows and skip unparseable prices');

    let restErrorMessage = '';
    try {
        parseKrakenTickerQuotes({error: ['EQuery:Unknown asset pair']}, '2026-07-02T10:00:00Z');
    } catch (error) {
        restErrorMessage = error.message;
    }
    assertEqual(restErrorMessage, 'Kraken ticker request failed: EQuery:Unknown asset pair',
        'Kraken REST ticker parsing should surface provider errors so fallbacks mark tickers stale');
}
