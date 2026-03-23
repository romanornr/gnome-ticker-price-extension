import {
    buildTickerConfig,
    getCatalogMatches,
    getCryptoVerificationFailureMessage,
    getCryptoVerificationSuccessMessage,
    getSuggestionsDescription,
    resolveSelectedCryptoTicker,
    validateTickerDraft,
    validateTickerSymbol,
} from '../utils/prefs/ticker-dialog-state.js';
import {ASSET_CATEGORIES, CRYPTO_PROVIDERS, MARKET_TYPES} from '../utils/asset-categories.js';
import {assertEqual, assertTruthy} from './support/assert.js';

export function runTests() {
    const cryptoCatalog = [
        {
            label: 'BTC/USD',
            symbol: 'btcusd',
            liveSymbol: 'BTC/USD',
            priceDecimals: 0,
            assetCategory: ASSET_CATEGORIES.CRYPTO,
            marketType: MARKET_TYPES.ALWAYS_OPEN,
            cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
            keywords: ['btc', 'usd'],
        },
    ];

    assertEqual(validateTickerSymbol('abc def'), 'Symbol cannot contain spaces.',
        'Ticker symbols should reject whitespace');
    assertEqual(getSuggestionsDescription(ASSET_CATEGORIES.CRYPTO, CRYPTO_PROVIDERS.KRAKEN),
        'Search live Kraken WebSocket pairs. Non-crypto assets still use the built-in catalog.',
        'Crypto suggestion copy should reflect provider');

    const resolvedCryptoTicker = resolveSelectedCryptoTicker({assetCategory: ASSET_CATEGORIES.CRYPTO, cryptoCatalog, cryptoProvider: CRYPTO_PROVIDERS.KRAKEN, labelText: '', symbolText: 'BTC/USD'});
    assertTruthy(resolvedCryptoTicker, 'Exact crypto symbol matches should resolve');
    assertEqual(resolvedCryptoTicker.liveSymbol, 'BTC/USD',
        'Resolved crypto ticker should preserve live symbol');

    const matches = getCatalogMatches(
        ASSET_CATEGORIES.CRYPTO,
        'BTC',
        cryptoCatalog,
        CRYPTO_PROVIDERS.KRAKEN
    );
    assertEqual(matches.length, 1, 'Catalog matching should use the provided crypto catalog');

    assertEqual(validateTickerDraft('Label', 'btc/usd', {
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        cryptoCatalogLoading: false,
        cryptoCatalogError: '',
        resolvedCryptoTicker,
        hasCryptoCatalogMatches: true,
    }), '', 'Resolved crypto tickers should validate');

    const nextTicker = buildTickerConfig({
        initialTicker: {},
        labelText: '',
        symbolText: 'BTC/USD',
        priceDecimals: 0,
        panelSide: 'right',
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        resolvedCryptoTicker,
        cryptoCatalog,
    });
    assertEqual(nextTicker.symbol, 'btcusd', 'Built crypto configs should use normalized symbol');
    assertEqual(nextTicker.liveSymbol, 'BTC/USD', 'Built crypto configs should preserve live symbol');
    assertEqual(nextTicker.label, 'BTC/USD', 'Empty crypto labels should autofill from resolved ticker');

    assertEqual(getCryptoVerificationFailureMessage(CRYPTO_PROVIDERS.KRAKEN),
        'Choose a Kraken-supported pair before saving.',
        'Kraken verification failure copy should stay provider-specific');
    assertEqual(getCryptoVerificationSuccessMessage(CRYPTO_PROVIDERS.KRAKEN, 'BTC/USD'),
        'Verified BTC/USD. Kraken WebSocket supports this pair.',
        'Kraken verification success copy should stay provider-specific');
}
