import {ASSET_CATEGORIES} from '../asset-categories.js';
import {MARKET_SESSION_IDS} from '../market-sessions.js';

/* This file is the curated Netherlands equity suggestion source used by prefs search and Europe cash-session defaults. */
const NETHERLANDS_EQUITY_TICKER_DEFINITIONS = [
    {
        label: 'AALB',
        symbol: 'aalb.nl',
        keywords: ['aalberts', 'aalberts nv'],
    },
    {
        label: 'ABN',
        symbol: 'abn.nl',
        keywords: ['abn amro', 'abn amro bank'],
    },
    {
        label: 'ACOMO',
        symbol: 'acomo.nl',
        keywords: ['acomo'],
    },
    {
        label: 'AD',
        symbol: 'ad.nl',
        keywords: ['ahold delhaize', 'koninklijke ahold delhaize'],
    },
    {
        label: 'ADYEN',
        symbol: 'adyen.nl',
        keywords: ['adyen'],
    },
    {
        label: 'AGN',
        symbol: 'agn.nl',
        keywords: ['aegon'],
    },
    {
        label: 'AGIL',
        symbol: 'agil.nl',
        keywords: ['agility capital holding'],
    },
    {
        label: 'AJAX',
        symbol: 'ajax.nl',
        keywords: ['ajax', 'afc ajax'],
    },
    {
        label: 'AKZA',
        symbol: 'akza.nl',
        keywords: ['akzo nobel', 'akzonobel'],
    },
    {
        label: 'ALFEN',
        symbol: 'alfen.nl',
        keywords: ['alfen'],
    },
    {
        label: 'ALLFG',
        symbol: 'allfg.nl',
        keywords: ['allfunds', 'allfunds group'],
    },
    {
        label: 'ALX',
        symbol: 'alx.nl',
        keywords: ['alumexx'],
    },
    {
        label: 'AMG',
        symbol: 'amg.nl',
        keywords: ['amg critical materials'],
    },
    {
        label: 'AMUND',
        symbol: 'amund.nl',
        keywords: ['almunda professionals'],
    },
    {
        label: 'APAM',
        symbol: 'apam.nl',
        keywords: ['aperam'],
    },
    {
        label: 'ARCAD',
        symbol: 'arcad.nl',
        keywords: ['arcadis'],
    },
    {
        label: 'ASM',
        symbol: 'asm.nl',
        keywords: ['asm international'],
    },
    {
        label: 'ASML',
        symbol: 'asml.nl',
        keywords: ['asml'],
    },
    {
        label: 'ASRNL',
        symbol: 'asrnl.nl',
        keywords: ['asr nederland'],
    },
    {
        label: 'AVTX',
        symbol: 'avtx.nl',
        keywords: ['avantium'],
    },
    {
        label: 'AXS',
        symbol: 'axs.nl',
        keywords: ['accsys technologies'],
    },
    {
        label: 'AZRN',
        symbol: 'azrn.nl',
        keywords: ['azerion'],
    },
    {
        label: 'BAMNB',
        symbol: 'bamnb.nl',
        keywords: ['bam', 'koninklijke bam groep'],
    },
    {
        label: 'BACE',
        symbol: 'bace.nl',
        keywords: ['bm3eac'],
    },
    {
        label: 'BESI',
        symbol: 'besi.nl',
        keywords: ['be semiconductor industries', 'besi'],
    },
    {
        label: 'BEVER',
        symbol: 'bever.nl',
        keywords: ['bever holding'],
    },
    {
        label: 'BFIT',
        symbol: 'bfit.nl',
        keywords: ['basic-fit'],
    },
    {
        label: 'BNJ',
        symbol: 'bnj.nl',
        keywords: ['banijay group'],
    },
    {
        label: 'BRNL',
        symbol: 'brnl.nl',
        keywords: ['brunel', 'brunel international'],
    },
    {
        label: 'CABKA',
        symbol: 'cabka.nl',
        keywords: ['cabka'],
    },
    {
        label: 'CABLE',
        symbol: 'cable.nl',
        keywords: ['global interconnection group'],
    },
    {
        label: 'CCEP',
        symbol: 'ccep.nl',
        keywords: ['coca-cola europacific partners'],
    },
    {
        label: 'CMCOM',
        symbol: 'cmcom.nl',
        keywords: ['cm.com', 'cmcom'],
    },
    {
        label: 'CRBN',
        symbol: 'crbn.nl',
        keywords: ['corbion'],
    },
    {
        label: 'CSG',
        symbol: 'csg.nl',
        keywords: ['csg', 'csg nv'],
    },
    {
        label: 'CTAC',
        symbol: 'ctac.nl',
        keywords: ['ctac'],
    },
    {
        label: 'CTPNV',
        symbol: 'ctpnv.nl',
        keywords: ['ctp', 'ctp nv'],
    },
    {
        label: 'CVC',
        symbol: 'cvc.nl',
        keywords: ['cvc', 'cvc capital partners'],
    },
    {
        label: 'DSFIR',
        symbol: 'dsfir.nl',
        keywords: ['dsm-firmenich', 'dsm firmenich'],
    },
    {
        label: 'EAS2P',
        symbol: 'eas2p.nl',
        keywords: ['ease2pay'],
    },
    {
        label: 'EBUS',
        symbol: 'ebus.nl',
        keywords: ['ebusco'],
    },
    {
        label: 'ECMPA',
        symbol: 'ecmpa.nl',
        keywords: ['eurocommercial properties'],
    },
    {
        label: 'EARTH',
        symbol: 'earth.nl',
        keywords: ['green earth group'],
    },
    {
        label: 'ECT',
        symbol: 'ect.nl',
        keywords: ['eurocastle investment'],
    },
    {
        label: 'ENVI',
        symbol: 'envi.nl',
        keywords: ['envipco'],
    },
    {
        label: 'ERC',
        symbol: 'erc.nl',
        keywords: ['er capital'],
    },
    {
        label: 'EXO',
        symbol: 'exo.nl',
        keywords: ['exor'],
    },
    {
        label: 'FAST',
        symbol: 'fast.nl',
        keywords: ['fastned'],
    },
    {
        label: 'FER',
        symbol: 'fer.nl',
        keywords: ['ferrovial'],
    },
    {
        label: 'FERGR',
        symbol: 'fergr.nl',
        keywords: ['ferrari group'],
    },
    {
        label: 'FFARM',
        symbol: 'ffarm.nl',
        keywords: ['forfarmers'],
    },
    {
        label: 'FLOW',
        symbol: 'flow.nl',
        keywords: ['flow traders'],
    },
    {
        label: 'FUR',
        symbol: 'fur.nl',
        keywords: ['fugro'],
    },
    {
        label: 'HAL',
        symbol: 'hal.nl',
        keywords: ['hal trust'],
    },
    {
        label: 'HAVAS',
        symbol: 'havas.nl',
        keywords: ['havas'],
    },
    {
        label: 'HEIA',
        symbol: 'heia.nl',
        keywords: ['heineken'],
    },
    {
        label: 'HEIJM',
        symbol: 'heijm.nl',
        keywords: ['heijmans', 'koninklijke heijmans'],
    },
    {
        label: 'HEIO',
        symbol: 'heio.nl',
        keywords: ['heineken holding'],
    },
    {
        label: 'HOLCO',
        symbol: 'holco.nl',
        keywords: ['holland colours'],
    },
    {
        label: 'HWK',
        symbol: 'hwk.nl',
        keywords: ['hawick data'],
    },
    {
        label: 'HYDRA',
        symbol: 'hydra.nl',
        keywords: ['hydratec industries'],
    },
    {
        label: 'IMCD',
        symbol: 'imcd.nl',
        keywords: ['imcd'],
    },
    {
        label: 'INGA',
        symbol: 'inga.nl',
        keywords: ['ing'],
    },
    {
        label: 'JDEP',
        symbol: 'jdep.nl',
        keywords: ['jde peets', "jde peet's"],
    },
    {
        label: 'KENDR',
        symbol: 'kendr.nl',
        keywords: ['kendrion'],
    },
    {
        label: 'KPN',
        symbol: 'kpn.nl',
        keywords: ['kpn', 'koninklijke kpn'],
    },
    {
        label: 'LIGHT',
        symbol: 'light.nl',
        keywords: ['signify'],
    },
    {
        label: 'LVIDE',
        symbol: 'lvide.nl',
        keywords: ['lavide holding'],
    },
    {
        label: 'MICC',
        symbol: 'micc.nl',
        keywords: ['magnum ice cream company'],
    },
    {
        label: 'MORE',
        symbol: 'more.nl',
        keywords: ['morefield group'],
    },
    {
        label: 'MTRK',
        symbol: 'mtrk.nl',
        keywords: ['motork'],
    },
    {
        label: 'MT',
        symbol: 'mt.nl',
        keywords: ['arcelormittal', 'arcelor mittal'],
    },
    {
        label: 'NAI',
        symbol: 'nai.nl',
        keywords: ['new amsterdam invest'],
    },
    {
        label: 'NEDAP',
        symbol: 'nedap.nl',
        keywords: ['nedap'],
    },
    {
        label: 'NEDSE',
        symbol: 'nedse.nl',
        keywords: ['nedsense'],
    },
    {
        label: 'NN',
        symbol: 'nn.nl',
        keywords: ['nn group'],
    },
    {
        label: 'NRP',
        symbol: 'nrp.nl',
        keywords: ['nepi rockcastle'],
    },
    {
        label: 'NSI',
        symbol: 'nsi.nl',
        keywords: ['nsi'],
    },
    {
        label: 'NXFIL',
        symbol: 'nxfil.nl',
        keywords: ['nx filtration'],
    },
    {
        label: 'NSE',
        symbol: 'nse.nl',
        keywords: ['new sources energy'],
    },
    {
        label: 'OCI',
        symbol: 'oci.nl',
        keywords: ['oci'],
    },
    {
        label: 'PBH',
        symbol: 'pbh.nl',
        keywords: ['pb holding'],
    },
    {
        label: 'PHARM',
        symbol: 'pharm.nl',
        keywords: ['pharming', 'pharming group'],
    },
    {
        label: 'PHIA',
        symbol: 'phia.nl',
        keywords: ['philips', 'koninklijke philips'],
    },
    {
        label: 'PNL',
        symbol: 'pnl.nl',
        keywords: ['postnl'],
    },
    {
        label: 'PORF',
        symbol: 'porf.nl',
        keywords: ['royal delft', 'porceleyne fles'],
    },
    {
        label: 'PRX',
        symbol: 'prx.nl',
        keywords: ['prosus'],
    },
    {
        label: 'QEV',
        symbol: 'qev.nl',
        keywords: ['spear investments'],
    },
    {
        label: 'RAND',
        symbol: 'rand.nl',
        keywords: ['randstad'],
    },
    {
        label: 'REINA',
        symbol: 'reina.nl',
        keywords: ['reinet investments'],
    },
    {
        label: 'REN',
        symbol: 'ren.nl',
        keywords: ['relx'],
    },
    {
        label: 'SBMO',
        symbol: 'sbmo.nl',
        keywords: ['sbm offshore'],
    },
    {
        label: 'SHELL',
        symbol: 'shell.nl',
        keywords: ['shell'],
    },
    {
        label: 'SLIGR',
        symbol: 'sligr.nl',
        keywords: ['sligro food group'],
    },
    {
        label: 'THEON',
        symbol: 'theon.nl',
        keywords: ['theon international'],
    },
    {
        label: 'TOM2',
        symbol: 'tom2.nl',
        keywords: ['tomtom'],
    },
    {
        label: 'TRIO',
        symbol: 'trio.nl',
        keywords: ['triodos bank'],
    },
    {
        label: 'TWEKA',
        symbol: 'tweka.nl',
        keywords: ['tkh group'],
    },
    {
        label: 'UMG',
        symbol: 'umg.nl',
        keywords: ['universal music group'],
    },
    {
        label: 'VALUE',
        symbol: 'value.nl',
        keywords: ['value8'],
    },
    {
        label: 'VLK',
        symbol: 'vlk.nl',
        keywords: ['van lanschot kempen'],
    },
    {
        label: 'VPK',
        symbol: 'vpk.nl',
        keywords: ['vopak', 'koninklijke vopak'],
    },
    {
        label: 'VVY',
        symbol: 'vvy.nl',
        keywords: ['vivoryon therapeutics'],
    },
    {
        label: 'WHA',
        symbol: 'wha.nl',
        keywords: ['wereldhave'],
    },
    {
        label: 'WKL',
        symbol: 'wkl.nl',
        keywords: ['wolters kluwer'],
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
