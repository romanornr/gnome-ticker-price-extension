import {getAssetCategorySearchTerms} from './asset-categories.js';
import {COMMODITY_TICKERS} from './catalog/commodity.js';
import {CRYPTO_TICKERS} from './catalog/crypto.js';
import {FX_TICKERS} from './catalog/fx.js';
import {US_ETF_TICKERS} from './catalog/us-etf.js';
import {US_EQUITY_TICKERS} from './catalog/us-equity.js';
import {ASSET_CATEGORIES} from './asset-categories.js';
import {scoreKrakenCatalogEntry} from './kraken.js';

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

export function findCuratedTicker({label = '', symbol = '', assetCategory = ''}, options = {}) {
    const normalizedLabel = label.trim().toLowerCase();
    const normalizedSymbol = symbol.trim().toLowerCase();

    const match = getCatalogForCategory(assetCategory, options).find(entry => {
        if (assetCategory === ASSET_CATEGORIES.CRYPTO) {
            const exactSymbols = [
                entry.symbol,
                entry.liveSymbol,
                entry.label,
            ].map(value => `${value ?? ''}`.trim().toLowerCase());

            return exactSymbols.includes(normalizedSymbol) &&
                (normalizedLabel === '' || entry.label.toLowerCase() === normalizedLabel);
        }

        return entry.label.toLowerCase() === normalizedLabel &&
            entry.symbol.toLowerCase() === normalizedSymbol;
    });

    return match ? cloneCatalogEntry(match) : null;
}

export function matchCuratedTickers(assetCategory, query, options = {}) {
    const normalizedQuery = `${query ?? ''}`.trim().toLowerCase();
    return getCatalogForCategory(assetCategory, options)
        .map(entry => ({
            entry,
            score: scoreCuratedTicker(entry, assetCategory, normalizedQuery),
        }))
        .filter(match => match.score >= 0)
        .sort((left, right) => right.score - left.score || left.entry.label.localeCompare(right.entry.label))
        .map(match => cloneCatalogEntry(match.entry));
}

export function resolveCryptoCatalogTicker(query, cryptoCatalog = []) {
    const matches = matchCuratedTickers(ASSET_CATEGORIES.CRYPTO, query, {cryptoCatalog});
    if (matches.length === 0)
        return null;

    const [firstMatch, secondMatch] = matches;
    if (!firstMatch)
        return null;

    if (!secondMatch)
        return firstMatch;

    const firstScore = scoreKrakenCatalogEntry(firstMatch, query);
    const secondScore = scoreKrakenCatalogEntry(secondMatch, query);

    return firstScore > secondScore ? firstMatch : null;
}

function scoreCuratedTicker(entry, assetCategory, normalizedQuery) {
    if (normalizedQuery === '')
        return Number.NEGATIVE_INFINITY;

    if (assetCategory === ASSET_CATEGORIES.CRYPTO && entry.liveSymbol)
        return scoreKrakenCatalogEntry(entry, normalizedQuery);

    const haystack = [
        entry.label,
        entry.symbol,
        ...(entry.keywords ?? []),
        ...getAssetCategorySearchTerms(entry.assetCategory),
    ].map(value => `${value}`.toLowerCase());

    if (haystack.some(value => value === normalizedQuery))
        return 500;

    if (haystack.some(value => value.startsWith(normalizedQuery)))
        return 350;

    if (haystack.some(value => value.includes(normalizedQuery)))
        return 250;

    if (haystack.some(value => isSubsequenceMatch(value, normalizedQuery)))
        return 150;

    return -1;
}

function getCatalogForCategory(assetCategory, options = {}) {
    const cryptoCatalog = Array.isArray(options.cryptoCatalog)
        ? options.cryptoCatalog
        : null;

    if (assetCategory === ASSET_CATEGORIES.CRYPTO && cryptoCatalog)
        return cryptoCatalog.map(cloneCatalogEntry);

    return getCuratedTickersForCategory(assetCategory);
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
