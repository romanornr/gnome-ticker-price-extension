import {
    buildTickerConfig,
    getCatalogMatches,
    getCatalogSearchQuery,
    getSuggestionsDescription,
    resolveSelectedCryptoTicker,
    validateTickerDraft,
    validateTickerSymbol,
} from '../utils/prefs/ticker-dialog-state.js';
import {
    ASSET_CATEGORIES,
    CRYPTO_PROVIDERS,
    getTickerMarketSessionOptions,
    getTickerMarketSessionPolicy,
} from '../utils/asset-categories.js';
import {MARKET_SESSION_IDS} from '../utils/market-sessions.js';
import {assertEqual, assertTruthy} from './support/assert.js';

export function runTests() {
    const cryptoCatalog = [
        {
            label: 'BTC/USD',
            symbol: 'btcusd',
            liveSymbol: 'BTC/USD',
            priceDecimals: 0,
            assetCategory: ASSET_CATEGORIES.CRYPTO,
            marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
            cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
            keywords: ['btc', 'usd'],
        },
    ];

    assertEqual(validateTickerSymbol('abc def'), 'Symbols cannot contain spaces.',
        'Ticker symbols should reject whitespace');
    assertEqual(getCatalogSearchQuery('  Apple  '), 'Apple',
        'Catalog search should trim the dedicated search field');
    assertEqual(getSuggestionsDescription(ASSET_CATEGORIES.EQUITY, CRYPTO_PROVIDERS.KRAKEN),
        'Search the built-in catalog above, then choose a match to fill the ticker fields.',
        'Non-crypto suggestion copy should point to the dedicated catalog search field');
    assertEqual(getSuggestionsDescription(ASSET_CATEGORIES.CRYPTO, CRYPTO_PROVIDERS.KRAKEN),
        'Search live Kraken WebSocket pairs. Non-crypto assets still use the built-in catalog.',
        'Crypto suggestion copy should reflect provider');
    assertEqual(validateTickerDraft('', 'aapl.us', {assetCategory: ASSET_CATEGORIES.EQUITY}), 'Enter a name.',
        'Non-crypto validation should refer to the visible name field');

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

    const curatedFallbackMatches = getCatalogMatches(
        ASSET_CATEGORIES.CRYPTO,
        'BTC',
        null,
        CRYPTO_PROVIDERS.KRAKEN
    );
    assertEqual(curatedFallbackMatches.length, 1,
        'Missing runtime crypto catalogs should fall back to curated seed entries');
    assertEqual(curatedFallbackMatches[0].marketSessionId, MARKET_SESSION_IDS.ALWAYS_OPEN,
        'Curated catalog entries should expose the current market-session vocabulary');
    assertEqual(Object.prototype.hasOwnProperty.call(curatedFallbackMatches[0], 'marketType'), false,
        'Curated catalog entries should not leak the legacy marketType field');

    assertEqual(validateTickerDraft('Label', 'btc/usd', {
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        cryptoCatalogLoading: false,
        cryptoCatalogError: '',
        resolvedCryptoTicker,
        hasCryptoCatalogMatches: true,
    }), '', 'Resolved crypto tickers should validate');
    assertEqual(validateTickerDraft('', 'unknown/usd', {
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        resolvedCryptoTicker: null,
        hasCryptoCatalogMatches: false,
    }), 'Choose a Kraken-supported crypto pair.',
        'Crypto Save should reject symbols that are absent from the loaded provider catalog');

    const nextTicker = buildTickerConfig({
        initialTicker: {},
        labelText: '',
        symbolText: 'BTC/USD',
        priceDecimals: 0,
        panelSide: 'right',
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        resolvedCryptoTicker,
        cryptoCatalog,
    });
    assertEqual(nextTicker.symbol, 'btcusd', 'Built crypto configs should use normalized symbol');
    assertEqual(nextTicker.liveSymbol, 'BTC/USD', 'Built crypto configs should preserve live symbol');
    assertEqual(nextTicker.label, 'BTC/USD', 'Empty crypto labels should autofill from resolved ticker');
    assertEqual(nextTicker.marketSessionId, MARKET_SESSION_IDS.ALWAYS_OPEN,
        'Built crypto configs should persist the selected market session id');

    /* Switching category recomputes the session, and a listed fund's default depends on its symbol. */
    const listedFundDefault = getTickerMarketSessionPolicy({
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        symbol: 'gld.us',
    }).defaultMarketSessionId;
    assertEqual(listedFundDefault, MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        'A listed commodity fund should default to its venue session, not the category session');
    assertTruthy(getTickerMarketSessionOptions({
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        marketSessionId: listedFundDefault,
        symbol: 'gld.us',
    }).some(option => option.value === listedFundDefault),
    'The session the dialog selects must be offered by the session row');
}
