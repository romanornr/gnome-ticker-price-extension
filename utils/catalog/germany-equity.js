import {ASSET_CATEGORIES} from '../asset-categories.js';
import {MARKET_SESSION_IDS} from '../market-sessions.js';

/* This file is the curated Germany equity suggestion source used by prefs search and Europe cash-session defaults. */
const GERMANY_EQUITY_TICKER_DEFINITIONS = [
    {
        label: '1U1',
        symbol: '1u1.de',
        keywords: ['1&1'],
    },
    {
        label: 'ADN1',
        symbol: 'adn1.de',
        keywords: ['adtran networks', 'adtran'],
    },
    {
        label: 'ADS',
        symbol: 'ads.de',
        keywords: ['adidas'],
    },
    {
        label: 'AIXA',
        symbol: 'aixa.de',
        keywords: ['aixtron'],
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
        label: 'BAYN',
        symbol: 'bayn.de',
        keywords: ['bayer'],
    },
    {
        label: 'BC8',
        symbol: 'bc8.de',
        keywords: ['bechtle'],
    },
    {
        label: 'BEI',
        symbol: 'bei.de',
        keywords: ['beiersdorf'],
    },
    {
        label: 'BMW',
        symbol: 'bmw.de',
        keywords: ['bmw', 'bayerische motoren werke'],
    },
    {
        label: 'BNR',
        symbol: 'bnr.de',
        keywords: ['brenntag'],
    },
    {
        label: 'BOSS',
        symbol: 'boss.de',
        keywords: ['hugo boss'],
    },
    {
        label: 'BVB',
        symbol: 'bvb.de',
        keywords: ['borussia dortmund'],
    },
    {
        label: 'CBK',
        symbol: 'cbk.de',
        keywords: ['commerzbank'],
    },
    {
        label: 'CON',
        symbol: 'con.de',
        keywords: ['continental'],
    },
    {
        label: 'CWC',
        symbol: 'cwc.de',
        keywords: ['cewe'],
    },
    {
        label: 'DB1',
        symbol: 'db1.de',
        keywords: ['deutsche boerse', 'deutsche borse'],
    },
    {
        label: 'DBAN',
        symbol: 'dban.de',
        keywords: ['deutsche beteiligungs', 'deutsche beteiligungs ag'],
    },
    {
        label: 'DBK',
        symbol: 'dbk.de',
        keywords: ['deutsche bank'],
    },
    {
        label: 'DEZ',
        symbol: 'dez.de',
        keywords: ['deutz'],
    },
    {
        label: 'DHER',
        symbol: 'dher.de',
        keywords: ['delivery hero'],
    },
    {
        label: 'DHL',
        symbol: 'dhl.de',
        keywords: ['dhl', 'deutsche post dhl'],
    },
    {
        label: 'DRW3',
        symbol: 'drw3.de',
        keywords: ['draegerwerk', 'dragerwerk'],
    },
    {
        label: 'DTE',
        symbol: 'dte.de',
        keywords: ['deutsche telekom'],
    },
    {
        label: 'DTG',
        symbol: 'dtg.de',
        keywords: ['daimler truck'],
    },
    {
        label: 'DUE',
        symbol: 'due.de',
        keywords: ['duerr', 'durr'],
    },
    {
        label: 'EKT',
        symbol: 'ekt.de',
        keywords: ['energiekontor'],
    },
    {
        label: 'ELG',
        symbol: 'elg.de',
        keywords: ['elmos semiconductor'],
    },
    {
        label: 'EOAN',
        symbol: 'eoan.de',
        keywords: ['eon'],
    },
    {
        label: 'EUZ',
        symbol: 'euz.de',
        keywords: ['eckert ziegler', 'eckert & ziegler'],
    },
    {
        label: 'EVD',
        symbol: 'evd.de',
        keywords: ['cts eventim'],
    },
    {
        label: 'EVK',
        symbol: 'evk.de',
        keywords: ['evonik'],
    },
    {
        label: 'EVT',
        symbol: 'evt.de',
        keywords: ['evotec'],
    },
    {
        label: 'FME',
        symbol: 'fme.de',
        keywords: ['fresenius medical care'],
    },
    {
        label: 'FNTN',
        symbol: 'fntn.de',
        keywords: ['freenet'],
    },
    {
        label: 'FPE3',
        symbol: 'fpe3.de',
        keywords: ['fuchs', 'fuchs se'],
    },
    {
        label: 'FRA',
        symbol: 'fra.de',
        keywords: ['fraport'],
    },
    {
        label: 'FRE',
        symbol: 'fre.de',
        keywords: ['fresenius'],
    },
    {
        label: 'G1A',
        symbol: 'g1a.de',
        keywords: ['gea group', 'gea'],
    },
    {
        label: 'GBF',
        symbol: 'gbf.de',
        keywords: ['bilfinger'],
    },
    {
        label: 'GFT',
        symbol: 'gft.de',
        keywords: ['gft technologies'],
    },
    {
        label: 'GXI',
        symbol: 'gxi.de',
        keywords: ['gerresheimer'],
    },
    {
        label: 'HAG',
        symbol: 'hag.de',
        keywords: ['hensoldt'],
    },
    {
        label: 'HDD',
        symbol: 'hdd.de',
        keywords: ['heidelberger druckmaschinen'],
    },
    {
        label: 'HEI',
        symbol: 'hei.de',
        keywords: ['heidelberg materials', 'heidelbergcement'],
    },
    {
        label: 'HFG',
        symbol: 'hfg.de',
        keywords: ['hellofresh', 'hello fresh'],
    },
    {
        label: 'HLE',
        symbol: 'hle.de',
        keywords: ['hella'],
    },
    {
        label: 'HNR1',
        symbol: 'hnr1.de',
        keywords: ['hannover rueck', 'hannover re'],
    },
    {
        label: 'HOT',
        symbol: 'hot.de',
        keywords: ['hochtief'],
    },
    {
        label: 'HYQ',
        symbol: 'hyq.de',
        keywords: ['hypoport'],
    },
    {
        label: 'IFX',
        symbol: 'ifx.de',
        keywords: ['infineon'],
    },
    {
        label: 'INDU',
        symbol: 'indu.de',
        keywords: ['indus holding'],
    },
    {
        label: 'JEN',
        symbol: 'jen.de',
        keywords: ['jenoptik'],
    },
    {
        label: 'JUN3',
        symbol: 'jun3.de',
        keywords: ['jungheinrich'],
    },
    {
        label: 'KBX',
        symbol: 'kbx.de',
        keywords: ['knorr-bremse', 'knorr bremse'],
    },
    {
        label: 'KCO',
        symbol: 'kco.de',
        keywords: ['kloeckner', 'klockner'],
    },
    {
        label: 'KGX',
        symbol: 'kgx.de',
        keywords: ['kion group', 'kion'],
    },
    {
        label: 'KRN',
        symbol: 'krn.de',
        keywords: ['krones'],
    },
    {
        label: 'KSB3',
        symbol: 'ksb3.de',
        keywords: ['ksb'],
    },
    {
        label: 'KWS',
        symbol: 'kws.de',
        keywords: ['kws saat'],
    },
    {
        label: 'LEG',
        symbol: 'leg.de',
        keywords: ['leg immobilien'],
    },
    {
        label: 'LHA',
        symbol: 'lha.de',
        keywords: ['lufthansa', 'deutsche lufthansa'],
    },
    {
        label: 'LPK',
        symbol: 'lpk.de',
        keywords: ['lpkf laser', 'lpkf laser electronics'],
    },
    {
        label: 'LXS',
        symbol: 'lxs.de',
        keywords: ['lanxess'],
    },
    {
        label: 'MBB',
        symbol: 'mbb.de',
        keywords: ['mbb'],
    },
    {
        label: 'MBG',
        symbol: 'mbg.de',
        keywords: ['mercedes-benz', 'mercedes benz'],
    },
    {
        label: 'MLP',
        symbol: 'mlp.de',
        keywords: ['mlp'],
    },
    {
        label: 'MRK',
        symbol: 'mrk.de',
        keywords: ['merck'],
    },
    {
        label: 'MTX',
        symbol: 'mtx.de',
        keywords: ['mtu aero engines', 'mtu'],
    },
    {
        label: 'MUV2',
        symbol: 'muv2.de',
        keywords: ['munich re', 'muenchener rueck'],
    },
    {
        label: 'NDA',
        symbol: 'nda.de',
        keywords: ['aurubis'],
    },
    {
        label: 'NDX1',
        symbol: 'ndx1.de',
        keywords: ['nordex'],
    },
    {
        label: 'NEM',
        symbol: 'nem.de',
        keywords: ['nemetschek'],
    },
    {
        label: 'P911',
        symbol: 'p911.de',
        keywords: ['porsche', 'porsche ag'],
    },
    {
        label: 'PAH3',
        symbol: 'pah3.de',
        keywords: ['porsche automobile holding', 'porsche holding'],
    },
    {
        label: 'PBB',
        symbol: 'pbb.de',
        keywords: ['deutsche pfandbriefbank', 'pbb'],
    },
    {
        label: 'PSM',
        symbol: 'psm.de',
        keywords: ['prosiebensat1', 'prosieben sat1'],
    },
    {
        label: 'PUM',
        symbol: 'pum.de',
        keywords: ['puma'],
    },
    {
        label: 'QIA',
        symbol: 'qia.de',
        keywords: ['qiagen'],
    },
    {
        label: 'RAA',
        symbol: 'raa.de',
        keywords: ['rational'],
    },
    {
        label: 'RHM',
        symbol: 'rhm.de',
        keywords: ['rheinmetall'],
    },
    {
        label: 'RWE',
        symbol: 'rwe.de',
        keywords: ['rwe'],
    },
    {
        label: 'S92',
        symbol: 's92.de',
        keywords: ['sma solar'],
    },
    {
        label: 'SAP',
        symbol: 'sap.de',
        keywords: ['sap'],
    },
    {
        label: 'SAX',
        symbol: 'sax.de',
        keywords: ['stroeer', 'stroer'],
    },
    {
        label: 'SDF',
        symbol: 'sdf.de',
        keywords: ['k+s', 'ks'],
    },
    {
        label: 'SIE',
        symbol: 'sie.de',
        keywords: ['siemens'],
    },
    {
        label: 'SRT3',
        symbol: 'srt3.de',
        keywords: ['sartorius'],
    },
    {
        label: 'SY1',
        symbol: 'sy1.de',
        keywords: ['symrise'],
    },
    {
        label: 'SZG',
        symbol: 'szg.de',
        keywords: ['salzgitter'],
    },
    {
        label: 'TEG',
        symbol: 'teg.de',
        keywords: ['tag immobilien'],
    },
    {
        label: 'TKA',
        symbol: 'tka.de',
        keywords: ['thyssenkrupp'],
    },
    {
        label: 'TLX',
        symbol: 'tlx.de',
        keywords: ['talanx'],
    },
    {
        label: 'TMV',
        symbol: 'tmv.de',
        keywords: ['teamviewer'],
    },
    {
        label: 'VNA',
        symbol: 'vna.de',
        keywords: ['vonovia'],
    },
    {
        label: 'VOS',
        symbol: 'vos.de',
        keywords: ['vossloh'],
    },
    {
        label: 'VOW3',
        symbol: 'vow3.de',
        keywords: ['volkswagen', 'volkswagen pref'],
    },
    {
        label: 'WAF',
        symbol: 'waf.de',
        keywords: ['siltronic'],
    },
    {
        label: 'WCH',
        symbol: 'wch.de',
        keywords: ['wacker chemie'],
    },
    {
        label: 'ZAL',
        symbol: 'zal.de',
        keywords: ['zalando'],
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
