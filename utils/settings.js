import {
    ASSET_CATEGORIES,
    CRYPTO_PROVIDERS,
    MARKET_TYPES,
    getAssetCategoryDefaultMarketType,
    getAssetCategoryOptions,
    getCryptoProviderOptions,
    getDefaultCryptoProvider,
} from './asset-categories.js';
import {
    DEFAULT_DISPLAY_SETTINGS,
    DEFAULT_REFRESH_INTERVAL_SECONDS,
    FORMAT_PRESETS,
    SEPARATOR_STYLES,
} from './display-settings.js';
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

export const LEFT_PANEL_SIDE = 'left';
export const RIGHT_PANEL_SIDE = 'right';

export {ASSET_CATEGORIES, MARKET_TYPES, getAssetCategoryOptions};
export {
    CRYPTO_PROVIDERS,
    getCryptoProviderOptions,
    getDefaultCryptoProvider,
};

export const DEFAULT_TICKERS = [
    {
        label: 'SPX',
        symbol: '^spx',
        priceDecimals: 0,
        marketType: MARKET_TYPES.US_SESSION,
        assetCategory: ASSET_CATEGORIES.US_EQUITY,
        panelSide: RIGHT_PANEL_SIDE,
    },
    {
        label: 'NDX',
        symbol: '^ndq',
        priceDecimals: 0,
        marketType: MARKET_TYPES.US_SESSION,
        assetCategory: ASSET_CATEGORIES.US_EQUITY,
        panelSide: RIGHT_PANEL_SIDE,
    },
    {
        label: 'DXY',
        symbol: 'dx.f',
        priceDecimals: 2,
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        assetCategory: ASSET_CATEGORIES.FX,
        panelSide: LEFT_PANEL_SIDE,
    },
    {
        label: 'EUR/USD',
        symbol: 'eurusd',
        priceDecimals: 4,
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        assetCategory: ASSET_CATEGORIES.FX,
        panelSide: LEFT_PANEL_SIDE,
    },
    {
        label: 'Gold',
        symbol: 'xauusd',
        priceDecimals: 0,
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        panelSide: RIGHT_PANEL_SIDE,
    },
    {
        label: 'USO',
        symbol: 'uso.us',
        priceDecimals: 2,
        marketType: MARKET_TYPES.US_SESSION,
        assetCategory: ASSET_CATEGORIES.US_ETF,
        panelSide: RIGHT_PANEL_SIDE,
    },
    {
        label: 'ETH',
        symbol: 'ethusd',
        priceDecimals: 0,
        marketType: MARKET_TYPES.ALWAYS_OPEN,
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
        marketType: MARKET_TYPES.ALWAYS_OPEN,
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

export function getMarketTypeOptions() {
    return [
        {
            value: MARKET_TYPES.ALWAYS_OPEN,
            title: 'Always open',
            description: 'Crypto and other 24/7 markets. Refreshes every day.',
        },
        {
            value: MARKET_TYPES.WEEKDAY_SESSION,
            title: 'Weekday global market',
            description: 'Forex and commodities. Refreshes on weekdays and skips weekends.',
        },
        {
            value: MARKET_TYPES.US_SESSION,
            title: 'U.S. equity session',
            description: 'U.S. stocks and ETFs. Uses U.S. market hours and slower overnight refreshes.',
        },
    ];
}

export function getMarketTypeForAssetCategory(assetCategory) {
    return getAssetCategoryDefaultMarketType(assetCategory);
}


export function cloneTicker(ticker) {
    return cloneTickerConfig(ticker);
}

function cloneTickers(tickers) {
    return tickers.map(cloneTicker);
}

function normalizeMarketType(marketType) {
    switch (marketType) {
    case MARKET_TYPES.ALWAYS_OPEN:
    case MARKET_TYPES.WEEKDAY_SESSION:
    case MARKET_TYPES.US_SESSION:
        return marketType;
    default:
        return MARKET_TYPES.US_SESSION;
    }
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
