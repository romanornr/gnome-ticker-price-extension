import {ASSET_CATEGORIES, MARKET_TYPES} from '../asset-categories.js';

/* Curated commodity suggestions feed prefs search and sensible default metadata for weekday-session commodities. */
export const COMMODITY_TICKERS = [
    {
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        label: 'Copper',
        symbol: 'hg.f',
        priceDecimals: 2,
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        keywords: ['copper futures'],
    },
    {
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        label: 'Gold',
        symbol: 'xauusd',
        priceDecimals: 0,
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        keywords: ['xau', 'spot gold'],
    },
    {
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        label: 'Natural Gas',
        symbol: 'ng.f',
        priceDecimals: 2,
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        keywords: ['nat gas', 'gas futures'],
    },
    {
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        label: 'Palladium',
        symbol: 'pa.f',
        priceDecimals: 2,
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        keywords: ['palladium futures'],
    },
    {
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        label: 'Platinum',
        symbol: 'pl.f',
        priceDecimals: 2,
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        keywords: ['platinum futures'],
    },
    {
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        label: 'Silver',
        symbol: 'xagusd',
        priceDecimals: 2,
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        keywords: ['xag', 'spot silver'],
    },
    {
        assetCategory: ASSET_CATEGORIES.COMMODITY,
        label: 'WTI Crude',
        symbol: 'cl.f',
        priceDecimals: 2,
        marketType: MARKET_TYPES.WEEKDAY_SESSION,
        keywords: ['oil', 'crude', 'wti'],
    },
];
