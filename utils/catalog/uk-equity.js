import {ASSET_CATEGORIES} from '../asset-categories.js';
import {MARKET_SESSION_IDS} from '../market-sessions.js';

/* This file is the curated U.K. equity suggestion source used by prefs search and U.K. cash-session defaults. */
const UK_EQUITY_TICKER_DEFINITIONS = [
    {
        label: 'AAF',
        symbol: 'aaf.uk',
        keywords: ['airtel africa'],
    },
    {
        label: 'AAL',
        symbol: 'aal.uk',
        keywords: ['anglo american'],
    },
    {
        label: 'ABF',
        symbol: 'abf.uk',
        keywords: ['associated british foods'],
    },
    {
        label: 'ADM',
        symbol: 'adm.uk',
        keywords: ['admiral group'],
    },
    {
        label: 'ANTO',
        symbol: 'anto.uk',
        keywords: ['antofagasta'],
    },
    {
        label: 'AUTO',
        symbol: 'auto.uk',
        keywords: ['auto trader'],
    },
    {
        label: 'AV',
        symbol: 'av.uk',
        keywords: ['aviva'],
    },
    {
        label: 'AZN',
        symbol: 'azn.uk',
        keywords: ['astrazeneca'],
    },
    {
        label: 'BA',
        symbol: 'ba.uk',
        keywords: ['bae systems'],
    },
    {
        label: 'BAB',
        symbol: 'bab.uk',
        keywords: ['babcock international'],
    },
    {
        label: 'BARC',
        symbol: 'barc.uk',
        keywords: ['barclays'],
    },
    {
        label: 'BATS',
        symbol: 'bats.uk',
        keywords: ['british american tobacco'],
    },
    {
        label: 'BBOX',
        symbol: 'bbox.uk',
        keywords: ['tritax big box'],
    },
    {
        label: 'BEZ',
        symbol: 'bez.uk',
        keywords: ['beazley'],
    },
    {
        label: 'BKG',
        symbol: 'bkg.uk',
        keywords: ['berkeley group'],
    },
    {
        label: 'BLND',
        symbol: 'blnd.uk',
        keywords: ['british land'],
    },
    {
        label: 'BNZL',
        symbol: 'bnzl.uk',
        keywords: ['bunzl'],
    },
    {
        label: 'BP',
        symbol: 'bp.uk',
        keywords: ['bp'],
    },
    {
        label: 'BRBY',
        symbol: 'brby.uk',
        keywords: ['burberry'],
    },
    {
        label: 'BTRW',
        symbol: 'btrw.uk',
        keywords: ['barratt redrow', 'barratt developments'],
    },
    {
        label: 'CCH',
        symbol: 'cch.uk',
        keywords: ['coca-cola hbc'],
    },
    {
        label: 'CNA',
        symbol: 'cna.uk',
        keywords: ['centrica'],
    },
    {
        label: 'CPG',
        symbol: 'cpg.uk',
        keywords: ['compass group'],
    },
    {
        label: 'CRDA',
        symbol: 'crda.uk',
        keywords: ['croda international'],
    },
    {
        label: 'CTEC',
        symbol: 'ctec.uk',
        keywords: ['convatec'],
    },
    {
        label: 'DCC',
        symbol: 'dcc.uk',
        keywords: ['dcc'],
    },
    {
        label: 'DGE',
        symbol: 'dge.uk',
        keywords: ['diageo'],
    },
    {
        label: 'DLN',
        symbol: 'dln.uk',
        keywords: ['derwent london'],
    },
    {
        label: 'DPLM',
        symbol: 'dplm.uk',
        keywords: ['diploma'],
    },
    {
        label: 'EDV',
        symbol: 'edv.uk',
        keywords: ['endeavour mining'],
    },
    {
        label: 'ENT',
        symbol: 'ent.uk',
        keywords: ['entain'],
    },
    {
        label: 'EXPN',
        symbol: 'expn.uk',
        keywords: ['experian'],
    },
    {
        label: 'EZJ',
        symbol: 'ezj.uk',
        keywords: ['easyjet'],
    },
    {
        label: 'FRAS',
        symbol: 'fras.uk',
        keywords: ['frasers group'],
    },
    {
        label: 'FRES',
        symbol: 'fres.uk',
        keywords: ['fresnillo'],
    },
    {
        label: 'GAW',
        symbol: 'gaw.uk',
        keywords: ['games workshop'],
    },
    {
        label: 'GFRD',
        symbol: 'gfrd.uk',
        keywords: ['galliford try'],
    },
    {
        label: 'GLEN',
        symbol: 'glen.uk',
        keywords: ['glencore'],
    },
    {
        label: 'GSK',
        symbol: 'gsk.uk',
        keywords: ['gsk', 'glaxosmithkline'],
    },
    {
        label: 'HIK',
        symbol: 'hik.uk',
        keywords: ['hikma pharmaceuticals'],
    },
    {
        label: 'HLMA',
        symbol: 'hlma.uk',
        keywords: ['halma'],
    },
    {
        label: 'HLN',
        symbol: 'hln.uk',
        keywords: ['haleon'],
    },
    {
        label: 'HSBA',
        symbol: 'hsba.uk',
        keywords: ['hsbc'],
    },
    {
        label: 'HWDN',
        symbol: 'hwdn.uk',
        keywords: ['howden joinery'],
    },
    {
        label: 'IAG',
        symbol: 'iag.uk',
        keywords: ['international consolidated airlines', 'british airways', 'iberia'],
    },
    {
        label: 'ICG',
        symbol: 'icg.uk',
        keywords: ['icg', 'intermediate capital group'],
    },
    {
        label: 'IHG',
        symbol: 'ihg.uk',
        keywords: ['intercontinental hotels'],
    },
    {
        label: 'III',
        symbol: 'iii.uk',
        keywords: ['3i group'],
    },
    {
        label: 'IMB',
        symbol: 'imb.uk',
        keywords: ['imperial brands'],
    },
    {
        label: 'IMI',
        symbol: 'imi.uk',
        keywords: ['imi'],
    },
    {
        label: 'INF',
        symbol: 'inf.uk',
        keywords: ['informa'],
    },
    {
        label: 'INVP',
        symbol: 'invp.uk',
        keywords: ['investec'],
    },
    {
        label: 'ITRK',
        symbol: 'itrk.uk',
        keywords: ['intertek'],
    },
    {
        label: 'JD',
        symbol: 'jd.uk',
        keywords: ['jd sports'],
    },
    {
        label: 'JDW',
        symbol: 'jdw.uk',
        keywords: ['wetherspoon', 'jd wetherspoon'],
    },
    {
        label: 'KGF',
        symbol: 'kgf.uk',
        keywords: ['kingfisher'],
    },
    {
        label: 'LAND',
        symbol: 'land.uk',
        keywords: ['land securities'],
    },
    {
        label: 'LGEN',
        symbol: 'lgen.uk',
        keywords: ['legal & general', 'legal and general'],
    },
    {
        label: 'LLOY',
        symbol: 'lloy.uk',
        keywords: ['lloyds banking group'],
    },
    {
        label: 'LMP',
        symbol: 'lmp.uk',
        keywords: ['londonmetric property'],
    },
    {
        label: 'LSEG',
        symbol: 'lseg.uk',
        keywords: ['london stock exchange group'],
    },
    {
        label: 'MKS',
        symbol: 'mks.uk',
        keywords: ['marks and spencer'],
    },
    {
        label: 'MNDI',
        symbol: 'mndi.uk',
        keywords: ['mondi'],
    },
    {
        label: 'MNG',
        symbol: 'mng.uk',
        keywords: ['m&g', 'm and g'],
    },
    {
        label: 'NG',
        symbol: 'ng.uk',
        keywords: ['national grid'],
    },
    {
        label: 'NWG',
        symbol: 'nwg.uk',
        keywords: ['natwest group'],
    },
    {
        label: 'NXT',
        symbol: 'nxt.uk',
        keywords: ['next'],
    },
    {
        label: 'OCDO',
        symbol: 'ocdo.uk',
        keywords: ['ocado'],
    },
    {
        label: 'PCT',
        symbol: 'pct.uk',
        keywords: ['polar capital technology trust'],
    },
    {
        label: 'PRU',
        symbol: 'pru.uk',
        keywords: ['prudential'],
    },
    {
        label: 'PSN',
        symbol: 'psn.uk',
        keywords: ['persimmon'],
    },
    {
        label: 'REL',
        symbol: 'rel.uk',
        keywords: ['relx'],
    },
    {
        label: 'RIO',
        symbol: 'rio.uk',
        keywords: ['rio tinto'],
    },
    {
        label: 'RKT',
        symbol: 'rkt.uk',
        keywords: ['reckitt', 'reckitt benckiser'],
    },
    {
        label: 'RMV',
        symbol: 'rmv.uk',
        keywords: ['rightmove'],
    },
    {
        label: 'RR',
        symbol: 'rr.uk',
        keywords: ['rolls-royce'],
    },
    {
        label: 'RTO',
        symbol: 'rto.uk',
        keywords: ['rentokil initial'],
    },
    {
        label: 'SBRY',
        symbol: 'sbry.uk',
        keywords: ['sainsbury', 'j sainsbury'],
    },
    {
        label: 'SCT',
        symbol: 'sct.uk',
        keywords: ['softcat'],
    },
    {
        label: 'SDLF',
        symbol: 'sdlf.uk',
        keywords: ['standard life', 'phoenix group'],
    },
    {
        label: 'SDR',
        symbol: 'sdr.uk',
        keywords: ['schroders'],
    },
    {
        label: 'SGE',
        symbol: 'sge.uk',
        keywords: ['sage group'],
    },
    {
        label: 'SGRO',
        symbol: 'sgro.uk',
        keywords: ['segro'],
    },
    {
        label: 'SHEL',
        symbol: 'shel.uk',
        keywords: ['shell'],
    },
    {
        label: 'SMIN',
        symbol: 'smin.uk',
        keywords: ['smiths group'],
    },
    {
        label: 'SN',
        symbol: 'sn.uk',
        keywords: ['smith & nephew', 'smith and nephew'],
    },
    {
        label: 'SPX',
        symbol: 'spx.uk',
        keywords: ['spirax group', 'spirax-sarco'],
    },
    {
        label: 'SSE',
        symbol: 'sse.uk',
        keywords: ['sse'],
    },
    {
        label: 'STJ',
        symbol: 'stj.uk',
        keywords: ['st jamess place', "st james's place"],
    },
    {
        label: 'SVT',
        symbol: 'svt.uk',
        keywords: ['severn trent'],
    },
    {
        label: 'TATE',
        symbol: 'tate.uk',
        keywords: ['tate & lyle', 'tate and lyle'],
    },
    {
        label: 'TSCO',
        symbol: 'tsco.uk',
        keywords: ['tesco'],
    },
    {
        label: 'TW',
        symbol: 'tw.uk',
        keywords: ['taylor wimpey'],
    },
    {
        label: 'ULVR',
        symbol: 'ulvr.uk',
        keywords: ['unilever'],
    },
    {
        label: 'UU',
        symbol: 'uu.uk',
        keywords: ['united utilities'],
    },
    {
        label: 'VOD',
        symbol: 'vod.uk',
        keywords: ['vodafone'],
    },
    {
        label: 'WEIR',
        symbol: 'weir.uk',
        keywords: ['weir group'],
    },
    {
        label: 'WPP',
        symbol: 'wpp.uk',
        keywords: ['wpp'],
    },
    {
        label: 'WTB',
        symbol: 'wtb.uk',
        keywords: ['whitbread'],
    },
    {
        label: 'WIZZ',
        symbol: 'wizz.uk',
        keywords: ['wizz air'],
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
