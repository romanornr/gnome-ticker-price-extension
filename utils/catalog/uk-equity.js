import {ASSET_CATEGORIES} from '../asset-categories.js';
import {MARKET_SESSION_IDS} from '../market-sessions.js';

/* This file is the curated U.K. equity suggestion source used by prefs search and U.K. cash-session defaults. */
const UK_EQUITY_TICKER_DEFINITIONS = [
    {
        label: 'BP',
        symbol: 'bp.uk',
        keywords: ['bp'],
    },
    {
        label: 'GSK',
        symbol: 'gsk.uk',
        keywords: ['gsk', 'glaxosmithkline'],
    },
    {
        label: 'HSBA',
        symbol: 'hsba.uk',
        keywords: ['hsbc'],
    },
    {
        label: 'LSEG',
        symbol: 'lseg.uk',
        keywords: ['london stock exchange group'],
    },
    {
        label: 'RKT',
        symbol: 'rkt.uk',
        keywords: ['reckitt', 'reckitt benckiser'],
    },
];

export const UK_EQUITY_TICKERS = UK_EQUITY_TICKER_DEFINITIONS.map(entry => ({
    assetCategory: ASSET_CATEGORIES.EQUITY,
    label: entry.label,
    symbol: entry.symbol,
    priceDecimals: entry.priceDecimals ?? 2,
    marketSessionId: MARKET_SESSION_IDS.UK_EQUITY_CASH,
    keywords: [...entry.keywords],
}));
