import {CRYPTO_PROVIDERS} from '../asset-categories.js';
import {
    fetchHyperliquidMarketSnapshots,
    HYPERLIQUID_API_URL,
    HYPERLIQUID_WEBSOCKET_URL,
    loadHyperliquidMarkets,
    postHyperliquidInfo,
} from './hyperliquid/catalog.js';
import {createHyperliquidQuote} from './hyperliquid/quotes.js';
import {
    isHyperliquidSpotSymbol,
    normalizeHyperliquidLiveSymbol,
    normalizeHyperliquidTickerSymbol,
    scoreHyperliquidCatalogEntry,
} from './hyperliquid/symbols.js';

/*
 * This module is the Hyperliquid provider adapter implementation.
 *
 * It owns Hyperliquid-specific market discovery, symbol normalization, catalog
 * scoring, quote normalization, and transport helpers. Both prefs-side catalog
 * flows and runtime quote providers depend on this module so Hyperliquid
 * behavior stays behind one provider boundary.
 */
export {
    createHyperliquidQuote,
    fetchHyperliquidMarketSnapshots,
    HYPERLIQUID_API_URL,
    HYPERLIQUID_WEBSOCKET_URL,
    isHyperliquidSpotSymbol,
    loadHyperliquidMarkets,
    normalizeHyperliquidLiveSymbol,
    normalizeHyperliquidTickerSymbol,
    postHyperliquidInfo,
    scoreHyperliquidCatalogEntry,
};

/* Runtime layers use this adapter object for both shared and Hyperliquid-specific capabilities. */
export const hyperliquidAdapter = {
    provider: CRYPTO_PROVIDERS.HYPERLIQUID,
    websocketUrl: HYPERLIQUID_WEBSOCKET_URL,
    loadCatalog: loadHyperliquidMarkets,
    normalizeLiveSymbol: normalizeHyperliquidLiveSymbol,
    normalizeTickerSymbol: normalizeHyperliquidTickerSymbol,
    scoreCatalogEntry: scoreHyperliquidCatalogEntry,
    createQuote: createHyperliquidQuote,
    fetchMarketSnapshots: fetchHyperliquidMarketSnapshots,
};
