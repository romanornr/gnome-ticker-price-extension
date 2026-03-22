import {CRYPTO_PROVIDERS} from '../asset-categories.js';
import {loadHyperliquidMarkets} from '../hyperliquid.js';
import {loadKrakenSpotPairs} from '../kraken.js';
import {
    getCatalogMatches,
    getCryptoCatalogLoadingMessage,
    getCryptoCatalogUnavailableTitle,
    getCryptoEmptyStateSubtitle,
    getCryptoSearchPrompt,
    getCryptoSearchQuery,
} from './ticker-dialog-state.js';

/*
 * This helper turns current dialog state into suggestion-row models.
 *
 * The controller owns widget state; this file owns the pure "what suggestions
 * should be shown right now?" logic plus the provider-specific market catalog
 * loading entrypoint.
 */
/* The dialog controller calls this provider switchboard to load the correct runtime crypto catalog. */
export async function loadCryptoCatalog(cryptoProvider) {
    return cryptoProvider === CRYPTO_PROVIDERS.HYPERLIQUID
        ? loadHyperliquidMarkets()
        : loadKrakenSpotPairs();
}

/* The dialog controller uses this pure row-model builder instead of mixing search policy into GTK widget code. */
export function buildCatalogSuggestionRows({
    assetCategory,
    cryptoProvider,
    cryptoCatalog,
    cryptoCatalogLoading,
    cryptoCatalogError,
    labelText,
    symbolText,
    maxSuggestions,
}) {
    const query = assetCategory === 'crypto'
        ? getCryptoSearchQuery(labelText, symbolText)
        : (symbolText.trim() || labelText.trim());

    if (assetCategory === 'crypto') {
        if (cryptoCatalogLoading) {
            return [{
                kind: 'info',
                title: 'Loading crypto pairs',
                subtitle: getCryptoCatalogLoadingMessage(cryptoProvider),
            }];
        }

        if (cryptoCatalogError !== '') {
            return [{
                kind: 'info',
                title: getCryptoCatalogUnavailableTitle(cryptoProvider),
                subtitle: cryptoCatalogError,
            }];
        }
    }

    if (query === '') {
        return [{
            kind: 'info',
            title: 'Start typing to search',
            subtitle: assetCategory === 'crypto'
                ? getCryptoSearchPrompt(cryptoProvider)
                : 'Curated matches stay hidden until you enter a label or symbol.',
        }];
    }

    const matches = getCatalogMatches(assetCategory, query, cryptoCatalog, cryptoProvider);
    if (matches.length === 0) {
        return [{
            kind: 'info',
            title: 'No curated matches',
            subtitle: assetCategory === 'crypto'
                ? getCryptoEmptyStateSubtitle(cryptoProvider)
                : 'Keep your manual symbol and use Verify to check whether Stooq returns data for it.',
        }];
    }

    const rows = matches.slice(0, maxSuggestions).map(curatedTicker => {
        const keywordText = (curatedTicker.keywords ?? []).slice(0, 3).join(' · ');
        const subtitle = keywordText === ''
            ? `${curatedTicker.liveSymbol ?? curatedTicker.symbol} · ${curatedTicker.priceDecimals} decimals`
            : `${curatedTicker.liveSymbol ?? curatedTicker.symbol} · ${curatedTicker.priceDecimals} decimals · ${keywordText}`;

        return {
            kind: 'match',
            title: curatedTicker.label,
            subtitle,
            curatedTicker,
        };
    });

    if (matches.length > maxSuggestions) {
        rows.push({
            kind: 'info',
            title: `Showing first ${maxSuggestions} matches`,
            subtitle: 'Keep typing to narrow the catalog results.',
        });
    }

    return rows;
}
