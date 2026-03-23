import {ASSET_CATEGORIES} from '../asset-categories.js';
import {MARKET_SESSION_IDS} from '../market-sessions.js';

/* This file is the curated Germany equity suggestion source used by prefs search and Europe cash-session defaults. */
const GERMANY_EQUITY_TICKER_DEFINITIONS = [
    {
        label: 'ADS',
        symbol: 'ads.de',
        keywords: ['adidas'],
    },
    {
        label: 'ALV',
        symbol: 'alv.de',
        keywords: ['allianz'],
    },
    {
        label: 'BAS',
        symbol: 'bas.de',
        keywords: ['basf'],
    },
    {
        label: 'BMW',
        symbol: 'bmw.de',
        keywords: ['bmw', 'bayerische motoren werke'],
    },
    {
        label: 'DB1',
        symbol: 'db1.de',
        keywords: ['deutsche boerse', 'deutsche borse'],
    },
    {
        label: 'DTE',
        symbol: 'dte.de',
        keywords: ['deutsche telekom'],
    },
    {
        label: 'FRE',
        symbol: 'fre.de',
        keywords: ['fresenius'],
    },
    {
        label: 'IFX',
        symbol: 'ifx.de',
        keywords: ['infineon'],
    },
    {
        label: 'QIA',
        symbol: 'qia.de',
        keywords: ['qiagen'],
    },
    {
        label: 'RWE',
        symbol: 'rwe.de',
        keywords: ['rwe'],
    },
];

export const GERMANY_EQUITY_TICKERS = GERMANY_EQUITY_TICKER_DEFINITIONS.map(entry => ({
    assetCategory: ASSET_CATEGORIES.EQUITY,
    label: entry.label,
    symbol: entry.symbol,
    priceDecimals: entry.priceDecimals ?? 2,
    marketSessionId: MARKET_SESSION_IDS.EUROPE_EQUITY_CASH,
    keywords: [...entry.keywords],
}));
