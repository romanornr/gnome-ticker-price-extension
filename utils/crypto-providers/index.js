import {CRYPTO_PROVIDERS, getDefaultCryptoProvider} from '../asset-categories.js';
import * as hyperliquidCatalog from './hyperliquid/catalog.js';
import {createHyperliquidQuote} from './hyperliquid/quotes.js';
import * as hyperliquidSymbols from './hyperliquid/symbols.js';
import * as krakenCatalog from './kraken/catalog.js';
import * as krakenQuotes from './kraken/quotes.js';
import * as krakenSymbols from './kraken/symbols.js';

/*
 * This module composes and selects the crypto provider adapters.
 *
 * Higher layers such as ticker normalization, prefs search, and catalog loading
 * resolve provider behavior here so they depend on one deliberate adapter seam
 * instead of importing scattered Kraken or Hyperliquid helpers directly.
 */
export const krakenAdapter = {
    provider: CRYPTO_PROVIDERS.KRAKEN,
    websocketUrl: krakenCatalog.KRAKEN_WEBSOCKET_URL,
    loadCatalog: krakenCatalog.loadKrakenSpotPairs,
    normalizeLiveSymbol: krakenSymbols.normalizeKrakenLiveSymbol,
    normalizeTickerSymbol: krakenSymbols.normalizeKrakenTickerSymbol,
    scoreCatalogEntry: krakenSymbols.scoreKrakenCatalogEntry,
    createQuote: krakenQuotes.createKrakenQuote,
    fetchTickerQuotes: krakenQuotes.fetchKrakenTickerQuotes,
};

export const hyperliquidAdapter = {
    provider: CRYPTO_PROVIDERS.HYPERLIQUID,
    websocketUrl: hyperliquidCatalog.HYPERLIQUID_WEBSOCKET_URL,
    loadCatalog: hyperliquidCatalog.loadHyperliquidMarkets,
    normalizeLiveSymbol: hyperliquidSymbols.normalizeHyperliquidLiveSymbol,
    normalizeTickerSymbol: hyperliquidSymbols.normalizeHyperliquidTickerSymbol,
    scoreCatalogEntry: hyperliquidSymbols.scoreHyperliquidCatalogEntry,
    createQuote: createHyperliquidQuote,
    fetchMarketSnapshots: hyperliquidCatalog.fetchHyperliquidMarketSnapshots,
};

const ADAPTERS = {
    [CRYPTO_PROVIDERS.KRAKEN]: krakenAdapter,
    [CRYPTO_PROVIDERS.HYPERLIQUID]: hyperliquidAdapter,
};

/* Callers resolve provider behavior here so fallback policy stays centralized. */
export function getCryptoProviderAdapter(cryptoProvider) {
    return ADAPTERS[cryptoProvider] ?? ADAPTERS[getDefaultCryptoProvider()];
}

/* prefs catalog loading goes through the shared adapter seam instead of provider branching. */
export function loadCryptoProviderCatalog(cryptoProvider) {
    return getCryptoProviderAdapter(cryptoProvider).loadCatalog();
}
