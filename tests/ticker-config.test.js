import {
    ASSET_CATEGORIES,
    CRYPTO_PROVIDERS,
    getTickerMarketSessionOptions,
    getTickerMarketSessionPolicy,
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
        getTickerMarketSessionOptions({assetCategory: ASSET_CATEGORIES.CRYPTO}).map(option => option.value),
        [MARKET_SESSION_IDS.ALWAYS_OPEN],
        'Crypto category options should stay limited to the always-open profile'
    );
    assertDeepEqual(
        getTickerMarketSessionOptions({assetCategory: ASSET_CATEGORIES.FX}).map(option => option.value),
        [MARKET_SESSION_IDS.WEEKDAY_24H],
        'FX category options should stay limited to the weekday profile'
    );

    const listedCommodityPolicy = getTickerMarketSessionPolicy({assetCategory: ASSET_CATEGORIES.COMMODITY, symbol: 'gld.us'});
    assertDeepEqual({
        defaultMarketSessionId: listedCommodityPolicy.defaultMarketSessionId,
        missingMarketSessionId: listedCommodityPolicy.missingMarketSessionId,
        allowedMarketSessionIds: listedCommodityPolicy.allowedMarketSessionIds,
    }, {
        defaultMarketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        missingMarketSessionId: MARKET_SESSION_IDS.WEEKDAY_24H,
        allowedMarketSessionIds: [MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
    }, 'Listed commodities should separate their venue default from the saved-data fallback');

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
        ['fieldless listed commodity', {symbol: 'gld.us', assetCategory: ASSET_CATEGORIES.COMMODITY}, ASSET_CATEGORIES.COMMODITY, MARKET_SESSION_IDS.WEEKDAY_24H],
        ['listed commodity with weekday session', {symbol: 'gld.us', assetCategory: ASSET_CATEGORIES.COMMODITY, marketSessionId: MARKET_SESSION_IDS.WEEKDAY_24H}, ASSET_CATEGORIES.COMMODITY, MARKET_SESSION_IDS.WEEKDAY_24H],
        ['listed commodity with modern US session', {symbol: 'gld.us', assetCategory: ASSET_CATEGORIES.COMMODITY, marketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED}, ASSET_CATEGORIES.COMMODITY, MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
        ['listed commodity with legacy US session', {symbol: 'gld.us', assetCategory: ASSET_CATEGORIES.COMMODITY, marketType: 'us_session'}, ASSET_CATEGORIES.COMMODITY, MARKET_SESSION_IDS.WEEKDAY_24H],
        ['listed commodity with disallowed Europe session', {symbol: 'gld.us', assetCategory: ASSET_CATEGORIES.COMMODITY, marketSessionId: MARKET_SESSION_IDS.EUROPE_EQUITY_CASH}, ASSET_CATEGORIES.COMMODITY, MARKET_SESSION_IDS.WEEKDAY_24H],
        ['fieldless spot commodity', {symbol: 'xauusd', assetCategory: ASSET_CATEGORIES.COMMODITY}, ASSET_CATEGORIES.COMMODITY, MARKET_SESSION_IDS.WEEKDAY_24H],
        ['fieldless FX', {symbol: 'eurusd', assetCategory: ASSET_CATEGORIES.FX}, ASSET_CATEGORIES.FX, MARKET_SESSION_IDS.WEEKDAY_24H],
        ['fieldless crypto', {symbol: 'btcusd', assetCategory: ASSET_CATEGORIES.CRYPTO}, ASSET_CATEGORIES.CRYPTO, MARKET_SESSION_IDS.ALWAYS_OPEN],
        ['fieldless equity', {symbol: 'aapl.us', assetCategory: ASSET_CATEGORIES.EQUITY}, ASSET_CATEGORIES.EQUITY, MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
        ['fieldless ETF', {symbol: 'spy.us', assetCategory: ASSET_CATEGORIES.ETF}, ASSET_CATEGORIES.ETF, MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
        ['category-free GLD', {symbol: 'gld.us'}, ASSET_CATEGORIES.ETF, MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
        ['category-free spot gold', {symbol: 'xauusd'}, ASSET_CATEGORIES.EQUITY, MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
        ['legacy always_open', {symbol: 'btcusd', marketType: 'always_open'}, ASSET_CATEGORIES.CRYPTO, MARKET_SESSION_IDS.ALWAYS_OPEN],
        ['legacy weekday-session', {symbol: 'eurusd', marketType: 'weekday-session'}, ASSET_CATEGORIES.FX, MARKET_SESSION_IDS.WEEKDAY_24H],
        ['legacy weekday_session', {symbol: 'eurusd', marketType: 'weekday_session'}, ASSET_CATEGORIES.FX, MARKET_SESSION_IDS.WEEKDAY_24H],
        ['legacy us-session', {symbol: 'aapl.us', marketType: 'us-session'}, ASSET_CATEGORIES.EQUITY, MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
        ['legacy us_session', {symbol: 'aapl.us', marketType: 'us_session'}, ASSET_CATEGORIES.EQUITY, MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
        ['legacy us-equity alias', {symbol: 'legacy.us', assetCategory: 'us-equity'}, ASSET_CATEGORIES.EQUITY, MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
        ['legacy us_etf alias with Europe session', {symbol: 'legacy.us', assetCategory: 'us_etf', marketSessionId: MARKET_SESSION_IDS.EUROPE_EQUITY_CASH}, ASSET_CATEGORIES.ETF, MARKET_SESSION_IDS.EUROPE_EQUITY_CASH],
        ['invalid equity session', {symbol: 'aapl.us', marketSessionId: 'invalid-session'}, ASSET_CATEGORIES.EQUITY, MARKET_SESSION_IDS.US_EQUITY_EXTENDED],
    ].forEach(([description, rawTicker, expectedAssetCategory, expectedMarketSessionId]) => {
        const ticker = normalizeTickerConfig({label: 'Saved', ...rawTicker});
        assertEqual(ticker.assetCategory, expectedAssetCategory, `${description} should preserve its category meaning`);
        assertEqual(ticker.marketSessionId, expectedMarketSessionId, `${description} should resolve to the expected session`);
        assertEqual(serializeTickerConfig(ticker).marketSessionId, expectedMarketSessionId, `${description} should serialize unchanged`);
        assertEqual(getTickerMarketSessionOptions(ticker).some(option => option.value === expectedMarketSessionId), true,
            `${description} prefs should include the effective session`);
    });

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
