import {CRYPTO_PROVIDERS, getDefaultCryptoProvider} from '../asset-categories.js';
import {hyperliquidAdapter} from './hyperliquid-adapter.js';
import {krakenAdapter} from './kraken-adapter.js';

/*
 * This module is the orchestration-facing switchboard for crypto providers.
 *
 * Higher layers such as ticker normalization, prefs search, and catalog loading
 * resolve provider behavior here so they depend on one deliberate adapter seam
 * instead of importing scattered Kraken or Hyperliquid helpers directly.
 */
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
