import {
    ASSET_CATEGORIES,
    CRYPTO_PROVIDERS,
    getAssetCategoryDefaultMarketSessionId,
    getAssetCategoryOptions,
    getCryptoProviderOptions,
    getDefaultCryptoProvider,
} from './asset-categories.js';
import {
    MARKET_SESSION_IDS,
    getMarketSessionOptions,
} from './market-sessions.js';
import {
    DEFAULT_DISPLAY_SETTINGS,
    DEFAULT_REFRESH_INTERVAL_SECONDS,
    FORMAT_PRESETS,
    SEPARATOR_STYLES,
} from './display-settings.js';
import {LEFT_PANEL_SIDE, RIGHT_PANEL_SIDE} from './panel-sides.js';
import {
    cloneTicker as cloneTickerConfig,
    normalizeTickerConfig,
    serializeTickerConfig,
} from './ticker-config.js';

export const SETTINGS_KEYS = {
    TICKERS_JSON: 'tickers-json',
    REFRESH_INTERVAL_SECONDS: 'refresh-interval-seconds',
    FORMAT_PRESET: 'format-preset',
    SHOW_PRICE: 'show-price',
    SHOW_ARROW: 'show-arrow',
    SHOW_PERCENT: 'show-percent',
    SEPARATOR_STYLE: 'separator-style',
};

export {ASSET_CATEGORIES, getAssetCategoryOptions};
export {
    CRYPTO_PROVIDERS,
    getCryptoProviderOptions,
    getDefaultCryptoProvider,
};
export {MARKET_SESSION_IDS, getMarketSessionOptions};
export {LEFT_PANEL_SIDE, RIGHT_PANEL_SIDE};

export const DEFAULT_TICKERS = [
    {
        label: 'SPX',
        symbol: '^spx',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        assetCategory: ASSET_CATEGORIES.EQUITY,
        panelSide: RIGHT_PANEL_SIDE,
    },
    {
        label: 'NDX',
        symbol: '^ndq',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        assetCategory: ASSET_CATEGORIES.EQUITY,
        panelSide: RIGHT_PANEL_SIDE,
    },
    {
        label: 'DXY',
        symbol: 'dx.f',
        priceDecimals: 2,
        marketSessionId: MARKET_SESSION_IDS.WEEKDAY_24H,
        assetCategory: ASSET_CATEGORIES.FX,
        panelSide: LEFT_PANEL_SIDE,
    },
    {
        label: 'EUR/USD',
        symbol: 'eurusd',
        priceDecimals: 4,
        marketSessionId: MARKET_SESSION_IDS.WEEKDAY_24H,
        assetCategory: ASSET_CATEGORIES.FX,
        panelSide: LEFT_PANEL_SIDE,
    },
    {
        label: 'Gold',
        symbol: 'xauusd',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.WEEKDAY_24H,
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        panelSide: RIGHT_PANEL_SIDE,
    },
    {
        label: 'USO',
        symbol: 'uso.us',
        priceDecimals: 2,
        marketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        assetCategory: ASSET_CATEGORIES.ETF,
        panelSide: RIGHT_PANEL_SIDE,
    },
    {
        label: 'ETH',
        symbol: 'ethusd',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        panelSide: RIGHT_PANEL_SIDE,
        separatorBefore: ' || ',
        liveSymbol: 'ETH/USD',
    },
    {
        label: 'BTC',
        symbol: 'btcusd',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        panelSide: RIGHT_PANEL_SIDE,
        liveSymbol: 'BTC/USD',
    },
];

export function loadTickerConfigs(settings) {
    const serialized = settings?.get_string(SETTINGS_KEYS.TICKERS_JSON) ?? '';
    if (serialized.trim() === '')
        return cloneTickers(DEFAULT_TICKERS);

    try {
        const parsed = JSON.parse(serialized);
        if (!Array.isArray(parsed))
            return cloneTickers(DEFAULT_TICKERS);

        const tickers = parsed
            .map(normalizeTickerConfig)
            .filter(ticker => ticker !== null);

        return tickers.length > 0 ? tickers : cloneTickers(DEFAULT_TICKERS);
    } catch (error) {
        logError(error, 'ticker-price-extension: invalid ticker settings, using defaults');
        return cloneTickers(DEFAULT_TICKERS);
    }
}

export function saveTickerConfigs(settings, tickers) {
    settings.set_string(SETTINGS_KEYS.TICKERS_JSON, JSON.stringify(tickers.map(serializeTickerConfig)));
}

export function resetTickerConfigs(settings) {
    settings.reset(SETTINGS_KEYS.TICKERS_JSON);
}

export function loadDisplaySettings(settings) {
    const formatPreset = normalizeFormatPreset(settings?.get_string(SETTINGS_KEYS.FORMAT_PRESET));
    const separatorStyle = normalizeSeparatorStyle(settings?.get_string(SETTINGS_KEYS.SEPARATOR_STYLE));

    return {
        formatPreset,
        showPrice: settings?.get_boolean(SETTINGS_KEYS.SHOW_PRICE) ?? DEFAULT_DISPLAY_SETTINGS.showPrice,
        showArrow: settings?.get_boolean(SETTINGS_KEYS.SHOW_ARROW) ?? DEFAULT_DISPLAY_SETTINGS.showArrow,
        showPercent: settings?.get_boolean(SETTINGS_KEYS.SHOW_PERCENT) ?? DEFAULT_DISPLAY_SETTINGS.showPercent,
        separatorStyle,
    };
}

export function loadRefreshIntervalSeconds(settings) {
    const interval = settings?.get_uint(SETTINGS_KEYS.REFRESH_INTERVAL_SECONDS) ?? DEFAULT_REFRESH_INTERVAL_SECONDS;
    return Number.isInteger(interval) && interval > 0 ? interval : DEFAULT_REFRESH_INTERVAL_SECONDS;
}

export function getTickersForSide(tickers, side) {
    return tickers.filter(ticker => (ticker.panelSide ?? RIGHT_PANEL_SIDE) === side);
}

export function getMarketSessionForAssetCategory(assetCategory) {
    return getAssetCategoryDefaultMarketSessionId(assetCategory);
}

export function getMarketSessionOptionsForAssetCategory(assetCategory) {
    const equitySessionValues = new Set([
        MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        MARKET_SESSION_IDS.EUROPE_EQUITY_CASH,
        MARKET_SESSION_IDS.UK_EQUITY_CASH,
        MARKET_SESSION_IDS.JAPAN_EQUITY_CASH,
        MARKET_SESSION_IDS.CHINA_EQUITY_CASH,
        MARKET_SESSION_IDS.HONG_KONG_EQUITY_CASH,
        MARKET_SESSION_IDS.TAIWAN_EQUITY_CASH,
        MARKET_SESSION_IDS.SOUTH_KOREA_EQUITY_CASH,
        MARKET_SESSION_IDS.INDIA_EQUITY_CASH,
        MARKET_SESSION_IDS.AUSTRALIA_EQUITY_CASH,
    ]);

    if (assetCategory === ASSET_CATEGORIES.CRYPTO)
        return getMarketSessionOptions().filter(option => option.value === MARKET_SESSION_IDS.ALWAYS_OPEN);

    if (assetCategory === ASSET_CATEGORIES.COMMODITY || assetCategory === ASSET_CATEGORIES.FX)
        return getMarketSessionOptions().filter(option => option.value === MARKET_SESSION_IDS.WEEKDAY_24H);

    return getMarketSessionOptions().filter(option => equitySessionValues.has(option.value));
}

export function cloneTicker(ticker) {
    return cloneTickerConfig(ticker);
}

function cloneTickers(tickers) {
    return tickers.map(cloneTicker);
}

function normalizeFormatPreset(formatPreset) {
    switch (formatPreset) {
    case FORMAT_PRESETS.CHANGE:
    case FORMAT_PRESETS.PRICE:
    case FORMAT_PRESETS.DEFAULT:
        return formatPreset;
    default:
        return DEFAULT_DISPLAY_SETTINGS.formatPreset;
    }
}

function normalizeSeparatorStyle(separatorStyle) {
    switch (separatorStyle) {
    case SEPARATOR_STYLES.PIPES:
    case SEPARATOR_STYLES.SPACE:
    case SEPARATOR_STYLES.DOT:
        return separatorStyle;
    default:
        return DEFAULT_DISPLAY_SETTINGS.separatorStyle;
    }
}
