import {ASSET_CATEGORIES} from '../asset-categories.js';
import {MARKET_SESSION_IDS} from '../market-sessions.js';

/* This file is the curated Netherlands equity suggestion source used by prefs search and Europe cash-session defaults. */
const NETHERLANDS_EQUITY_TICKER_DEFINITIONS = [
    {
        label: 'ADYEN',
        symbol: 'adyen.nl',
        keywords: ['adyen'],
    },
    {
        label: 'ASML',
        symbol: 'asml.nl',
        keywords: ['asml'],
    },
    {
        label: 'HEIA',
        symbol: 'heia.nl',
        keywords: ['heineken'],
    },
    {
        label: 'INGA',
        symbol: 'inga.nl',
        keywords: ['ing'],
    },
    {
        label: 'PRX',
        symbol: 'prx.nl',
        keywords: ['prosus'],
    },
];

export const NETHERLANDS_EQUITY_TICKERS = NETHERLANDS_EQUITY_TICKER_DEFINITIONS.map(entry => ({
    assetCategory: ASSET_CATEGORIES.EQUITY,
    label: entry.label,
    symbol: entry.symbol,
    priceDecimals: entry.priceDecimals ?? 2,
    marketSessionId: MARKET_SESSION_IDS.EUROPE_EQUITY_CASH,
    keywords: [...entry.keywords],
}));
