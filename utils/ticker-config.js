import {
    ASSET_CATEGORIES,
    CRYPTO_PROVIDERS,
    getAssetCategoryDefaultMarketSessionId,
    getDefaultCryptoProvider,
} from './asset-categories.js';
import {getCryptoProviderAdapter} from './crypto-providers/index.js';
import {
    MARKET_SESSION_IDS,
    getMarketSessionIdFromLegacyMarketType,
} from './market-sessions.js';
import {LEFT_PANEL_SIDE, RIGHT_PANEL_SIDE} from './panel-sides.js';

const SUPPORTED_LIVE_TICKERS = [
    {
        label: 'BTC',
        symbol: 'btcusd',
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        liveSymbol: 'BTC/USD',
    },
    {
        label: 'ETH',
        symbol: 'ethusd',
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        liveSymbol: 'ETH/USD',
    },
];

/*
 * Ticker config policy is intentionally separate from settings I/O.
 *
 * settings.js stays responsible for GSettings keys/defaults and load/save
 * entrypoints, while this module owns normalization, serialization, and
 * compatibility handling for saved ticker objects.
 */
export function cloneTicker(ticker) {
    return JSON.parse(JSON.stringify(ticker));
}

export function normalizeTickerConfig(rawTicker) {
    if (!rawTicker || typeof rawTicker !== 'object')
        return null;

    const label = `${rawTicker.label ?? ''}`.trim();
    const marketSessionId = normalizeMarketSessionId(rawTicker.marketSessionId, rawTicker.marketType);
    const assetCategory = normalizeAssetCategory(rawTicker.assetCategory, {
        label,
        symbol: `${rawTicker.symbol ?? ''}`.trim().toLowerCase(),
        marketSessionId,
        liveSymbol: `${rawTicker.liveSymbol ?? ''}`.trim(),
        cryptoProvider: rawTicker.cryptoProvider,
    });
    const cryptoProvider = normalizeCryptoProvider(rawTicker.cryptoProvider, assetCategory);
    const rawLiveSymbol = normalizeCryptoLiveSymbol(rawTicker.liveSymbol, cryptoProvider);
    const symbol = normalizeTickerSymbol(`${rawTicker.symbol ?? ''}`.trim().toLowerCase(), rawLiveSymbol, cryptoProvider);
    if (label === '' || symbol === '')
        return null;

    const priceDecimals = clampInteger(rawTicker.priceDecimals, 0, 6, 0);
    const panelSide = normalizePanelSide(rawTicker.panelSide);
    const separatorBefore = typeof rawTicker.separatorBefore === 'string'
        ? rawTicker.separatorBefore
        : '';

    const ticker = {
        label,
        symbol,
        priceDecimals,
        marketSessionId: normalizeTickerMarketSessionId(marketSessionId, assetCategory),
        assetCategory,
        panelSide,
    };

    if (separatorBefore !== '')
        ticker.separatorBefore = separatorBefore;

    if (assetCategory === ASSET_CATEGORIES.CRYPTO)
        ticker.cryptoProvider = cryptoProvider;

    const liveSymbol = getSupportedLiveSymbol(ticker, rawLiveSymbol);
    if (liveSymbol)
        ticker.liveSymbol = liveSymbol;

    return ticker;
}

export function serializeTickerConfig(ticker) {
    const assetCategory = normalizeAssetCategory(ticker.assetCategory, ticker);
    const serialized = {
        label: ticker.label,
        symbol: ticker.symbol,
        priceDecimals: ticker.priceDecimals,
        marketSessionId: normalizeTickerMarketSessionId(ticker.marketSessionId, assetCategory),
        assetCategory,
        panelSide: ticker.panelSide,
    };

    if (ticker.separatorBefore)
        serialized.separatorBefore = ticker.separatorBefore;

    if (assetCategory === ASSET_CATEGORIES.CRYPTO)
        serialized.cryptoProvider = normalizeCryptoProvider(ticker.cryptoProvider, assetCategory);

    if (ticker.liveSymbol)
        serialized.liveSymbol = ticker.liveSymbol;

    return serialized;
}

export function inferAssetCategory(ticker) {
    const marketSessionId = normalizeMarketSessionId(ticker?.marketSessionId, ticker?.marketType);
    const symbol = `${ticker?.symbol ?? ''}`.trim().toLowerCase();
    const label = `${ticker?.label ?? ''}`.trim().toLowerCase();
    const liveSymbol = typeof ticker?.liveSymbol === 'string'
        ? ticker.liveSymbol
        : '';
    if (
        marketSessionId === MARKET_SESSION_IDS.ALWAYS_OPEN ||
        normalizeCryptoLiveSymbol(liveSymbol, ticker?.cryptoProvider) !== '' ||
        hasKnownCryptoProvider(ticker?.cryptoProvider)
    ) {
        return ASSET_CATEGORIES.CRYPTO;
    }

    if (marketSessionId === MARKET_SESSION_IDS.WEEKDAY_24H) {
        if (['xauusd', 'xagusd', 'wticrud.f', 'brent.f', 'hg.f', 'ng.f'].includes(symbol))
            return ASSET_CATEGORIES.COMMODITY;

        if (symbol.endsWith('usd') || symbol === 'dx.f' || label.includes('/'))
            return ASSET_CATEGORIES.FX;

        return ASSET_CATEGORIES.COMMODITY;
    }

    if (
        symbol.endsWith('.us') &&
        ['spy.us', 'qqq.us', 'dia.us', 'iwm.us', 'vti.us', 'voo.us', 'ivv.us', 'xlf.us', 'xle.us', 'gld.us', 'slv.us', 'tlt.us', 'uso.us'].includes(symbol)
    ) {
        return ASSET_CATEGORIES.ETF;
    }

    return ASSET_CATEGORIES.EQUITY;
}

function normalizePanelSide(panelSide) {
    return panelSide === LEFT_PANEL_SIDE ? LEFT_PANEL_SIDE : RIGHT_PANEL_SIDE;
}

function normalizeMarketSessionId(marketSessionId, legacyMarketType = '') {
    switch (marketSessionId) {
    case MARKET_SESSION_IDS.ALWAYS_OPEN:
    case MARKET_SESSION_IDS.WEEKDAY_24H:
    case MARKET_SESSION_IDS.US_EQUITY_EXTENDED:
    case MARKET_SESSION_IDS.EUROPE_EQUITY_CASH:
    case MARKET_SESSION_IDS.UK_EQUITY_CASH:
    case MARKET_SESSION_IDS.JAPAN_EQUITY_CASH:
    case MARKET_SESSION_IDS.CHINA_EQUITY_CASH:
    case MARKET_SESSION_IDS.HONG_KONG_EQUITY_CASH:
    case MARKET_SESSION_IDS.TAIWAN_EQUITY_CASH:
    case MARKET_SESSION_IDS.SOUTH_KOREA_EQUITY_CASH:
    case MARKET_SESSION_IDS.INDIA_EQUITY_CASH:
    case MARKET_SESSION_IDS.AUSTRALIA_EQUITY_CASH:
        return marketSessionId;
    default:
        return getMarketSessionIdFromLegacyMarketType(legacyMarketType);
    }
}

function normalizeTickerMarketSessionId(marketSessionId, assetCategory) {
    if (assetCategory === ASSET_CATEGORIES.CRYPTO)
        return MARKET_SESSION_IDS.ALWAYS_OPEN;

    if (assetCategory === ASSET_CATEGORIES.COMMODITY || assetCategory === ASSET_CATEGORIES.FX)
        return MARKET_SESSION_IDS.WEEKDAY_24H;

    if (isSupportedEquityMarketSessionId(marketSessionId))
        return marketSessionId;

    return MARKET_SESSION_IDS.US_EQUITY_EXTENDED;
}

function isSupportedEquityMarketSessionId(marketSessionId) {
    switch (marketSessionId) {
    case MARKET_SESSION_IDS.US_EQUITY_EXTENDED:
    case MARKET_SESSION_IDS.EUROPE_EQUITY_CASH:
    case MARKET_SESSION_IDS.UK_EQUITY_CASH:
    case MARKET_SESSION_IDS.JAPAN_EQUITY_CASH:
    case MARKET_SESSION_IDS.CHINA_EQUITY_CASH:
    case MARKET_SESSION_IDS.HONG_KONG_EQUITY_CASH:
    case MARKET_SESSION_IDS.TAIWAN_EQUITY_CASH:
    case MARKET_SESSION_IDS.SOUTH_KOREA_EQUITY_CASH:
    case MARKET_SESSION_IDS.INDIA_EQUITY_CASH:
    case MARKET_SESSION_IDS.AUSTRALIA_EQUITY_CASH:
        return true;
    default:
        return false;
    }
}

function normalizeAssetCategory(assetCategory, ticker = null) {
    switch (assetCategory) {
    case ASSET_CATEGORIES.EQUITY:
    case ASSET_CATEGORIES.ETF:
    case ASSET_CATEGORIES.US_EQUITY:
    case ASSET_CATEGORIES.US_ETF:
    case ASSET_CATEGORIES.COMMODITY:
    case ASSET_CATEGORIES.FX:
    case ASSET_CATEGORIES.CRYPTO:
        return assetCategory;
    case 'us-equity':
    case 'us_equity':
        return ASSET_CATEGORIES.EQUITY;
    case 'us-etf':
    case 'us_etf':
        return ASSET_CATEGORIES.ETF;
    default:
        return inferAssetCategory(ticker);
    }
}

function normalizeCryptoProvider(cryptoProvider, assetCategory) {
    if (assetCategory !== ASSET_CATEGORIES.CRYPTO)
        return '';

    switch (cryptoProvider) {
    case CRYPTO_PROVIDERS.KRAKEN:
    case CRYPTO_PROVIDERS.HYPERLIQUID:
        return cryptoProvider;
    default:
        return getDefaultCryptoProvider();
    }
}

function clampInteger(value, min, max, fallback) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    if (!Number.isInteger(parsed))
        return fallback;

    return Math.min(max, Math.max(min, parsed));
}

function normalizeTickerSymbolForProvider(symbol, rawLiveSymbol, cryptoProvider) {
    const adapter = getCryptoProviderAdapter(cryptoProvider);
    const liveSymbol = adapter.normalizeLiveSymbol(rawLiveSymbol);

    if (liveSymbol !== '')
        return adapter.normalizeTickerSymbol(liveSymbol);

    return symbol;
}

function normalizeTickerSymbol(symbol, rawLiveSymbol, cryptoProvider = CRYPTO_PROVIDERS.KRAKEN) {
    return normalizeTickerSymbolForProvider(symbol, rawLiveSymbol, cryptoProvider);
}

function getSupportedLiveSymbol(ticker, rawLiveSymbol) {
    /*
     * This isolates backward compatibility for crypto tickers that were saved
     * before runtime catalog discovery and provider-aware normalization were
     * introduced more broadly across prefs and quote loading.
     */
    const explicitLiveSymbol = normalizeCryptoLiveSymbol(rawLiveSymbol, ticker.cryptoProvider);

    if (
        ticker.assetCategory === ASSET_CATEGORIES.CRYPTO &&
        explicitLiveSymbol !== ''
    ) {
        return explicitLiveSymbol;
    }

    const supportedTicker = SUPPORTED_LIVE_TICKERS.find(candidate =>
        candidate.label === ticker.label &&
        candidate.symbol === ticker.symbol &&
        candidate.marketSessionId === ticker.marketSessionId &&
        candidate.assetCategory === ticker.assetCategory &&
        candidate.cryptoProvider === ticker.cryptoProvider &&
        (explicitLiveSymbol === '' || explicitLiveSymbol === candidate.liveSymbol)
    );

    return supportedTicker?.liveSymbol ?? '';
}

function hasKnownCryptoProvider(cryptoProvider) {
    switch (cryptoProvider) {
    case CRYPTO_PROVIDERS.KRAKEN:
    case CRYPTO_PROVIDERS.HYPERLIQUID:
        return true;
    default:
        return false;
    }
}

function normalizeCryptoLiveSymbol(rawLiveSymbol, cryptoProvider) {
    return getCryptoProviderAdapter(cryptoProvider).normalizeLiveSymbol(rawLiveSymbol);
}
