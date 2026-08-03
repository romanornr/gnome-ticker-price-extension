import {
    MARKET_SESSION_IDS,
    getMarketSessionOptions,
    isEquityMarketSessionId,
} from './market-sessions.js';

/*
 * Asset/category metadata is the shared taxonomy for the entire extension.
 *
 * These constants and metadata tables keep prefs, scheduling, search, and
 * default ticker setup aligned on the same domain language.
 */
export const ASSET_CATEGORIES = {
    EQUITY: 'equity',
    ETF: 'etf',
    COMMODITY: 'commodity',
    FX: 'fx',
    CRYPTO: 'crypto',
};

export const CRYPTO_PROVIDERS = {
    KRAKEN: 'kraken',
    HYPERLIQUID: 'hyperliquid',
};

const CATEGORY_ORDER = [
    ASSET_CATEGORIES.EQUITY,
    ASSET_CATEGORIES.ETF,
    ASSET_CATEGORIES.COMMODITY,
    ASSET_CATEGORIES.FX,
    ASSET_CATEGORIES.CRYPTO,
];

const ASSET_CATEGORY_METADATA = {
    [ASSET_CATEGORIES.EQUITY]: {
        title: 'Equity',
        description: 'Individual stocks and major equity indexes.',
        defaultMarketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        searchKeywords: ['equity', 'stock', 'stocks', 'index', 'indexes'],
    },
    [ASSET_CATEGORIES.ETF]: {
        title: 'ETF',
        description: 'Exchange-traded funds that follow an equity market session.',
        defaultMarketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        searchKeywords: ['etf', 'etfs', 'fund', 'funds'],
    },
    [ASSET_CATEGORIES.COMMODITY]: {
        title: 'Commodity',
        description: 'Metals and energy markets that refresh on weekdays.',
        defaultMarketSessionId: MARKET_SESSION_IDS.WEEKDAY_24H,
        searchKeywords: ['commodity', 'commodities', 'metals', 'energy'],
    },
    [ASSET_CATEGORIES.FX]: {
        title: 'FX',
        description: 'Forex pairs and DXY-style currency products.',
        defaultMarketSessionId: MARKET_SESSION_IDS.WEEKDAY_24H,
        searchKeywords: ['forex', 'currency', 'currencies'],
    },
    [ASSET_CATEGORIES.CRYPTO]: {
        title: 'Crypto',
        description: 'Always-open crypto markets. Kraken is available now, with more providers planned.',
        defaultMarketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
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
        description: 'Available now with pair search, catalog validation, and live websocket quotes.',
        available: true,
    },
    [CRYPTO_PROVIDERS.HYPERLIQUID]: {
        title: 'Hyperliquid',
        description: 'Available now with spot and perp symbol discovery plus live websocket prices.',
        available: true,
    },
};

/* prefs uses these options to keep UI labels and descriptions in sync with the shared metadata tables. */
export function getAssetCategoryOptions() {
    return CATEGORY_ORDER.map(assetCategory => {
        const metadata = ASSET_CATEGORY_METADATA[assetCategory];
        return {value: assetCategory, title: metadata.title, description: metadata.description};
    });
}

/* Market-session defaults come from the taxonomy so ticker creation and normalization agree on session policy. */
export function getAssetCategoryDefaultMarketSessionId(assetCategory) {
    return ASSET_CATEGORY_METADATA[assetCategory]?.defaultMarketSessionId ?? MARKET_SESSION_IDS.US_EQUITY_EXTENDED;
}

/* Category policy narrows the shared session registry to the choices valid for one ticker type. */
export function getMarketSessionOptionsForAssetCategory(assetCategory) {
    const defaultSessionId = getAssetCategoryDefaultMarketSessionId(assetCategory);
    if ([ASSET_CATEGORIES.CRYPTO, ASSET_CATEGORIES.COMMODITY, ASSET_CATEGORIES.FX].includes(assetCategory))
        return getMarketSessionOptions().filter(option => option.value === defaultSessionId);

    return getMarketSessionOptions().filter(option => isEquityMarketSessionId(option.value));
}

/* A single default crypto provider keeps new ticker flows deterministic when the user has not chosen one yet. */
export function getDefaultCryptoProvider() {
    return CRYPTO_PROVIDERS.KRAKEN;
}

/* Runtime routing treats any crypto ticker with a live symbol as live, then optionally narrows by provider. */
export function isLiveCryptoTicker(ticker, cryptoProvider = null) {
    if (
        ticker?.assetCategory !== ASSET_CATEGORIES.CRYPTO ||
        typeof ticker.liveSymbol !== 'string' ||
        ticker.liveSymbol === ''
    ) {
        return false;
    }

    return cryptoProvider === null ||
        (ticker.cryptoProvider ?? getDefaultCryptoProvider()) === cryptoProvider;
}

/* prefs uses provider options from here so the UI and runtime provider vocabulary never drift apart. */
export function getCryptoProviderOptions() {
    return CRYPTO_PROVIDER_ORDER.map(provider => {
        const metadata = CRYPTO_PROVIDER_METADATA[provider];
        return {value: provider, title: metadata.title, description: metadata.description, sensitive: metadata.available};
    });
}

/* Catalog search broadens matches with taxonomy-level words instead of only per-ticker keywords. */
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
