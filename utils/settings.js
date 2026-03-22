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

export const MARKET_TYPES = {
    ALWAYS_OPEN: 'always-open',
    WEEKDAY_SESSION: 'weekday-session',
    US_SESSION: 'us-session',
};

export const FORMAT_PRESETS = {
    DEFAULT: 'default',
    CHANGE: 'change-only',
    PRICE: 'price-only',
};

export const SEPARATOR_STYLES = {
    DOT: 'dot',
    PIPES: 'pipes',
    SPACE: 'space',
};

export const DEFAULT_REFRESH_INTERVAL_SECONDS = 300;

export const DEFAULT_TICKERS = [
    {label: 'SPX', symbol: '^spx', priceDecimals: 0, marketType: MARKET_TYPES.US_SESSION, panelSide: RIGHT_PANEL_SIDE},
    {label: 'NDX', symbol: '^ndq', priceDecimals: 0, marketType: MARKET_TYPES.US_SESSION, panelSide: RIGHT_PANEL_SIDE},
    {label: 'DXY', symbol: 'dx.f', priceDecimals: 2, marketType: MARKET_TYPES.WEEKDAY_SESSION, panelSide: LEFT_PANEL_SIDE},
    {label: 'EUR/USD', symbol: 'eurusd', priceDecimals: 4, marketType: MARKET_TYPES.WEEKDAY_SESSION, panelSide: LEFT_PANEL_SIDE},
    {label: 'Gold', symbol: 'xauusd', priceDecimals: 0, marketType: MARKET_TYPES.WEEKDAY_SESSION, panelSide: RIGHT_PANEL_SIDE},
    {label: 'USO', symbol: 'uso.us', priceDecimals: 2, marketType: MARKET_TYPES.US_SESSION, panelSide: RIGHT_PANEL_SIDE},
    {
        label: 'ETH',
        symbol: 'eth.v',
        priceDecimals: 0,
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        panelSide: RIGHT_PANEL_SIDE,
        separatorBefore: ' || ',
        liveSymbol: 'ETH/USD',
    },
    {
        label: 'BTC',
        symbol: 'btc.v',
        priceDecimals: 0,
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        panelSide: RIGHT_PANEL_SIDE,
        liveSymbol: 'BTC/USD',
    },
];

export const DEFAULT_DISPLAY_SETTINGS = {
    formatPreset: FORMAT_PRESETS.DEFAULT,
    showPrice: true,
    showArrow: true,
    showPercent: true,
    separatorStyle: SEPARATOR_STYLES.DOT,
};

const SUPPORTED_LIVE_TICKERS = [
    {
        label: 'BTC',
        symbol: 'btc.v',
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        liveSymbol: 'BTC/USD',
    },
    {
        label: 'ETH',
        symbol: 'eth.v',
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        liveSymbol: 'ETH/USD',
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

export function getSeparatorText(separatorStyle) {
    switch (separatorStyle) {
    case SEPARATOR_STYLES.PIPES:
        return ' || ';
    case SEPARATOR_STYLES.SPACE:
        return '   ';
    case SEPARATOR_STYLES.DOT:
    default:
        return ' \u00b7 ';
    }
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

export function getFormatPresetOptions() {
    return [
        {value: FORMAT_PRESETS.DEFAULT, title: 'Ticker + price + change'},
        {value: FORMAT_PRESETS.CHANGE, title: 'Ticker + change'},
        {value: FORMAT_PRESETS.PRICE, title: 'Ticker + price'},
    ];
}

export function getSeparatorOptions() {
    return [
        {value: SEPARATOR_STYLES.DOT, title: '\u00b7'},
        {value: SEPARATOR_STYLES.PIPES, title: '||'},
        {value: SEPARATOR_STYLES.SPACE, title: 'Spacing'},
    ];
}

export function getRefreshIntervalOptions() {
    return [60, 120, 300, 600, 900, 1800, 3600];
}

export function formatRefreshIntervalLabel(seconds) {
    if (seconds < 60)
        return `${seconds} sec`;

    const minutes = seconds / 60;
    return `${minutes} min`;
}

export function cloneTicker(ticker) {
    return JSON.parse(JSON.stringify(ticker));
}

function cloneTickers(tickers) {
    return tickers.map(cloneTicker);
}

function normalizeTickerConfig(rawTicker) {
    if (!rawTicker || typeof rawTicker !== 'object')
        return null;

    const label = `${rawTicker.label ?? ''}`.trim();
    const symbol = `${rawTicker.symbol ?? ''}`.trim().toLowerCase();
    if (label === '' || symbol === '')
        return null;

    const priceDecimals = clampInteger(rawTicker.priceDecimals, 0, 6, 0);
    const marketType = normalizeMarketType(rawTicker.marketType);
    const panelSide = normalizePanelSide(rawTicker.panelSide);
    const separatorBefore = typeof rawTicker.separatorBefore === 'string'
        ? rawTicker.separatorBefore
        : '';

    const ticker = {
        label,
        symbol,
        priceDecimals,
        marketType,
        panelSide,
    };

    if (separatorBefore !== '')
        ticker.separatorBefore = separatorBefore;

    const liveSymbol = getSupportedLiveSymbol(ticker, rawTicker.liveSymbol);
    if (liveSymbol)
        ticker.liveSymbol = liveSymbol;

    return ticker;
}

function serializeTickerConfig(ticker) {
    const serialized = {
        label: ticker.label,
        symbol: ticker.symbol,
        priceDecimals: ticker.priceDecimals,
        marketType: ticker.marketType,
        panelSide: ticker.panelSide,
    };

    if (ticker.separatorBefore)
        serialized.separatorBefore = ticker.separatorBefore;

    if (ticker.liveSymbol)
        serialized.liveSymbol = ticker.liveSymbol;

    return serialized;
}

function normalizePanelSide(panelSide) {
    return panelSide === LEFT_PANEL_SIDE ? LEFT_PANEL_SIDE : RIGHT_PANEL_SIDE;
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

function clampInteger(value, min, max, fallback) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    if (!Number.isInteger(parsed))
        return fallback;

    return Math.min(max, Math.max(min, parsed));
}

function getSupportedLiveSymbol(ticker, rawLiveSymbol) {
    const explicitLiveSymbol = typeof rawLiveSymbol === 'string' ? rawLiveSymbol : '';
    const supportedTicker = SUPPORTED_LIVE_TICKERS.find(candidate =>
        candidate.label === ticker.label &&
        candidate.symbol === ticker.symbol &&
        candidate.marketType === ticker.marketType &&
        (explicitLiveSymbol === '' || explicitLiveSymbol === candidate.liveSymbol)
    );

    return supportedTicker?.liveSymbol ?? '';
}
