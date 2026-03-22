import {ASSET_CATEGORIES, CRYPTO_PROVIDERS, MARKET_TYPES} from '../utils/asset-categories.js';
import {
    cloneTicker,
    inferAssetCategory,
    normalizeTickerConfig,
    serializeTickerConfig,
} from '../utils/ticker-config.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export function runTests() {
    assertEqual(normalizeTickerConfig(null), null,
        'Invalid ticker configs should be rejected');

    assertEqual(inferAssetCategory({
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        symbol: 'btcusd',
    }), ASSET_CATEGORIES.CRYPTO,
    'Always-open tickers should infer as crypto');

    assertEqual(inferAssetCategory({
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        symbol: 'eurusd',
        label: 'EUR/USD',
    }), ASSET_CATEGORIES.FX,
    'Weekday currency pairs should infer as FX');

    assertEqual(inferAssetCategory({
        marketType: MARKET_TYPES.US_SESSION,
        symbol: 'uso.us',
    }), ASSET_CATEGORIES.US_ETF,
    'Known ETF symbols should infer as U.S. ETFs');

    const legacyKrakenTicker = normalizeTickerConfig({
        label: 'BTC',
        symbol: 'btc.v',
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        liveSymbol: 'BTC/USD',
    });
    assertDeepEqual(legacyKrakenTicker, {
        label: 'BTC',
        symbol: 'btcusd',
        priceDecimals: 0,
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        panelSide: 'right',
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        liveSymbol: 'BTC/USD',
    }, 'Legacy Kraken ticker shapes should normalize to current crypto config');

    const hyperliquidTicker = normalizeTickerConfig({
        label: 'PURR',
        symbol: '',
        liveSymbol: ' purr / usdc ',
        priceDecimals: 3,
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID,
        panelSide: 'left',
    });
    assertDeepEqual(hyperliquidTicker, {
        label: 'PURR',
        symbol: 'purrusdc',
        priceDecimals: 3,
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        panelSide: 'left',
        cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID,
        liveSymbol: 'PURR/USDC',
    }, 'Hyperliquid live symbols should normalize into saved ticker ids');

    const serializedTicker = serializeTickerConfig({
        label: 'ETH',
        symbol: 'ethusd',
        priceDecimals: 0,
        marketType: MARKET_TYPES.US_SESSION,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        panelSide: 'right',
        cryptoProvider: 'unknown-provider',
        liveSymbol: 'ETH/USD',
    });
    assertDeepEqual(serializedTicker, {
        label: 'ETH',
        symbol: 'ethusd',
        priceDecimals: 0,
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        panelSide: 'right',
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        liveSymbol: 'ETH/USD',
    }, 'Serialized crypto tickers should keep normalized category defaults and provider ids');

    const originalTicker = {
        label: 'SPX',
        symbol: '^spx',
        keywords: ['index'],
    };
    const copiedTicker = cloneTicker(originalTicker);
    copiedTicker.keywords.push('large-cap');
    assertDeepEqual(originalTicker, {
        label: 'SPX',
        symbol: '^spx',
        keywords: ['index'],
    }, 'Cloned tickers should not share nested object references');
}
