import {ASSET_CATEGORIES, CRYPTO_PROVIDERS} from '../utils/asset-categories.js';
import {
    createTickerSymbolMap,
    getDesiredLiveSymbols,
    isLiveCryptoTicker,
    isLiveCryptoTickerForProvider,
} from '../services/providers/live-quote-provider.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export function runTests() {
    const krakenTicker = {assetCategory: ASSET_CATEGORIES.CRYPTO, cryptoProvider: CRYPTO_PROVIDERS.KRAKEN, liveSymbol: 'BTC/USD', symbol: 'btcusd'};
    const defaultKrakenTicker = {assetCategory: ASSET_CATEGORIES.CRYPTO, liveSymbol: 'ETH/USD', symbol: 'ethusd'};
    const hyperliquidTicker = {assetCategory: ASSET_CATEGORIES.CRYPTO, cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID, liveSymbol: 'PURR/USDC', symbol: 'purrusdc'};
    const nonLiveTicker = {assetCategory: ASSET_CATEGORIES.US_EQUITY, symbol: 'aapl.us'};

    assertDeepEqual(getDesiredLiveSymbols([
        krakenTicker,
        defaultKrakenTicker,
        {...krakenTicker},
        nonLiveTicker,
    ]), ['BTC/USD', 'ETH/USD'],
    'Desired live symbols should deduplicate saved live symbols and ignore non-live tickers');

    assertDeepEqual(Array.from(createTickerSymbolMap([
        krakenTicker,
        hyperliquidTicker,
        nonLiveTicker,
    ]).entries()), [
        ['BTC/USD', 'BTCUSD'],
        ['PURR/USDC', 'PURRUSDC'],
    ], 'Ticker symbol maps should translate live symbols back to normalized saved ticker ids');

    assertEqual(isLiveCryptoTicker(krakenTicker), true,
        'Crypto tickers with live symbols should be recognized as live crypto tickers');
    assertEqual(isLiveCryptoTicker(nonLiveTicker), false,
        'Non-crypto tickers without live symbols should not be treated as live crypto tickers');

    assertEqual(isLiveCryptoTickerForProvider(krakenTicker, CRYPTO_PROVIDERS.KRAKEN), true,
        'Kraken ownership should match explicit Kraken crypto tickers');
    assertEqual(isLiveCryptoTickerForProvider(defaultKrakenTicker, CRYPTO_PROVIDERS.KRAKEN), true,
        'Kraken ownership should treat missing provider ids as Kraken by default');
    assertEqual(isLiveCryptoTickerForProvider(defaultKrakenTicker, CRYPTO_PROVIDERS.HYPERLIQUID), false,
        'Default Kraken ownership should not bleed into Hyperliquid');
    assertEqual(isLiveCryptoTickerForProvider(hyperliquidTicker, CRYPTO_PROVIDERS.HYPERLIQUID), true,
        'Hyperliquid ownership should match explicitly assigned Hyperliquid tickers');
}
