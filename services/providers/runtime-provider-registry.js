import {CRYPTO_PROVIDERS} from '../../utils/asset-categories.js';
import {
    HyperliquidLiveProvider,
    refresh as refreshHyperliquidQuotes,
} from './hyperliquid-live.js';
import {KrakenLiveProvider} from './kraken-live.js';
import {
    isLiveCryptoTicker,
    isLiveCryptoTickerForProvider,
} from './live-quote-provider.js';
import {refresh as refreshStooqQuotes} from './stooq.js';

/*
 * This module is the runtime provider registry used by QuotesService.
 *
 * It intentionally stays small: the goal is to centralize provider ownership,
 * lifecycle wiring, and fallback-refresh capabilities without hiding all
 * provider differences behind a broad generic abstraction.
 */

/* QuotesService builds the runtime provider set once so orchestration logic can iterate one registry. */
export function createRuntimeProviderRegistry({uuid, quoteStore, onQuotes, onStale}) {
    const krakenLiveProvider = new KrakenLiveProvider({uuid, onQuotes, onStale});
    const hyperliquidLiveProvider = new HyperliquidLiveProvider({uuid, quoteStore, onQuotes, onStale});

    return [
        {
            id: 'stooq',
            ownsTicker: ticker => !isLiveCryptoTicker(ticker),
            refreshFallback: (tickers, context) => refreshStooqQuotes(tickers, context),
        },
        {
            id: CRYPTO_PROVIDERS.KRAKEN,
            provider: krakenLiveProvider,
            ownsTicker: isKrakenRuntimeTicker,
        },
        {
            id: CRYPTO_PROVIDERS.HYPERLIQUID,
            provider: hyperliquidLiveProvider,
            ownsTicker: isHyperliquidRuntimeTicker,
            hasPollingFallback: providerEntry => !providerEntry.provider.isConnected(),
            refreshFallback: (tickers, context) => refreshHyperliquidQuotes(tickers, context),
        },
    ];
}

/* QuotesService asks each provider entry for its current fallback-refresh candidates through this helper. */
export function getProviderRefreshPlan(tickers, providerEntries) {
    return providerEntries
        .map(providerEntry => ({
            providerEntry,
            tickers: tickers.filter(ticker => providerEntry.ownsTicker(ticker)),
        }))
        .filter(plan => plan.tickers.length > 0)
        .filter(plan => {
            if (!plan.providerEntry.refreshFallback) return false;

            if (!plan.providerEntry.hasPollingFallback) return true;

            return plan.providerEntry.hasPollingFallback(plan.providerEntry);
        });
}

/* Kraken ownership covers default/live Kraken crypto symbols. */
function isKrakenRuntimeTicker(ticker) {
    return isLiveCryptoTickerForProvider(ticker, CRYPTO_PROVIDERS.KRAKEN);
}

/* Hyperliquid ownership only applies to crypto symbols explicitly assigned there. */
function isHyperliquidRuntimeTicker(ticker) {
    return isLiveCryptoTickerForProvider(ticker, CRYPTO_PROVIDERS.HYPERLIQUID);
}
