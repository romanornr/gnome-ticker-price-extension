import {
    ASSET_CATEGORIES,
    CRYPTO_PROVIDERS,
    getMarketSessionOptionsForAssetCategory,
} from '../utils/asset-categories.js';
import {MARKET_SESSION_IDS} from '../utils/market-sessions.js';
import {
    cloneTicker,
    inferAssetCategory,
    normalizeTickerConfig,
    serializeTickerConfig,
} from '../utils/ticker-config.js';
import {loadTickerConfigs} from '../utils/settings.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export function runTests() {
    assertEqual(normalizeTickerConfig(null), null,
        'Invalid ticker configs should be rejected');

    assertEqual(inferAssetCategory({marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN, symbol: 'btcusd'}), ASSET_CATEGORIES.CRYPTO,
    'Always-open tickers should infer as crypto');

    assertEqual(inferAssetCategory({marketSessionId: MARKET_SESSION_IDS.WEEKDAY_24H, symbol: 'eurusd', label: 'EUR/USD'}), ASSET_CATEGORIES.FX,
    'Weekday currency pairs should infer as FX');

    assertEqual(inferAssetCategory({marketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED, symbol: 'uso.us'}), ASSET_CATEGORIES.ETF,
    'Known ETF symbols should infer as ETFs');

    assertDeepEqual(
        getMarketSessionOptionsForAssetCategory(ASSET_CATEGORIES.CRYPTO).map(option => option.value),
        [MARKET_SESSION_IDS.ALWAYS_OPEN],
        'Crypto category options should stay limited to the always-open profile'
    );
    assertDeepEqual(
        getMarketSessionOptionsForAssetCategory(ASSET_CATEGORIES.FX).map(option => option.value),
        [MARKET_SESSION_IDS.WEEKDAY_24H],
        'FX category options should stay limited to the weekday profile'
    );

    const legacyKrakenTicker = normalizeTickerConfig({label: 'BTC', symbol: 'btc.v', marketType: 'always-open', liveSymbol: 'BTC/USD'});
    assertDeepEqual(legacyKrakenTicker, {
        label: 'BTC',
        symbol: 'btcusd',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        panelSide: 'right',
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        liveSymbol: 'BTC/USD',
    }, 'Legacy Kraken ticker shapes should normalize to current crypto config');

    [
        ['always_open', 'btcusd', MARKET_SESSION_IDS.ALWAYS_OPEN],
        ['weekday-session', 'eurusd', MARKET_SESSION_IDS.WEEKDAY_24H],
        ['weekday_session', 'eurusd', MARKET_SESSION_IDS.WEEKDAY_24H],
        ['us-session', 'aapl.us', MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
        ['us_session', 'aapl.us', MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
    ].forEach(([marketType, symbol, expectedSessionId]) => {
        const ticker = normalizeTickerConfig({label: 'Legacy', symbol, marketType});
        assertEqual(ticker.marketSessionId, expectedSessionId,
            `Legacy marketType ${marketType} should remain readable`);
    });

    [
        ['us-equity', ASSET_CATEGORIES.EQUITY],
        ['us_equity', ASSET_CATEGORIES.EQUITY],
        ['us-etf', ASSET_CATEGORIES.ETF],
        ['us_etf', ASSET_CATEGORIES.ETF],
    ].forEach(([assetCategory, expectedAssetCategory]) => {
        const ticker = normalizeTickerConfig({label: 'Legacy', symbol: 'legacy.us', assetCategory});
        assertEqual(ticker.assetCategory, expectedAssetCategory,
            `Legacy asset category ${assetCategory} should remain readable`);
    });

    const internationalTicker = normalizeTickerConfig({
        label: 'ASML',
        symbol: 'asml.nl',
        priceDecimals: 2,
        marketSessionId: MARKET_SESSION_IDS.EUROPE_EQUITY_CASH,
        assetCategory: ASSET_CATEGORIES.EQUITY,
    });
    assertEqual(internationalTicker.marketSessionId, MARKET_SESSION_IDS.EUROPE_EQUITY_CASH,
        'Registered international equity sessions should survive normalization');

    const invalidSessionTicker = normalizeTickerConfig({label: 'AAPL', symbol: 'aapl.us', marketSessionId: 'invalid-session'});
    assertEqual(invalidSessionTicker.marketSessionId, MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        'Unknown session ids should fall back through legacy-compatible normalization');

    const hyperliquidTicker = normalizeTickerConfig({
        label: 'PURR',
        symbol: '',
        liveSymbol: ' purr / usdc ',
        priceDecimals: 3,
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID,
        panelSide: 'left',
    });
    assertDeepEqual(hyperliquidTicker, {
        label: 'PURR',
        symbol: 'purrusdc',
        priceDecimals: 3,
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        panelSide: 'left',
        cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID,
        liveSymbol: 'PURR/USDC',
    }, 'Hyperliquid live symbols should normalize into saved ticker ids');

    const serializedTicker = serializeTickerConfig({
        label: 'ETH',
        symbol: 'ethusd',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        panelSide: 'right',
        cryptoProvider: 'unknown-provider',
        liveSymbol: 'ETH/USD',
    });
    assertDeepEqual(serializedTicker, {
        label: 'ETH',
        symbol: 'ethusd',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        panelSide: 'right',
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        liveSymbol: 'ETH/USD',
    }, 'Serialized crypto tickers should keep normalized category defaults and provider ids');

    const originalTicker = {label: 'SPX', symbol: '^spx', keywords: ['index']};
    const copiedTicker = cloneTicker(originalTicker);
    copiedTicker.keywords.push('large-cap');
    assertDeepEqual(originalTicker, {
        label: 'SPX',
        symbol: '^spx',
        keywords: ['index'],
    }, 'Cloned tickers should not share nested object references');

    /* Deleting the last ticker used to bring the defaults back on the next load. */
    assertDeepEqual(loadTickerConfigs(new FakeSettings('[]')), [],
        'An explicitly empty saved list should load as no tickers');
    assertEqual(loadTickerConfigs(new FakeSettings('')).length > 0, true,
        'A blank ticker setting should still load the shipped defaults');
    assertEqual(loadTickerConfigs(new FakeSettings('not json')).length > 0, true,
        'An unparsable ticker setting should fall back to the shipped defaults');
    assertEqual(loadTickerConfigs(new FakeSettings('[{"label":""}]')).length > 0, true,
        'A saved list whose entries are all unusable should fall back to the shipped defaults');
}

/* loadTickerConfigs only needs get_string, so the suite avoids depending on real GSettings. */
class FakeSettings {
    constructor(serialized) {
        this.serialized = serialized;
    }

    get_string(_key) {
        return this.serialized;
    }
}
