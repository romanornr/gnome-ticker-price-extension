import {ASSET_CATEGORIES, MARKET_TYPES} from '../asset-categories.js';

const US_ETF_TICKER_DEFINITIONS = [
    {
        label: 'ARKK',
        symbol: 'arkk.us',
        keywords: ['ark innovation etf', 'ark'],
    },
    {
        label: 'BIL',
        symbol: 'bil.us',
        keywords: ['treasury bill etf', 'cash etf'],
    },
    {
        label: 'DIA',
        symbol: 'dia.us',
        keywords: ['dow etf', 'dow jones'],
    },
    {
        label: 'EEM',
        symbol: 'eem.us',
        keywords: ['emerging markets etf', 'emerging markets'],
    },
    {
        label: 'EFA',
        symbol: 'efa.us',
        keywords: ['developed markets etf', 'eafe'],
    },
    {
        label: 'GLD',
        symbol: 'gld.us',
        keywords: ['gold etf'],
    },
    {
        label: 'GDX',
        symbol: 'gdx.us',
        keywords: ['gold miners etf', 'gold miners'],
    },
    {
        label: 'HYG',
        symbol: 'hyg.us',
        keywords: ['high yield bond etf', 'junk bonds'],
    },
    {
        label: 'IAU',
        symbol: 'iau.us',
        keywords: ['gold trust etf', 'gold etf'],
    },
    {
        label: 'IEF',
        symbol: 'ief.us',
        keywords: ['7-10 year treasury etf', 'treasury bonds'],
    },
    {
        label: 'IEFA',
        symbol: 'iefa.us',
        keywords: ['core msci eafe etf', 'developed markets'],
    },
    {
        label: 'IEMG',
        symbol: 'iemg.us',
        keywords: ['core emerging markets etf', 'emerging markets'],
    },
    {
        label: 'IJH',
        symbol: 'ijh.us',
        keywords: ['mid cap etf', 'midcap'],
    },
    {
        label: 'IJR',
        symbol: 'ijr.us',
        keywords: ['small cap etf', 'small cap'],
    },
    {
        label: 'ITB',
        symbol: 'itb.us',
        keywords: ['homebuilders etf', 'home builders'],
    },
    {
        label: 'IWM',
        symbol: 'iwm.us',
        keywords: ['russell 2000', 'small cap'],
    },
    {
        label: 'IVV',
        symbol: 'ivv.us',
        keywords: ['ishares core s&p 500', 's&p 500 etf'],
    },
    {
        label: 'JEPI',
        symbol: 'jepi.us',
        keywords: ['income etf', 'covered call'],
    },
    {
        label: 'JEPQ',
        symbol: 'jepq.us',
        keywords: ['nasdaq income etf', 'covered call'],
    },
    {
        label: 'KRE',
        symbol: 'kre.us',
        keywords: ['regional banks etf', 'regional banks'],
    },
    {
        label: 'LQD',
        symbol: 'lqd.us',
        keywords: ['investment grade bonds etf', 'corporate bonds'],
    },
    {
        label: 'QQQ',
        symbol: 'qqq.us',
        keywords: ['nasdaq 100 etf', 'invesco qqq'],
    },
    {
        label: 'SCHD',
        symbol: 'schd.us',
        keywords: ['dividend etf', 'schwab dividend'],
    },
    {
        label: 'SCHG',
        symbol: 'schg.us',
        keywords: ['growth etf', 'schwab growth'],
    },
    {
        label: 'SLV',
        symbol: 'slv.us',
        keywords: ['silver etf'],
    },
    {
        label: 'SMH',
        symbol: 'smh.us',
        keywords: ['semiconductor etf', 'chips'],
    },
    {
        label: 'SOXX',
        symbol: 'soxx.us',
        keywords: ['semiconductor etf', 'ishares semiconductor'],
    },
    {
        label: 'SPY',
        symbol: 'spy.us',
        keywords: ['s&p 500 etf', 'spdr'],
    },
    {
        label: 'TLT',
        symbol: 'tlt.us',
        keywords: ['treasury', 'bonds'],
    },
    {
        label: 'USO',
        symbol: 'uso.us',
        keywords: ['oil etf', 'crude oil'],
    },
    {
        label: 'VEA',
        symbol: 'vea.us',
        keywords: ['developed markets etf', 'vanguard developed markets'],
    },
    {
        label: 'VGT',
        symbol: 'vgt.us',
        keywords: ['information technology etf', 'tech etf'],
    },
    {
        label: 'VOO',
        symbol: 'voo.us',
        keywords: ['vanguard s&p 500', 's&p 500 etf'],
    },
    {
        label: 'VTI',
        symbol: 'vti.us',
        keywords: ['total stock market'],
    },
    {
        label: 'VTV',
        symbol: 'vtv.us',
        keywords: ['value etf', 'vanguard value'],
    },
    {
        label: 'VUG',
        symbol: 'vug.us',
        keywords: ['growth etf', 'vanguard growth'],
    },
    {
        label: 'VXUS',
        symbol: 'vxus.us',
        keywords: ['international stock etf', 'international equities'],
    },
    {
        label: 'XBI',
        symbol: 'xbi.us',
        keywords: ['biotech etf', 'biotechnology'],
    },
    {
        label: 'XLE',
        symbol: 'xle.us',
        keywords: ['energy'],
    },
    {
        label: 'XLF',
        symbol: 'xlf.us',
        keywords: ['financials'],
    },
    {
        label: 'XLK',
        symbol: 'xlk.us',
        keywords: ['technology etf', 'tech sector'],
    },
    {
        label: 'XLP',
        symbol: 'xlp.us',
        keywords: ['consumer staples etf', 'staples'],
    },
    {
        label: 'XLU',
        symbol: 'xlu.us',
        keywords: ['utilities etf', 'utilities'],
    },
    {
        label: 'XLV',
        symbol: 'xlv.us',
        keywords: ['health care etf', 'healthcare'],
    },
    {
        label: 'XLY',
        symbol: 'xly.us',
        keywords: ['consumer discretionary etf', 'discretionary'],
    },
    {
        label: 'XOP',
        symbol: 'xop.us',
        keywords: ['oil gas explorers etf', 'exploration and production'],
    },
];

export const US_ETF_TICKERS = US_ETF_TICKER_DEFINITIONS.map(entry => ({
    assetCategory: ASSET_CATEGORIES.US_ETF,
    label: entry.label,
    symbol: entry.symbol,
    priceDecimals: 2,
    marketType: MARKET_TYPES.US_SESSION,
    keywords: [...entry.keywords],
}));
