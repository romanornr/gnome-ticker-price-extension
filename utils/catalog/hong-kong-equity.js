import {ASSET_CATEGORIES} from '../asset-categories.js';
import {MARKET_SESSION_IDS} from '../market-sessions.js';

/* This file is the curated Hong Kong equity suggestion source used by prefs search and Hong Kong cash-session defaults. */
const HONG_KONG_EQUITY_TICKER_DEFINITIONS = [
    {
        label: '1',
        symbol: '1.hk',
        keywords: ['ckh holdings'],
    },
    {
        label: '2',
        symbol: '2.hk',
        keywords: ['clp holdings'],
    },
    {
        label: '3',
        symbol: '3.hk',
        keywords: ['hk china gas'],
    },
    {
        label: '5',
        symbol: '5.hk',
        keywords: ['hsbc holdings'],
    },
    {
        label: '6',
        symbol: '6.hk',
        keywords: ['power assets'],
    },
    {
        label: '12',
        symbol: '12.hk',
        keywords: ['henderson land'],
    },
    {
        label: '16',
        symbol: '16.hk',
        keywords: ['shk ppt'],
    },
    {
        label: '17',
        symbol: '17.hk',
        keywords: ['new world dev'],
    },
    {
        label: '19',
        symbol: '19.hk',
        keywords: ['swire pacific a'],
    },
    {
        label: '27',
        symbol: '27.hk',
        keywords: ['galaxy ent'],
    },
    {
        label: '66',
        symbol: '66.hk',
        keywords: ['mtr corporation'],
    },
    {
        label: '83',
        symbol: '83.hk',
        keywords: ['sino land'],
    },
    {
        label: '101',
        symbol: '101.hk',
        keywords: ['hang lung ppt'],
    },
    {
        label: '135',
        symbol: '135.hk',
        keywords: ['kunlun energy'],
    },
    {
        label: '144',
        symbol: '144.hk',
        keywords: ['china mer port'],
    },
    {
        label: '151',
        symbol: '151.hk',
        keywords: ['want want china'],
    },
    {
        label: '175',
        symbol: '175.hk',
        keywords: ['geely auto'],
    },
    {
        label: '241',
        symbol: '241.hk',
        keywords: ['ali health'],
    },
    {
        label: '267',
        symbol: '267.hk',
        keywords: ['citic'],
    },
    {
        label: '268',
        symbol: '268.hk',
        keywords: ['kingdee intl'],
    },
    {
        label: '285',
        symbol: '285.hk',
        keywords: ['byd electronic'],
    },
    {
        label: '288',
        symbol: '288.hk',
        keywords: ['wh group'],
    },
    {
        label: '291',
        symbol: '291.hk',
        keywords: ['china res beer'],
    },
    {
        label: '293',
        symbol: '293.hk',
        keywords: ['cathay pac air'],
    },
    {
        label: '316',
        symbol: '316.hk',
        keywords: ['ooil'],
    },
    {
        label: '322',
        symbol: '322.hk',
        keywords: ['tingyi'],
    },
    {
        label: '323',
        symbol: '323.hk',
        keywords: ['maanshan iron'],
    },
    {
        label: '327',
        symbol: '327.hk',
        keywords: ['pax global'],
    },
    {
        label: '330',
        symbol: '330.hk',
        keywords: ['esprit holdings'],
    },
    {
        label: '336',
        symbol: '336.hk',
        keywords: ['huabao intl'],
    },
    {
        label: '337',
        symbol: '337.hk',
        keywords: ['greenland hk'],
    },
    {
        label: '358',
        symbol: '358.hk',
        keywords: ['jiangxi copper'],
    },
    {
        label: '363',
        symbol: '363.hk',
        keywords: ['shanghai ind h'],
    },
    {
        label: '371',
        symbol: '371.hk',
        keywords: ['bj ent water'],
    },
    {
        label: '386',
        symbol: '386.hk',
        keywords: ['sinopec corp'],
    },
    {
        label: '388',
        symbol: '388.hk',
        keywords: ['hkex'],
    },
    {
        label: '390',
        symbol: '390.hk',
        keywords: ['china railway'],
    },
    {
        label: '392',
        symbol: '392.hk',
        keywords: ['beijing ent'],
    },
    {
        label: '425',
        symbol: '425.hk',
        keywords: ['minth group'],
    },
    {
        label: '522',
        symbol: '522.hk',
        keywords: ['asmpt'],
    },
    {
        label: '546',
        symbol: '546.hk',
        keywords: ['fufeng group'],
    },
    {
        label: '551',
        symbol: '551.hk',
        keywords: ['yue yuen ind'],
    },
    {
        label: '552',
        symbol: '552.hk',
        keywords: ['chinacomservice'],
    },
    {
        label: '553',
        symbol: '553.hk',
        keywords: ['nanjing panda'],
    },
    {
        label: '570',
        symbol: '570.hk',
        keywords: ['trad chi med'],
    },
    {
        label: '576',
        symbol: '576.hk',
        keywords: ['zhejiangexpress'],
    },
    {
        label: '581',
        symbol: '581.hk',
        keywords: ['china oriental'],
    },
    {
        label: '586',
        symbol: '586.hk',
        keywords: ['conch venture'],
    },
    {
        label: '590',
        symbol: '590.hk',
        keywords: ['luk fook hold'],
    },
    {
        label: '604',
        symbol: '604.hk',
        keywords: ['shenzhen invest'],
    },
    {
        label: '656',
        symbol: '656.hk',
        keywords: ['fosun intl'],
    },
    {
        label: '659',
        symbol: '659.hk',
        keywords: ['ctf services'],
    },
    {
        label: '669',
        symbol: '669.hk',
        keywords: ['techtronic ind'],
    },
    {
        label: '670',
        symbol: '670.hk',
        keywords: ['china east air'],
    },
    {
        label: '688',
        symbol: '688.hk',
        keywords: ['china overseas'],
    },
    {
        label: '696',
        symbol: '696.hk',
        keywords: ['travelsky tech'],
    },
    {
        label: '700',
        symbol: '700.hk',
        keywords: ['tencent'],
    },
    {
        label: '728',
        symbol: '728.hk',
        keywords: ['china telecom'],
    },
    {
        label: '753',
        symbol: '753.hk',
        keywords: ['air china'],
    },
    {
        label: '762',
        symbol: '762.hk',
        keywords: ['china unicom'],
    },
    {
        label: '763',
        symbol: '763.hk',
        keywords: ['zte'],
    },
    {
        label: '772',
        symbol: '772.hk',
        keywords: ['china lit'],
    },
    {
        label: '780',
        symbol: '780.hk',
        keywords: ['tongchengtravel'],
    },
    {
        label: '788',
        symbol: '788.hk',
        keywords: ['china tower'],
    },
    {
        label: '806',
        symbol: '806.hk',
        keywords: ['value partners'],
    },
    {
        label: '819',
        symbol: '819.hk',
        keywords: ['tianneng power'],
    },
    {
        label: '823',
        symbol: '823.hk',
        keywords: ['link reit'],
    },
    {
        label: '836',
        symbol: '836.hk',
        keywords: ['china res power'],
    },
    {
        label: '857',
        symbol: '857.hk',
        keywords: ['petrochina'],
    },
    {
        label: '868',
        symbol: '868.hk',
        keywords: ['xinyi glass'],
    },
    {
        label: '880',
        symbol: '880.hk',
        keywords: ['sjm holdings'],
    },
    {
        label: '881',
        symbol: '881.hk',
        keywords: ['zhongsheng hldg'],
    },
    {
        label: '883',
        symbol: '883.hk',
        keywords: ['cnooc'],
    },
    {
        label: '902',
        symbol: '902.hk',
        keywords: ['huaneng power'],
    },
    {
        label: '914',
        symbol: '914.hk',
        keywords: ['conch cement'],
    },
    {
        label: '916',
        symbol: '916.hk',
        keywords: ['china longyuan'],
    },
    {
        label: '939',
        symbol: '939.hk',
        keywords: ['ccb'],
    },
    {
        label: '941',
        symbol: '941.hk',
        keywords: ['china mobile'],
    },
    {
        label: '960',
        symbol: '960.hk',
        keywords: ['longfor group'],
    },
    {
        label: '966',
        symbol: '966.hk',
        keywords: ['china taiping'],
    },
    {
        label: '968',
        symbol: '968.hk',
        keywords: ['xinyi solar'],
    },
    {
        label: '981',
        symbol: '981.hk',
        keywords: ['smic'],
    },
    {
        label: '992',
        symbol: '992.hk',
        keywords: ['lenovo group'],
    },
    {
        label: '998',
        symbol: '998.hk',
        keywords: ['citic bank'],
    },
    {
        label: '999',
        symbol: '999.hk',
        keywords: ['xiaocaiyuan'],
    },
    {
        label: '1024',
        symbol: '1024.hk',
        keywords: ['kuaishou w'],
    },
    {
        label: '1038',
        symbol: '1038.hk',
        keywords: ['cki holdings'],
    },
    {
        label: '1044',
        symbol: '1044.hk',
        keywords: ['hengan intl'],
    },
    {
        label: '1055',
        symbol: '1055.hk',
        keywords: ['china south air'],
    },
    {
        label: '1066',
        symbol: '1066.hk',
        keywords: ['weigao group'],
    },
    {
        label: '1071',
        symbol: '1071.hk',
        keywords: ['huadian power'],
    },
    {
        label: '1088',
        symbol: '1088.hk',
        keywords: ['china shenhua'],
    },
    {
        label: '1093',
        symbol: '1093.hk',
        keywords: ['cspc pharma'],
    },
    {
        label: '1099',
        symbol: '1099.hk',
        keywords: ['sinopharm'],
    },
    {
        label: '1109',
        symbol: '1109.hk',
        keywords: ['china res land'],
    },
    {
        label: '1113',
        symbol: '1113.hk',
        keywords: ['ck asset'],
    },
    {
        label: '1171',
        symbol: '1171.hk',
        keywords: ['yankuang energy'],
    },
    {
        label: '1177',
        symbol: '1177.hk',
        keywords: ['sbp group'],
    },
    {
        label: '1193',
        symbol: '1193.hk',
        keywords: ['china res gas'],
    },
    {
        label: '1211',
        symbol: '1211.hk',
        keywords: ['byd company'],
    },
    {
        label: '1288',
        symbol: '1288.hk',
        keywords: ['abc'],
    },
    {
        label: '1299',
        symbol: '1299.hk',
        keywords: ['aia'],
    },
    {
        label: '1313',
        symbol: '1313.hk',
        keywords: ['cr bldg mat tec'],
    },
    {
        label: '1336',
        symbol: '1336.hk',
        keywords: ['nci'],
    },
    {
        label: '1339',
        symbol: '1339.hk',
        keywords: ['picc group'],
    },
    {
        label: '1347',
        symbol: '1347.hk',
        keywords: ['hua hong semi'],
    },
    {
        label: '1359',
        symbol: '1359.hk',
        keywords: ['china cinda'],
    },
    {
        label: '1368',
        symbol: '1368.hk',
        keywords: ['xtep intl'],
    },
    {
        label: '1378',
        symbol: '1378.hk',
        keywords: ['chinahongqiao'],
    },
    {
        label: '1385',
        symbol: '1385.hk',
        keywords: ['shanghai fudan'],
    },
    {
        label: '1398',
        symbol: '1398.hk',
        keywords: ['icbc'],
    },
    {
        label: '1478',
        symbol: '1478.hk',
        keywords: ['q tech'],
    },
    {
        label: '1519',
        symbol: '1519.hk',
        keywords: ['j t express w'],
    },
    {
        label: '1521',
        symbol: '1521.hk',
        keywords: ['frontage'],
    },
    {
        label: '1548',
        symbol: '1548.hk',
        keywords: ['genscript bio'],
    },
    {
        label: '1658',
        symbol: '1658.hk',
        keywords: ['psbc'],
    },
    {
        label: '1766',
        symbol: '1766.hk',
        keywords: ['crrc'],
    },
    {
        label: '1772',
        symbol: '1772.hk',
        keywords: ['ganfenglithium'],
    },
    {
        label: '1787',
        symbol: '1787.hk',
        keywords: ['sd gold'],
    },
    {
        label: '1810',
        symbol: '1810.hk',
        keywords: ['xiaomi w'],
    },
    {
        label: '1816',
        symbol: '1816.hk',
        keywords: ['cgn power'],
    },
    {
        label: '1818',
        symbol: '1818.hk',
        keywords: ['zhaojin mining'],
    },
    {
        label: '1876',
        symbol: '1876.hk',
        keywords: ['bud apac'],
    },
    {
        label: '1880',
        symbol: '1880.hk',
        keywords: ['ctg duty free'],
    },
    {
        label: '1898',
        symbol: '1898.hk',
        keywords: ['china coal'],
    },
    {
        label: '1918',
        symbol: '1918.hk',
        keywords: ['sunac'],
    },
    {
        label: '1928',
        symbol: '1928.hk',
        keywords: ['sands china ltd'],
    },
    {
        label: '1929',
        symbol: '1929.hk',
        keywords: ['chow tai fook'],
    },
    {
        label: '1951',
        symbol: '1951.hk',
        keywords: ['jxr'],
    },
    {
        label: '1963',
        symbol: '1963.hk',
        keywords: ['bcq'],
    },
    {
        label: '1997',
        symbol: '1997.hk',
        keywords: ['wharf reic'],
    },
    {
        label: '2007',
        symbol: '2007.hk',
        keywords: ['country garden'],
    },
    {
        label: '2013',
        symbol: '2013.hk',
        keywords: ['weimob inc'],
    },
    {
        label: '2015',
        symbol: '2015.hk',
        keywords: ['li auto w'],
    },
    {
        label: '2018',
        symbol: '2018.hk',
        keywords: ['aac tech'],
    },
    {
        label: '2020',
        symbol: '2020.hk',
        keywords: ['anta sports'],
    },
    {
        label: '2022',
        symbol: '2022.hk',
        keywords: ['digit hollywood'],
    },
    {
        label: '2202',
        symbol: '2202.hk',
        keywords: ['china vanke'],
    },
    {
        label: '2269',
        symbol: '2269.hk',
        keywords: ['wuxi bio'],
    },
    {
        label: '2313',
        symbol: '2313.hk',
        keywords: ['shenzhou intl'],
    },
    {
        label: '2318',
        symbol: '2318.hk',
        keywords: ['ping an'],
    },
    {
        label: '2319',
        symbol: '2319.hk',
        keywords: ['mengniu dairy'],
    },
    {
        label: '2328',
        symbol: '2328.hk',
        keywords: ['picc p c'],
    },
    {
        label: '2331',
        symbol: '2331.hk',
        keywords: ['li ning'],
    },
    {
        label: '2333',
        symbol: '2333.hk',
        keywords: ['gwmotor'],
    },
    {
        label: '2338',
        symbol: '2338.hk',
        keywords: ['weichai power'],
    },
    {
        label: '2357',
        symbol: '2357.hk',
        keywords: ['avichina'],
    },
    {
        label: '2382',
        symbol: '2382.hk',
        keywords: ['sunny optical'],
    },
    {
        label: '2388',
        symbol: '2388.hk',
        keywords: ['boc hong kong'],
    },
    {
        label: '2600',
        symbol: '2600.hk',
        keywords: ['chalco'],
    },
    {
        label: '2601',
        symbol: '2601.hk',
        keywords: ['cpic'],
    },
    {
        label: '2607',
        symbol: '2607.hk',
        keywords: ['sh pharma'],
    },
    {
        label: '2618',
        symbol: '2618.hk',
        keywords: ['jd logistics'],
    },
    {
        label: '2628',
        symbol: '2628.hk',
        keywords: ['china life'],
    },
    {
        label: '2688',
        symbol: '2688.hk',
        keywords: ['enn energy'],
    },
    {
        label: '2689',
        symbol: '2689.hk',
        keywords: ['nd paper'],
    },
    {
        label: '2727',
        symbol: '2727.hk',
        keywords: ['sh electric'],
    },
    {
        label: '2777',
        symbol: '2777.hk',
        keywords: ['r f properties'],
    },
    {
        label: '2883',
        symbol: '2883.hk',
        keywords: ['china oilfield'],
    },
    {
        label: '2899',
        symbol: '2899.hk',
        keywords: ['zijin mining'],
    },
    {
        label: '3320',
        symbol: '3320.hk',
        keywords: ['chinares pharma'],
    },
    {
        label: '3323',
        symbol: '3323.hk',
        keywords: ['cnbm'],
    },
    {
        label: '3328',
        symbol: '3328.hk',
        keywords: ['bankcomm'],
    },
    {
        label: '3690',
        symbol: '3690.hk',
        keywords: ['meituan w'],
    },
    {
        label: '3692',
        symbol: '3692.hk',
        keywords: ['hansoh pharma'],
    },
    {
        label: '3696',
        symbol: '3696.hk',
        keywords: ['insilico'],
    },
    {
        label: '3800',
        symbol: '3800.hk',
        keywords: ['gcl tech'],
    },
    {
        label: '3808',
        symbol: '3808.hk',
        keywords: ['sinotruk'],
    },
    {
        label: '3888',
        symbol: '3888.hk',
        keywords: ['kingsoft'],
    },
    {
        label: '3900',
        symbol: '3900.hk',
        keywords: ['greentown china'],
    },
    {
        label: '3968',
        symbol: '3968.hk',
        keywords: ['cm bank'],
    },
    {
        label: '3969',
        symbol: '3969.hk',
        keywords: ['china crsc'],
    },
    {
        label: '3988',
        symbol: '3988.hk',
        keywords: ['bank of china'],
    },
    {
        label: '3993',
        symbol: '3993.hk',
        keywords: ['cmoc'],
    },
    {
        label: '3998',
        symbol: '3998.hk',
        keywords: ['bosideng'],
    },
    {
        label: '6030',
        symbol: '6030.hk',
        keywords: ['citic sec'],
    },
    {
        label: '6098',
        symbol: '6098.hk',
        keywords: ['cg services'],
    },
    {
        label: '6618',
        symbol: '6618.hk',
        keywords: ['jd health'],
    },
    {
        label: '6669',
        symbol: '6669.hk',
        keywords: ['acotec b'],
    },
    {
        label: '6690',
        symbol: '6690.hk',
        keywords: ['haier smarthome'],
    },
    {
        label: '6808',
        symbol: '6808.hk',
        keywords: ['sunart retail'],
    },
    {
        label: '6862',
        symbol: '6862.hk',
        keywords: ['haidilao'],
    },
    {
        label: '6865',
        symbol: '6865.hk',
        keywords: ['flat glass'],
    },
    {
        label: '6881',
        symbol: '6881.hk',
        keywords: ['cgs'],
    },
    {
        label: '6969',
        symbol: '6969.hk',
        keywords: ['smoore intl'],
    },
    {
        label: '9618',
        symbol: '9618.hk',
        keywords: ['jd sw'],
    },
    {
        label: '9626',
        symbol: '9626.hk',
        keywords: ['bilibili w'],
    },
    {
        label: '9633',
        symbol: '9633.hk',
        keywords: ['nongfu spring'],
    },
    {
        label: '9660',
        symbol: '9660.hk',
        keywords: ['horizonrobot w'],
    },
    {
        label: '9866',
        symbol: '9866.hk',
        keywords: ['nio sw'],
    },
    {
        label: '9888',
        symbol: '9888.hk',
        keywords: ['bidu sw'],
    },
    {
        label: '9898',
        symbol: '9898.hk',
        keywords: ['wb sw'],
    },
    {
        label: '9901',
        symbol: '9901.hk',
        keywords: ['new oriental s'],
    },
    {
        label: '9961',
        symbol: '9961.hk',
        keywords: ['tripcom s'],
    },
    {
        label: '9988',
        symbol: '9988.hk',
        keywords: ['baba w'],
    },
    {
        label: '9992',
        symbol: '9992.hk',
        keywords: ['pop mart'],
    },
    {
        label: '9999',
        symbol: '9999.hk',
        keywords: ['ntes s'],
    },
];


export const HONG_KONG_EQUITY_TICKERS = HONG_KONG_EQUITY_TICKER_DEFINITIONS.map(entry => ({
    assetCategory: ASSET_CATEGORIES.EQUITY,
    label: entry.label,
    symbol: entry.symbol,
    priceDecimals: 2,
    marketSessionId: MARKET_SESSION_IDS.HONG_KONG_EQUITY_CASH,
    keywords: [...entry.keywords, 'hong kong', 'hkex', entry.label],
}));
