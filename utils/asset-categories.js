export const MARKET_TYPES = {
    ALWAYS_OPEN: 'always-open',
    WEEKDAY_SESSION: 'weekday-session',
    US_SESSION: 'us-session',
};

export const ASSET_CATEGORIES = {
    US_EQUITY: 'us-equity',
    US_ETF: 'us-etf',
    COMMODITY: 'commodity',
    FX: 'fx',
    CRYPTO: 'crypto',
};

export const CRYPTO_PROVIDERS = {
    KRAKEN: 'kraken',
    HYPERLIQUID: 'hyperliquid',
};

const CATEGORY_ORDER = [
    ASSET_CATEGORIES.US_EQUITY,
    ASSET_CATEGORIES.US_ETF,
    ASSET_CATEGORIES.COMMODITY,
    ASSET_CATEGORIES.FX,
    ASSET_CATEGORIES.CRYPTO,
];

const ASSET_CATEGORY_METADATA = {
    [ASSET_CATEGORIES.US_EQUITY]: {
        title: 'U.S. equity',
        description: 'Stocks and major U.S. equity indexes.',
        defaultMarketType: MARKET_TYPES.US_SESSION,
        searchKeywords: ['equity', 'stock', 'stocks', 'index', 'indexes'],
    },
    [ASSET_CATEGORIES.US_ETF]: {
        title: 'U.S. ETFs',
        description: 'Exchange-traded funds that follow the U.S. equity session.',
        defaultMarketType: MARKET_TYPES.US_SESSION,
        searchKeywords: ['etf', 'etfs', 'fund', 'funds'],
    },
    [ASSET_CATEGORIES.COMMODITY]: {
        title: 'Commodity',
        description: 'Metals and energy markets that refresh on weekdays.',
        defaultMarketType: MARKET_TYPES.WEEKDAY_SESSION,
        searchKeywords: ['commodity', 'commodities', 'metals', 'energy'],
    },
    [ASSET_CATEGORIES.FX]: {
        title: 'FX',
        description: 'Forex pairs and DXY-style currency products.',
        defaultMarketType: MARKET_TYPES.WEEKDAY_SESSION,
        searchKeywords: ['forex', 'currency', 'currencies'],
    },
    [ASSET_CATEGORIES.CRYPTO]: {
        title: 'Crypto',
        description: 'Always-open crypto markets. Kraken is available now, with more providers planned.',
        defaultMarketType: MARKET_TYPES.ALWAYS_OPEN,
        searchKeywords: ['crypto', 'cryptocurrency', 'cryptocurrencies'],
    },
};

const CRYPTO_PROVIDER_ORDER = [
    CRYPTO_PROVIDERS.KRAKEN,
    CRYPTO_PROVIDERS.HYPERLIQUID,
];

const CRYPTO_PROVIDER_METADATA = {
    [CRYPTO_PROVIDERS.KRAKEN]: {
        title: 'Kraken',
        description: 'Available now with pair search, verification, and live websocket quotes.',
        available: true,
    },
    [CRYPTO_PROVIDERS.HYPERLIQUID]: {
        title: 'Hyperliquid',
        description: 'Available now with spot and perp symbol discovery plus live websocket prices.',
        available: true,
    },
};

export function getAssetCategoryMetadata(assetCategory) {
    const metadata = ASSET_CATEGORY_METADATA[assetCategory];
    if (!metadata)
        return null;

    return {
        value: assetCategory,
        ...metadata,
        searchKeywords: [...metadata.searchKeywords],
    };
}

export function getAssetCategoryOptions() {
    return CATEGORY_ORDER.map(assetCategory => {
        const metadata = ASSET_CATEGORY_METADATA[assetCategory];
        return {
            value: assetCategory,
            title: metadata.title,
            description: metadata.description,
        };
    });
}

export function getAssetCategoryDefaultMarketType(assetCategory) {
    return ASSET_CATEGORY_METADATA[assetCategory]?.defaultMarketType ?? MARKET_TYPES.US_SESSION;
}

export function getDefaultCryptoProvider() {
    return CRYPTO_PROVIDERS.KRAKEN;
}

export function getCryptoProviderMetadata(provider) {
    const metadata = CRYPTO_PROVIDER_METADATA[provider];
    if (!metadata)
        return null;

    return {
        value: provider,
        ...metadata,
    };
}

export function getCryptoProviderOptions() {
    return CRYPTO_PROVIDER_ORDER.map(provider => {
        const metadata = CRYPTO_PROVIDER_METADATA[provider];
        return {
            value: provider,
            title: metadata.title,
            description: metadata.description,
            sensitive: metadata.available,
        };
    });
}

export function getAssetCategorySearchTerms(assetCategory) {
    const metadata = ASSET_CATEGORY_METADATA[assetCategory];
    if (!metadata)
        return [];

    return [
        metadata.title,
        metadata.description,
        ...metadata.searchKeywords,
    ];
}
