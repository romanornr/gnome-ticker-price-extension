import {ASSET_CATEGORIES} from '../asset-categories.js';
import {MARKET_SESSION_IDS} from '../market-sessions.js';

/* This file is the curated Japan equity suggestion source used by prefs search and Japan cash-session defaults. */
const JAPAN_EQUITY_TICKER_DEFINITIONS = [
    {
        label: '1301',
        symbol: '1301.jp',
        keywords: ['kyokuyo'],
    },
    {
        label: '1332',
        symbol: '1332.jp',
        keywords: ['nissui'],
    },
    {
        label: '1333',
        symbol: '1333.jp',
        keywords: ['umios'],
    },
    {
        label: '1605',
        symbol: '1605.jp',
        keywords: ['inpex'],
    },
    {
        label: '1721',
        symbol: '1721.jp',
        keywords: ['comsys holdings'],
    },
    {
        label: '1801',
        symbol: '1801.jp',
        keywords: ['taisei'],
    },
    {
        label: '1802',
        symbol: '1802.jp',
        keywords: ['obayashi'],
    },
    {
        label: '1803',
        symbol: '1803.jp',
        keywords: ['shimizu'],
    },
    {
        label: '1808',
        symbol: '1808.jp',
        keywords: ['haseko'],
    },
    {
        label: '1812',
        symbol: '1812.jp',
        keywords: ['kajima'],
    },
    {
        label: '1925',
        symbol: '1925.jp',
        keywords: ['daiwa house industry'],
    },
    {
        label: '1928',
        symbol: '1928.jp',
        keywords: ['sekisui house'],
    },
    {
        label: '1963',
        symbol: '1963.jp',
        keywords: ['jgc holdings'],
    },
    {
        label: '2002',
        symbol: '2002.jp',
        keywords: ['nisshin seifun group'],
    },
    {
        label: '2269',
        symbol: '2269.jp',
        keywords: ['meiji holdings'],
    },
    {
        label: '2282',
        symbol: '2282.jp',
        keywords: ['nh foods'],
    },
    {
        label: '2413',
        symbol: '2413.jp',
        keywords: ['m3'],
    },
    {
        label: '2432',
        symbol: '2432.jp',
        keywords: ['dena'],
    },
    {
        label: '2501',
        symbol: '2501.jp',
        keywords: ['sapporo holdings'],
    },
    {
        label: '2502',
        symbol: '2502.jp',
        keywords: ['asahi group holdings'],
    },
    {
        label: '2503',
        symbol: '2503.jp',
        keywords: ['kirin holdings company'],
    },
    {
        label: '2531',
        symbol: '2531.jp',
        keywords: ['takara holdings'],
    },
    {
        label: '2768',
        symbol: '2768.jp',
        keywords: ['sojitz'],
    },
    {
        label: '2801',
        symbol: '2801.jp',
        keywords: ['kikkoman'],
    },
    {
        label: '2802',
        symbol: '2802.jp',
        keywords: ['ajinomoto'],
    },
    {
        label: '2871',
        symbol: '2871.jp',
        keywords: ['nichirei'],
    },
    {
        label: '2914',
        symbol: '2914.jp',
        keywords: ['japan tobacco'],
    },
    {
        label: '3086',
        symbol: '3086.jp',
        keywords: ['j front retailing'],
    },
    {
        label: '3092',
        symbol: '3092.jp',
        keywords: ['zozo'],
    },
    {
        label: '3099',
        symbol: '3099.jp',
        keywords: ['isetan mitsukoshi holdings'],
    },
    {
        label: '3289',
        symbol: '3289.jp',
        keywords: ['tokyu fudosan holdings'],
    },
    {
        label: '3382',
        symbol: '3382.jp',
        keywords: ['seven i holdings'],
    },
    {
        label: '3401',
        symbol: '3401.jp',
        keywords: ['teijin'],
    },
    {
        label: '3402',
        symbol: '3402.jp',
        keywords: ['toray industries'],
    },
    {
        label: '3405',
        symbol: '3405.jp',
        keywords: ['kuraray'],
    },
    {
        label: '3407',
        symbol: '3407.jp',
        keywords: ['asahi kasei'],
    },
    {
        label: '3436',
        symbol: '3436.jp',
        keywords: ['sumco'],
    },
    {
        label: '3659',
        symbol: '3659.jp',
        keywords: ['nexon'],
    },
    {
        label: '3861',
        symbol: '3861.jp',
        keywords: ['oji holdings'],
    },
    {
        label: '3863',
        symbol: '3863.jp',
        keywords: ['nippon paper industries'],
    },
    {
        label: '4004',
        symbol: '4004.jp',
        keywords: ['resonac holdings'],
    },
    {
        label: '4005',
        symbol: '4005.jp',
        keywords: ['sumitomo chemical company'],
    },
    {
        label: '4021',
        symbol: '4021.jp',
        keywords: ['nissan chemical'],
    },
    {
        label: '4042',
        symbol: '4042.jp',
        keywords: ['tosoh'],
    },
    {
        label: '4043',
        symbol: '4043.jp',
        keywords: ['tokuyama'],
    },
    {
        label: '4061',
        symbol: '4061.jp',
        keywords: ['denka company'],
    },
    {
        label: '4063',
        symbol: '4063.jp',
        keywords: ['shin etsu chemical'],
    },
    {
        label: '4151',
        symbol: '4151.jp',
        keywords: ['kyowa kirin'],
    },
    {
        label: '4183',
        symbol: '4183.jp',
        keywords: ['mitsui chemicals'],
    },
    {
        label: '4188',
        symbol: '4188.jp',
        keywords: ['mitsubishi chemical group'],
    },
    {
        label: '4208',
        symbol: '4208.jp',
        keywords: ['ube'],
    },
    {
        label: '4452',
        symbol: '4452.jp',
        keywords: ['kao'],
    },
    {
        label: '4502',
        symbol: '4502.jp',
        keywords: ['takeda pharmaceutical company'],
    },
    {
        label: '4503',
        symbol: '4503.jp',
        keywords: ['astellas pharma'],
    },
    {
        label: '4506',
        symbol: '4506.jp',
        keywords: ['sumitomo pharma'],
    },
    {
        label: '4507',
        symbol: '4507.jp',
        keywords: ['shionogi'],
    },
    {
        label: '4519',
        symbol: '4519.jp',
        keywords: ['chugai pharmaceutical'],
    },
    {
        label: '4523',
        symbol: '4523.jp',
        keywords: ['eisai'],
    },
    {
        label: '4568',
        symbol: '4568.jp',
        keywords: ['daiichi sankyo company'],
    },
    {
        label: '4578',
        symbol: '4578.jp',
        keywords: ['otsuka holdings'],
    },
    {
        label: '4661',
        symbol: '4661.jp',
        keywords: ['oriental land'],
    },
    {
        label: '4689',
        symbol: '4689.jp',
        keywords: ['ly'],
    },
    {
        label: '4704',
        symbol: '4704.jp',
        keywords: ['trend micro'],
    },
    {
        label: '4751',
        symbol: '4751.jp',
        keywords: ['cyberagent'],
    },
    {
        label: '4755',
        symbol: '4755.jp',
        keywords: ['rakuten group'],
    },
    {
        label: '4901',
        symbol: '4901.jp',
        keywords: ['fujifilm holdings'],
    },
    {
        label: '4902',
        symbol: '4902.jp',
        keywords: ['konica minolta'],
    },
    {
        label: '4911',
        symbol: '4911.jp',
        keywords: ['shiseido company'],
    },
    {
        label: '5019',
        symbol: '5019.jp',
        keywords: ['idemitsu kosan'],
    },
    {
        label: '5020',
        symbol: '5020.jp',
        keywords: ['eneos holdings'],
    },
    {
        label: '5101',
        symbol: '5101.jp',
        keywords: ['the yokohama rubber company'],
    },
    {
        label: '5108',
        symbol: '5108.jp',
        keywords: ['bridgestone'],
    },
    {
        label: '5201',
        symbol: '5201.jp',
        keywords: ['agc'],
    },
    {
        label: '5202',
        symbol: '5202.jp',
        keywords: ['nippon sheet glass company'],
    },
    {
        label: '5214',
        symbol: '5214.jp',
        keywords: ['nippon electric glass'],
    },
    {
        label: '5232',
        symbol: '5232.jp',
        keywords: ['sumitomo osaka cement'],
    },
    {
        label: '5233',
        symbol: '5233.jp',
        keywords: ['taiheiyo cement'],
    },
    {
        label: '5301',
        symbol: '5301.jp',
        keywords: ['tokai carbon'],
    },
    {
        label: '5332',
        symbol: '5332.jp',
        keywords: ['toto'],
    },
    {
        label: '5333',
        symbol: '5333.jp',
        keywords: ['ngk'],
    },
    {
        label: '5401',
        symbol: '5401.jp',
        keywords: ['nippon steel'],
    },
    {
        label: '5406',
        symbol: '5406.jp',
        keywords: ['kobe steel'],
    },
    {
        label: '5411',
        symbol: '5411.jp',
        keywords: ['jfe holdings'],
    },
    {
        label: '5541',
        symbol: '5541.jp',
        keywords: ['pacific metals'],
    },
    {
        label: '5631',
        symbol: '5631.jp',
        keywords: ['the japan steel works'],
    },
    {
        label: '5706',
        symbol: '5706.jp',
        keywords: ['mitsui kinzoku company'],
    },
    {
        label: '5711',
        symbol: '5711.jp',
        keywords: ['mitsubishi materials'],
    },
    {
        label: '5713',
        symbol: '5713.jp',
        keywords: ['sumitomo metal mining'],
    },
    {
        label: '5714',
        symbol: '5714.jp',
        keywords: ['dowa holdings'],
    },
    {
        label: '5801',
        symbol: '5801.jp',
        keywords: ['furukawa electric'],
    },
    {
        label: '5802',
        symbol: '5802.jp',
        keywords: ['sumitomo electric industries'],
    },
    {
        label: '5803',
        symbol: '5803.jp',
        keywords: ['fujikura'],
    },
    {
        label: '6098',
        symbol: '6098.jp',
        keywords: ['recruit holdings'],
    },
    {
        label: '6103',
        symbol: '6103.jp',
        keywords: ['okuma'],
    },
    {
        label: '6113',
        symbol: '6113.jp',
        keywords: ['amada'],
    },
    {
        label: '6146',
        symbol: '6146.jp',
        keywords: ['disco'],
    },
    {
        label: '6178',
        symbol: '6178.jp',
        keywords: ['japan post holdings'],
    },
    {
        label: '6301',
        symbol: '6301.jp',
        keywords: ['komatsu'],
    },
    {
        label: '6302',
        symbol: '6302.jp',
        keywords: ['sumitomo heavy industries'],
    },
    {
        label: '6305',
        symbol: '6305.jp',
        keywords: ['hitachi construction machinery'],
    },
    {
        label: '6326',
        symbol: '6326.jp',
        keywords: ['kubota'],
    },
    {
        label: '6361',
        symbol: '6361.jp',
        keywords: ['ebara'],
    },
    {
        label: '6367',
        symbol: '6367.jp',
        keywords: ['daikin industries'],
    },
    {
        label: '6471',
        symbol: '6471.jp',
        keywords: ['nsk'],
    },
    {
        label: '6472',
        symbol: '6472.jp',
        keywords: ['ntn'],
    },
    {
        label: '6473',
        symbol: '6473.jp',
        keywords: ['jtekt'],
    },
    {
        label: '6479',
        symbol: '6479.jp',
        keywords: ['minebea mitsumi'],
    },
    {
        label: '6501',
        symbol: '6501.jp',
        keywords: ['hitachi'],
    },
    {
        label: '6503',
        symbol: '6503.jp',
        keywords: ['mitsubishi electric'],
    },
    {
        label: '6504',
        symbol: '6504.jp',
        keywords: ['fuji electric'],
    },
    {
        label: '6506',
        symbol: '6506.jp',
        keywords: ['yaskawa electric'],
    },
    {
        label: '6526',
        symbol: '6526.jp',
        keywords: ['socionext'],
    },
    {
        label: '6594',
        symbol: '6594.jp',
        keywords: ['nidec'],
    },
    {
        label: '6645',
        symbol: '6645.jp',
        keywords: ['omron'],
    },
    {
        label: '6674',
        symbol: '6674.jp',
        keywords: ['gs yuasa'],
    },
    {
        label: '6701',
        symbol: '6701.jp',
        keywords: ['nec'],
    },
    {
        label: '6702',
        symbol: '6702.jp',
        keywords: ['fujitsu'],
    },
];

export const JAPAN_EQUITY_TICKERS = JAPAN_EQUITY_TICKER_DEFINITIONS.map(entry => ({
    assetCategory: ASSET_CATEGORIES.EQUITY,
    label: entry.label,
    symbol: entry.symbol,
    priceDecimals: 2,
    marketSessionId: MARKET_SESSION_IDS.JAPAN_EQUITY_CASH,
    keywords: [...entry.keywords, 'japan', 'tokyo stock exchange', entry.label],
}));
