import {ASSET_CATEGORIES, MARKET_TYPES} from '../asset-categories.js';

/* This file is the curated U.S. ETF suggestion source used by prefs search and U.S.-session defaults. */
const US_ETF_TICKER_DEFINITIONS = [
    {
        label: 'ACWI',
        symbol: 'acwi.us',
        keywords: ['acwi', 'etf'],
    },
    {
        label: 'AGG',
        symbol: 'agg.us',
        keywords: ['agg', 'etf'],
    },
    {
        label: 'ARKK',
        symbol: 'arkk.us',
        keywords: ['ark innovation etf', 'ark'],
    },
    {
        label: 'AVDV',
        symbol: 'avdv.us',
        keywords: ['avdv', 'etf'],
    },
    {
        label: 'AVUV',
        symbol: 'avuv.us',
        keywords: ['avuv', 'etf'],
    },
    {
        label: 'BIL',
        symbol: 'bil.us',
        keywords: ['treasury bill etf', 'cash etf'],
    },
    {
        label: 'BITO',
        symbol: 'bito.us',
        keywords: ['bito', 'etf'],
    },
    {
        label: 'BND',
        symbol: 'bnd.us',
        keywords: ['bnd', 'etf'],
    },
    {
        label: 'BNDW',
        symbol: 'bndw.us',
        keywords: ['bndw', 'etf'],
    },
    {
        label: 'BNDX',
        symbol: 'bndx.us',
        keywords: ['bndx', 'etf'],
    },
    {
        label: 'BOIL',
        symbol: 'boil.us',
        keywords: ['boil', 'etf'],
    },
    {
        label: 'CIBR',
        symbol: 'cibr.us',
        keywords: ['cibr', 'etf'],
    },
    {
        label: 'CNYA',
        symbol: 'cnya.us',
        keywords: ['cnya', 'etf'],
    },
    {
        label: 'COWZ',
        symbol: 'cowz.us',
        keywords: ['cowz', 'etf'],
    },
    {
        label: 'CQQQ',
        symbol: 'cqqq.us',
        keywords: ['cqqq', 'etf'],
    },
    {
        label: 'CWB',
        symbol: 'cwb.us',
        keywords: ['cwb', 'etf'],
    },
    {
        label: 'DGRO',
        symbol: 'dgro.us',
        keywords: ['dgro', 'etf'],
    },
    {
        label: 'DIA',
        symbol: 'dia.us',
        keywords: ['dow etf', 'dow jones'],
    },
    {
        label: 'DIVO',
        symbol: 'divo.us',
        keywords: ['divo', 'etf'],
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
        label: 'EMB',
        symbol: 'emb.us',
        keywords: ['emb', 'etf'],
    },
    {
        label: 'EWT',
        symbol: 'ewt.us',
        keywords: ['ewt', 'etf'],
    },
    {
        label: 'EWW',
        symbol: 'eww.us',
        keywords: ['eww', 'etf'],
    },
    {
        label: 'EWZ',
        symbol: 'ewz.us',
        keywords: ['ewz', 'etf'],
    },
    {
        label: 'FDN',
        symbol: 'fdn.us',
        keywords: ['fdn', 'etf'],
    },
    {
        label: 'FLOT',
        symbol: 'flot.us',
        keywords: ['flot', 'etf'],
    },
    {
        label: 'FREL',
        symbol: 'frel.us',
        keywords: ['frel', 'etf'],
    },
    {
        label: 'FTEC',
        symbol: 'ftec.us',
        keywords: ['ftec', 'etf'],
    },
    {
        label: 'FXA',
        symbol: 'fxa.us',
        keywords: ['fxa', 'etf'],
    },
    {
        label: 'FXI',
        symbol: 'fxi.us',
        keywords: ['fxi', 'etf'],
    },
    {
        label: 'FXY',
        symbol: 'fxy.us',
        keywords: ['fxy', 'etf'],
    },
    {
        label: 'GDX',
        symbol: 'gdx.us',
        keywords: ['gold miners etf', 'gold miners'],
    },
    {
        label: 'GDXJ',
        symbol: 'gdxj.us',
        keywords: ['gdxj', 'etf'],
    },
    {
        label: 'GLD',
        symbol: 'gld.us',
        keywords: ['gold etf'],
    },
    {
        label: 'GLDM',
        symbol: 'gldm.us',
        keywords: ['gldm', 'etf'],
    },
    {
        label: 'GNR',
        symbol: 'gnr.us',
        keywords: ['gnr', 'etf'],
    },
    {
        label: 'GOVT',
        symbol: 'govt.us',
        keywords: ['govt', 'etf'],
    },
    {
        label: 'HNDL',
        symbol: 'hndl.us',
        keywords: ['hndl', 'etf'],
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
        label: 'IBIT',
        symbol: 'ibit.us',
        keywords: ['ibit', 'etf'],
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
        label: 'IGE',
        symbol: 'ige.us',
        keywords: ['ige', 'etf'],
    },
    {
        label: 'IGIB',
        symbol: 'igib.us',
        keywords: ['igib', 'etf'],
    },
    {
        label: 'IGV',
        symbol: 'igv.us',
        keywords: ['igv', 'etf'],
    },
    {
        label: 'IHI',
        symbol: 'ihi.us',
        keywords: ['ihi', 'etf'],
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
        label: 'ITA',
        symbol: 'ita.us',
        keywords: ['ita', 'etf'],
    },
    {
        label: 'ITB',
        symbol: 'itb.us',
        keywords: ['homebuilders etf', 'home builders'],
    },
    {
        label: 'ITOT',
        symbol: 'itot.us',
        keywords: ['itot', 'etf'],
    },
    {
        label: 'IUSB',
        symbol: 'iusb.us',
        keywords: ['iusb', 'etf'],
    },
    {
        label: 'IVES',
        symbol: 'ives.us',
        keywords: ['ives', 'etf'],
    },
    {
        label: 'IVV',
        symbol: 'ivv.us',
        keywords: ['ishares core s&p 500', 's&p 500 etf'],
    },
    {
        label: 'IVW',
        symbol: 'ivw.us',
        keywords: ['ivw', 'etf'],
    },
    {
        label: 'IWB',
        symbol: 'iwb.us',
        keywords: ['iwb', 'etf'],
    },
    {
        label: 'IWD',
        symbol: 'iwd.us',
        keywords: ['iwd', 'etf'],
    },
    {
        label: 'IWF',
        symbol: 'iwf.us',
        keywords: ['iwf', 'etf'],
    },
    {
        label: 'IWM',
        symbol: 'iwm.us',
        keywords: ['russell 2000', 'small cap'],
    },
    {
        label: 'IWY',
        symbol: 'iwy.us',
        keywords: ['iwy', 'etf'],
    },
    {
        label: 'IYF',
        symbol: 'iyf.us',
        keywords: ['iyf', 'etf'],
    },
    {
        label: 'IYG',
        symbol: 'iyg.us',
        keywords: ['iyg', 'etf'],
    },
    {
        label: 'IYH',
        symbol: 'iyh.us',
        keywords: ['iyh', 'etf'],
    },
    {
        label: 'IYJ',
        symbol: 'iyj.us',
        keywords: ['iyj', 'etf'],
    },
    {
        label: 'IYR',
        symbol: 'iyr.us',
        keywords: ['iyr', 'etf'],
    },
    {
        label: 'IYT',
        symbol: 'iyt.us',
        keywords: ['iyt', 'etf'],
    },
    {
        label: 'IYY',
        symbol: 'iyy.us',
        keywords: ['iyy', 'etf'],
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
        label: 'JNK',
        symbol: 'jnk.us',
        keywords: ['jnk', 'etf'],
    },
    {
        label: 'JPST',
        symbol: 'jpst.us',
        keywords: ['jpst', 'etf'],
    },
    {
        label: 'KBE',
        symbol: 'kbe.us',
        keywords: ['kbe', 'etf'],
    },
    {
        label: 'KOLD',
        symbol: 'kold.us',
        keywords: ['kold', 'etf'],
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
        label: 'MBB',
        symbol: 'mbb.us',
        keywords: ['mbb', 'etf'],
    },
    {
        label: 'MCHI',
        symbol: 'mchi.us',
        keywords: ['mchi', 'etf'],
    },
    {
        label: 'MDY',
        symbol: 'mdy.us',
        keywords: ['mdy', 'etf'],
    },
    {
        label: 'MGK',
        symbol: 'mgk.us',
        keywords: ['mgk', 'etf'],
    },
    {
        label: 'MINT',
        symbol: 'mint.us',
        keywords: ['mint', 'etf'],
    },
    {
        label: 'MTUM',
        symbol: 'mtum.us',
        keywords: ['mtum', 'etf'],
    },
    {
        label: 'NOBL',
        symbol: 'nobl.us',
        keywords: ['nobl', 'etf'],
    },
    {
        label: 'ONEQ',
        symbol: 'oneq.us',
        keywords: ['oneq', 'etf'],
    },
    {
        label: 'PBD',
        symbol: 'pbd.us',
        keywords: ['pbd', 'etf'],
    },
    {
        label: 'PDBC',
        symbol: 'pdbc.us',
        keywords: ['pdbc', 'etf'],
    },
    {
        label: 'PFF',
        symbol: 'pff.us',
        keywords: ['pff', 'etf'],
    },
    {
        label: 'QLD',
        symbol: 'qld.us',
        keywords: ['qld', 'etf'],
    },
    {
        label: 'QQQ',
        symbol: 'qqq.us',
        keywords: ['nasdaq 100 etf', 'invesco qqq'],
    },
    {
        label: 'QQQM',
        symbol: 'qqqm.us',
        keywords: ['qqqm', 'etf'],
    },
    {
        label: 'QUAL',
        symbol: 'qual.us',
        keywords: ['qual', 'etf'],
    },
    {
        label: 'REM',
        symbol: 'rem.us',
        keywords: ['rem', 'etf'],
    },
    {
        label: 'RPV',
        symbol: 'rpv.us',
        keywords: ['rpv', 'etf'],
    },
    {
        label: 'RSP',
        symbol: 'rsp.us',
        keywords: ['rsp', 'etf'],
    },
    {
        label: 'SCHB',
        symbol: 'schb.us',
        keywords: ['schb', 'etf'],
    },
    {
        label: 'SCHD',
        symbol: 'schd.us',
        keywords: ['dividend etf', 'schwab dividend'],
    },
    {
        label: 'SCHF',
        symbol: 'schf.us',
        keywords: ['schf', 'etf'],
    },
    {
        label: 'SCHG',
        symbol: 'schg.us',
        keywords: ['growth etf', 'schwab growth'],
    },
    {
        label: 'SCHK',
        symbol: 'schk.us',
        keywords: ['schk', 'etf'],
    },
    {
        label: 'SCHP',
        symbol: 'schp.us',
        keywords: ['schp', 'etf'],
    },
    {
        label: 'SCHX',
        symbol: 'schx.us',
        keywords: ['schx', 'etf'],
    },
    {
        label: 'SGOL',
        symbol: 'sgol.us',
        keywords: ['sgol', 'etf'],
    },
    {
        label: 'SGOV',
        symbol: 'sgov.us',
        keywords: ['sgov', 'etf'],
    },
    {
        label: 'SHV',
        symbol: 'shv.us',
        keywords: ['shv', 'etf'],
    },
    {
        label: 'SHY',
        symbol: 'shy.us',
        keywords: ['shy', 'etf'],
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
        label: 'SPDW',
        symbol: 'spdw.us',
        keywords: ['spdw', 'etf'],
    },
    {
        label: 'SPLV',
        symbol: 'splv.us',
        keywords: ['splv', 'etf'],
    },
    {
        label: 'SPTL',
        symbol: 'sptl.us',
        keywords: ['sptl', 'etf'],
    },
    {
        label: 'SPTS',
        symbol: 'spts.us',
        keywords: ['spts', 'etf'],
    },
    {
        label: 'SPY',
        symbol: 'spy.us',
        keywords: ['s&p 500 etf', 'spdr'],
    },
    {
        label: 'SPYG',
        symbol: 'spyg.us',
        keywords: ['spyg', 'etf'],
    },
    {
        label: 'SPYV',
        symbol: 'spyv.us',
        keywords: ['spyv', 'etf'],
    },
    {
        label: 'SSO',
        symbol: 'sso.us',
        keywords: ['sso', 'etf'],
    },
    {
        label: 'TAN',
        symbol: 'tan.us',
        keywords: ['tan', 'etf'],
    },
    {
        label: 'TIP',
        symbol: 'tip.us',
        keywords: ['tip', 'etf'],
    },
    {
        label: 'TLT',
        symbol: 'tlt.us',
        keywords: ['treasury', 'bonds'],
    },
    {
        label: 'TNA',
        symbol: 'tna.us',
        keywords: ['tna', 'etf'],
    },
    {
        label: 'TQQQ',
        symbol: 'tqqq.us',
        keywords: ['tqqq', 'etf'],
    },
    {
        label: 'UCO',
        symbol: 'uco.us',
        keywords: ['uco', 'etf'],
    },
    {
        label: 'UDOW',
        symbol: 'udow.us',
        keywords: ['udow', 'etf'],
    },
    {
        label: 'USMV',
        symbol: 'usmv.us',
        keywords: ['usmv', 'etf'],
    },
    {
        label: 'USO',
        symbol: 'uso.us',
        keywords: ['oil etf', 'crude oil'],
    },
    {
        label: 'VAW',
        symbol: 'vaw.us',
        keywords: ['vaw', 'etf'],
    },
    {
        label: 'VB',
        symbol: 'vb.us',
        keywords: ['vb', 'etf'],
    },
    {
        label: 'VBK',
        symbol: 'vbk.us',
        keywords: ['vbk', 'etf'],
    },
    {
        label: 'VBR',
        symbol: 'vbr.us',
        keywords: ['vbr', 'etf'],
    },
    {
        label: 'VCLT',
        symbol: 'vclt.us',
        keywords: ['vclt', 'etf'],
    },
    {
        label: 'VCR',
        symbol: 'vcr.us',
        keywords: ['vcr', 'etf'],
    },
    {
        label: 'VCSH',
        symbol: 'vcsh.us',
        keywords: ['vcsh', 'etf'],
    },
    {
        label: 'VDC',
        symbol: 'vdc.us',
        keywords: ['vdc', 'etf'],
    },
    {
        label: 'VDE',
        symbol: 'vde.us',
        keywords: ['vde', 'etf'],
    },
    {
        label: 'VEA',
        symbol: 'vea.us',
        keywords: ['developed markets etf', 'vanguard developed markets'],
    },
    {
        label: 'VEU',
        symbol: 'veu.us',
        keywords: ['veu', 'etf'],
    },
    {
        label: 'VFH',
        symbol: 'vfh.us',
        keywords: ['vfh', 'etf'],
    },
    {
        label: 'VGK',
        symbol: 'vgk.us',
        keywords: ['vgk', 'etf'],
    },
    {
        label: 'VGT',
        symbol: 'vgt.us',
        keywords: ['information technology etf', 'tech etf'],
    },
    {
        label: 'VHT',
        symbol: 'vht.us',
        keywords: ['vht', 'etf'],
    },
    {
        label: 'VIG',
        symbol: 'vig.us',
        keywords: ['vig', 'etf'],
    },
    {
        label: 'VIS',
        symbol: 'vis.us',
        keywords: ['vis', 'etf'],
    },
    {
        label: 'VMBS',
        symbol: 'vmbs.us',
        keywords: ['vmbs', 'etf'],
    },
    {
        label: 'VNQ',
        symbol: 'vnq.us',
        keywords: ['vnq', 'etf'],
    },
    {
        label: 'VNQI',
        symbol: 'vnqi.us',
        keywords: ['vnqi', 'etf'],
    },
    {
        label: 'VOE',
        symbol: 'voe.us',
        keywords: ['voe', 'etf'],
    },
    {
        label: 'VONG',
        symbol: 'vong.us',
        keywords: ['vong', 'etf'],
    },
    {
        label: 'VOO',
        symbol: 'voo.us',
        keywords: ['vanguard s&p 500', 's&p 500 etf'],
    },
    {
        label: 'VPU',
        symbol: 'vpu.us',
        keywords: ['vpu', 'etf'],
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
        label: 'VXF',
        symbol: 'vxf.us',
        keywords: ['vxf', 'etf'],
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
        label: 'XES',
        symbol: 'xes.us',
        keywords: ['xes', 'etf'],
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
