import {getAssetCategorySearchTerms} from './asset-categories.js';
import {COMMODITY_TICKERS} from './catalog/commodity.js';
import {CRYPTO_TICKERS} from './catalog/crypto.js';
import {FX_TICKERS} from './catalog/fx.js';
import {US_ETF_TICKERS} from './catalog/us-etf.js';
import {US_EQUITY_TICKERS} from './catalog/us-equity.js';

const CATALOG = [
    ...US_EQUITY_TICKERS,
    ...US_ETF_TICKERS,
    ...COMMODITY_TICKERS,
    ...FX_TICKERS,
    ...CRYPTO_TICKERS,
];

export function getCuratedTickersForCategory(assetCategory) {
    return CATALOG
        .filter(entry => entry.assetCategory === assetCategory)
        .map(cloneCatalogEntry);
}

export function getCuratedTickerCategories() {
    return Array.from(new Set(CATALOG.map(entry => entry.assetCategory)));
}

export function findCuratedTicker({label = '', symbol = '', assetCategory = ''}) {
    const normalizedLabel = label.trim().toLowerCase();
    const normalizedSymbol = symbol.trim().toLowerCase();

    const match = CATALOG.find(entry =>
        entry.assetCategory === assetCategory &&
        entry.label.toLowerCase() === normalizedLabel &&
        entry.symbol.toLowerCase() === normalizedSymbol
    );

    return match ? cloneCatalogEntry(match) : null;
}

export function matchCuratedTickers(assetCategory, query) {
    const normalizedQuery = `${query ?? ''}`.trim().toLowerCase();
    return getCuratedTickersForCategory(assetCategory).filter(entry => matchesCuratedTicker(entry, normalizedQuery));
}

function matchesCuratedTicker(entry, normalizedQuery) {
    if (normalizedQuery === '')
        return true;

    const haystack = [
        entry.label,
        entry.symbol,
        ...(entry.keywords ?? []),
        ...getAssetCategorySearchTerms(entry.assetCategory),
    ].map(value => `${value}`.toLowerCase());

    return haystack.some(value =>
        value.includes(normalizedQuery) ||
        isSubsequenceMatch(value, normalizedQuery)
    );
}

function cloneCatalogEntry(entry) {
    return {
        ...entry,
        keywords: [...(entry.keywords ?? [])],
    };
}

function isSubsequenceMatch(value, query) {
    if (query.length < 2)
        return false;

    let queryIndex = 0;
    for (const character of value) {
        if (character === query[queryIndex])
            queryIndex += 1;

        if (queryIndex === query.length)
            return true;
    }

    return false;
}
