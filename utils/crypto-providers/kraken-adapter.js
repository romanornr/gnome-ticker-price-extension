import {CRYPTO_PROVIDERS} from '../asset-categories.js';
import {
    createKrakenCatalogEntry,
    KRAKEN_WEBSOCKET_URL,
    loadKrakenSpotPairs,
} from './kraken/catalog.js';
import {createKrakenQuote} from './kraken/quotes.js';
import {
    normalizeKrakenLiveSymbol,
    normalizeKrakenTickerSymbol,
    scoreKrakenCatalogEntry,
} from './kraken/symbols.js';

/*
 * This module is the Kraken provider adapter implementation.
 *
 * It owns Kraken-specific discovery, symbol normalization, catalog scoring,
 * and runtime transport metadata. Higher layers import the adapter or its
 * exported helpers from here so Kraken behavior lives behind one provider
 * boundary instead of a legacy utility module.
 */
export {
    createKrakenCatalogEntry,
    createKrakenQuote,
    KRAKEN_WEBSOCKET_URL,
    loadKrakenSpotPairs,
    normalizeKrakenLiveSymbol,
    normalizeKrakenTickerSymbol,
    scoreKrakenCatalogEntry,
};

/* Runtime layers use this adapter object for shared provider capabilities and metadata. */
export const krakenAdapter = {
    provider: CRYPTO_PROVIDERS.KRAKEN,
    websocketUrl: KRAKEN_WEBSOCKET_URL,
    loadCatalog: loadKrakenSpotPairs,
    normalizeLiveSymbol: normalizeKrakenLiveSymbol,
    normalizeTickerSymbol: normalizeKrakenTickerSymbol,
    scoreCatalogEntry: scoreKrakenCatalogEntry,
    createQuote: createKrakenQuote,
};
