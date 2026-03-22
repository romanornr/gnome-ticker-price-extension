import {ASSET_CATEGORIES, CRYPTO_PROVIDERS} from '../asset-categories.js';
import {findCuratedTicker, matchCuratedTickers, resolveCryptoCatalogTicker} from '../ticker-catalog.js';
import {getDefaultCryptoProvider, getMarketTypeForAssetCategory} from '../settings.js';

export function getCryptoSearchQuery(labelText, symbolText) {
    return symbolText.trim() || labelText.trim();
}

export function getSuggestionsDescription(assetCategory, cryptoProvider) {
    if (assetCategory !== ASSET_CATEGORIES.CRYPTO)
        return 'Type a label or symbol above to search the built-in catalog. You can still save any custom Stooq symbol.';

    return cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
        ? 'Search live Hyperliquid spot symbols and perps. Non-crypto assets still use the built-in catalog.'
        : 'Search live Kraken WebSocket pairs. Non-crypto assets still use the built-in catalog.';
}

export function getCatalogOptions(cryptoCatalog, cryptoProvider) {
    return {
        cryptoCatalog: Array.isArray(cryptoCatalog) ? cryptoCatalog : [],
        cryptoProvider,
    };
}

export function resolveSelectedCryptoTicker({
    assetCategory,
    cryptoCatalog,
    cryptoProvider,
    labelText,
    symbolText,
}) {
    if (assetCategory !== ASSET_CATEGORIES.CRYPTO || !Array.isArray(cryptoCatalog))
        return null;

    const query = getCryptoSearchQuery(labelText, symbolText);
    if (query === '')
        return null;

    const exactMatch = findCuratedTicker({
        label: labelText.trim(),
        symbol: query,
        assetCategory,
    }, getCatalogOptions(cryptoCatalog, cryptoProvider));

    return exactMatch ?? resolveCryptoCatalogTicker(query, cryptoCatalog, cryptoProvider);
}

export function validateTickerDraft(label, symbol, options = {}) {
    if (options.assetCategory === ASSET_CATEGORIES.CRYPTO) {
        if (symbol.trim() === '')
            return 'Symbol is required.';

        if (options.cryptoCatalogLoading) {
            return options.cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
                ? 'Hyperliquid crypto symbols are still loading.'
                : 'Kraken crypto pairs are still loading.';
        }

        if (options.cryptoCatalogError) {
            return options.cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
                ? 'Hyperliquid crypto symbols could not be loaded.'
                : 'Kraken crypto pairs could not be loaded.';
        }

        if (!options.resolvedCryptoTicker && options.hasCryptoCatalogMatches) {
            return options.cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
                ? 'Keep typing or choose a suggested Hyperliquid spot symbol or perp.'
                : 'Keep typing or choose a suggested Kraken pair.';
        }

        if (!options.resolvedCryptoTicker) {
            return options.cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
                ? 'Choose a Hyperliquid-supported spot symbol or perp.'
                : 'Choose a Kraken-supported crypto pair.';
        }

        return '';
    }

    if (label.trim() === '')
        return 'Label is required.';

    return validateTickerSymbol(symbol);
}

export function validateTickerSymbol(symbol) {
    if (symbol.trim() === '')
        return 'Symbol is required.';

    if (/\s/.test(symbol))
        return 'Symbol cannot contain spaces.';

    return '';
}

export function buildTickerConfig({
    initialTicker,
    labelText,
    symbolText,
    priceDecimals,
    panelSide,
    assetCategory,
    cryptoProvider,
    resolvedCryptoTicker,
    cryptoCatalog,
}) {
    const effectiveLabel = assetCategory === ASSET_CATEGORIES.CRYPTO && labelText.trim() === ''
        ? (resolvedCryptoTicker?.label ?? '')
        : labelText.trim();
    const effectiveSymbol = assetCategory === ASSET_CATEGORIES.CRYPTO
        ? (resolvedCryptoTicker?.liveSymbol ?? symbolText.trim())
        : symbolText.trim().toLowerCase();
    const matchingCuratedTicker = findCuratedTicker({
        label: effectiveLabel,
        symbol: effectiveSymbol,
        assetCategory,
    }, getCatalogOptions(cryptoCatalog, cryptoProvider));

    const nextTicker = {
        ...initialTicker,
        label: effectiveLabel,
        symbol: assetCategory === ASSET_CATEGORIES.CRYPTO
            ? (resolvedCryptoTicker?.symbol ?? symbolText.trim().toLowerCase())
            : symbolText.trim().toLowerCase(),
        priceDecimals,
        panelSide,
        marketType: getMarketTypeForAssetCategory(assetCategory),
        assetCategory,
    };

    if (assetCategory === ASSET_CATEGORIES.CRYPTO) {
        nextTicker.cryptoProvider = cryptoProvider || getDefaultCryptoProvider();
        nextTicker.liveSymbol = resolvedCryptoTicker?.liveSymbol ?? matchingCuratedTicker?.liveSymbol ?? '';
    } else {
        delete nextTicker.cryptoProvider;
        if (matchingCuratedTicker?.liveSymbol)
            nextTicker.liveSymbol = matchingCuratedTicker.liveSymbol;
        else
            delete nextTicker.liveSymbol;
    }

    return nextTicker;
}

export function getCryptoVerificationFailureMessage(cryptoProvider) {
    return cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
        ? 'Choose a Hyperliquid-supported spot symbol or perp before saving.'
        : 'Choose a Kraken-supported pair before saving.';
}

export function getCryptoVerificationSuccessMessage(cryptoProvider, liveSymbol) {
    return cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
        ? `Verified ${liveSymbol}. Hyperliquid supports this market.`
        : `Verified ${liveSymbol}. Kraken WebSocket supports this pair.`;
}

export function getCryptoCatalogLoadingMessage(cryptoProvider) {
    return cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
        ? 'Fetching live Hyperliquid spot symbols and perps for search and verification.'
        : 'Fetching active Kraken WebSocket pairs for search and verification.';
}

export function getCryptoCatalogUnavailableTitle(cryptoProvider) {
    return cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
        ? 'Hyperliquid crypto catalog unavailable'
        : 'Kraken crypto catalog unavailable';
}

export function getCryptoSearchPrompt(cryptoProvider) {
    return cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
        ? 'Type a perp like BTC or a spot pair like PURR/USDC.'
        : 'Type a base asset or pair like SOL, SOLUSD, or SOL/USD.';
}

export function getCryptoEmptyStateSubtitle(cryptoProvider) {
    return cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
        ? 'Type an exact Hyperliquid perp like BTC or a spot pair like PURR/USDC.'
        : 'Type an exact Kraken WebSocket pair like SOL/USD, or keep searching.';
}

export function getCatalogMatches(assetCategory, query, cryptoCatalog, cryptoProvider) {
    return matchCuratedTickers(assetCategory, query, getCatalogOptions(cryptoCatalog, cryptoProvider));
}
