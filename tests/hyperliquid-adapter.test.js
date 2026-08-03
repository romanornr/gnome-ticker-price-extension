import {
    createHyperliquidQuote,
} from '../utils/crypto-providers/hyperliquid/quotes.js';
import {
    isHyperliquidSpotSymbol,
    normalizeHyperliquidLiveSymbol,
    normalizeHyperliquidTickerSymbol,
    scoreHyperliquidCatalogEntry,
} from '../utils/crypto-providers/hyperliquid/symbols.js';
import {assertDeepEqual, assertEqual, assertTruthy} from './support/assert.js';

export function runTests() {
    assertEqual(normalizeHyperliquidLiveSymbol(' purr / usdc '), 'PURR/USDC',
        'Hyperliquid live symbols should normalize spot pair formatting');
    assertEqual(normalizeHyperliquidLiveSymbol(' btc '), 'BTC',
        'Hyperliquid perp symbols should normalize casing and whitespace');
    assertEqual(normalizeHyperliquidLiveSymbol('btc-perp!'), '',
        'Invalid Hyperliquid live symbols should be rejected');
    assertEqual(normalizeHyperliquidTickerSymbol(' purr / usdc '), 'purrusdc',
        'Hyperliquid ticker symbols should strip separators from normalized live symbols');
    assertEqual(isHyperliquidSpotSymbol(' purr / usdc '), true,
        'Spot-symbol detection should recognize slash-delimited Hyperliquid markets');
    assertEqual(isHyperliquidSpotSymbol(' btc '), false,
        'Spot-symbol detection should reject perp-style Hyperliquid markets');

    const perpEntry = {
        label: 'BTC Perp',
        symbol: 'btc',
        liveSymbol: 'BTC',
        base: 'BTC',
        quote: 'USD',
        keywords: ['BTC', 'perp', 'perpetual'],
        hyperliquidMarketType: 'perp',
    };
    const spotEntry = {
        label: 'BTC/USDC',
        symbol: 'btcusdc',
        liveSymbol: 'BTC/USDC',
        base: 'BTC',
        quote: 'USDC',
        keywords: ['BTC', 'spot'],
        hyperliquidMarketType: 'spot',
    };

    assertTruthy(
        scoreHyperliquidCatalogEntry(perpEntry, 'btc') > scoreHyperliquidCatalogEntry(spotEntry, 'btc'),
        'Hyperliquid scoring should slightly prefer perps for exact base-asset queries'
    );
    assertTruthy(
        scoreHyperliquidCatalogEntry(spotEntry, 'btc/usdc') > scoreHyperliquidCatalogEntry(spotEntry, 'btc'),
        'Exact Hyperliquid live-symbol matches should outrank broader base queries'
    );

    const quoteWithProviderPreviousClose = createHyperliquidQuote({
        ctx: {
            midPx: '123.45',
            prevDayPx: '120.00',
        },
    });
    assertTruthy(/^\d{8}$/.test(quoteWithProviderPreviousClose.quoteDate),
        'Hyperliquid quote normalization should emit YYYYMMDD quote dates');
    assertDeepEqual({
        price: quoteWithProviderPreviousClose.price,
        previousClose: quoteWithProviderPreviousClose.previousClose,
    }, {
        price: 123.45,
        previousClose: 120,
    }, 'Hyperliquid quote normalization should prefer mid price and provider previous close when available');

    assertDeepEqual(createHyperliquidQuote({
        ctx: {
            markPx: '98.25',
            prevDayPx: '0',
        },
    }, 97.5), {
        price: 98.25,
        quoteDate: createHyperliquidQuote({
            ctx: {
                markPx: '98.25',
            },
        }, 97.5).quoteDate,
        previousClose: 97.5,
    }, 'Hyperliquid quote normalization should fall back to mark price and cached previous close');

    assertEqual(createHyperliquidQuote({ctx: {}}), null,
        'Hyperliquid quote normalization should reject payloads without any finite price');
}
