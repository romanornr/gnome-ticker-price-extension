import {ASSET_CATEGORIES, MARKET_TYPES} from '../asset-categories.js';

const US_EQUITY_TICKER_DEFINITIONS = [
    {
        label: 'AAPL',
        symbol: 'aapl.us',
        keywords: ['apple'],
    },
    {
        label: 'ABBV',
        symbol: 'abbv.us',
        keywords: ['abbvie'],
    },
    {
        label: 'ABNB',
        symbol: 'abnb.us',
        keywords: ['airbnb'],
    },
    {
        label: 'ADBE',
        symbol: 'adbe.us',
        keywords: ['adobe'],
    },
    {
        label: 'ADI',
        symbol: 'adi.us',
        keywords: ['analog devices'],
    },
    {
        label: 'ADP',
        symbol: 'adp.us',
        keywords: ['automatic data processing'],
    },
    {
        label: 'AMAT',
        symbol: 'amat.us',
        keywords: ['applied materials'],
    },
    {
        label: 'AMD',
        symbol: 'amd.us',
        keywords: ['advanced micro devices'],
    },
    {
        label: 'AMGN',
        symbol: 'amgn.us',
        keywords: ['amgen'],
    },
    {
        label: 'AMT',
        symbol: 'amt.us',
        keywords: ['american tower'],
    },
    {
        label: 'AMZN',
        symbol: 'amzn.us',
        keywords: ['amazon'],
    },
    {
        label: 'ANET',
        symbol: 'anet.us',
        keywords: ['arista networks'],
    },
    {
        label: 'AON',
        symbol: 'aon.us',
        keywords: ['aon'],
    },
    {
        label: 'APD',
        symbol: 'apd.us',
        keywords: ['air products'],
    },
    {
        label: 'APH',
        symbol: 'aph.us',
        keywords: ['amphenol'],
    },
    {
        label: 'APP',
        symbol: 'app.us',
        keywords: ['applovin'],
    },
    {
        label: 'ARM',
        symbol: 'arm.us',
        keywords: ['arm holdings'],
    },
    {
        label: 'AVGO',
        symbol: 'avgo.us',
        keywords: ['broadcom'],
    },
    {
        label: 'AXP',
        symbol: 'axp.us',
        keywords: ['american express'],
    },
    {
        label: 'BA',
        symbol: 'ba.us',
        keywords: ['boeing'],
    },
    {
        label: 'BAC',
        symbol: 'bac.us',
        keywords: ['bank of america'],
    },
    {
        label: 'BK',
        symbol: 'bk.us',
        keywords: ['bank of new york mellon', 'bny mellon'],
    },
    {
        label: 'BKNG',
        symbol: 'bkng.us',
        keywords: ['booking holdings'],
    },
    {
        label: 'BLK',
        symbol: 'blk.us',
        keywords: ['blackrock'],
    },
    {
        label: 'BMY',
        symbol: 'bmy.us',
        keywords: ['bristol myers squibb'],
    },
    {
        label: 'BRK.B',
        symbol: 'brk-b.us',
        keywords: ['berkshire hathaway', 'berkshire'],
    },
    {
        label: 'BX',
        symbol: 'bx.us',
        keywords: ['blackstone'],
    },
    {
        label: 'C',
        symbol: 'c.us',
        keywords: ['citigroup'],
    },
    {
        label: 'CAT',
        symbol: 'cat.us',
        keywords: ['caterpillar'],
    },
    {
        label: 'CB',
        symbol: 'cb.us',
        keywords: ['chubb'],
    },
    {
        label: 'CDNS',
        symbol: 'cdns.us',
        keywords: ['cadence design systems'],
    },
    {
        label: 'CEG',
        symbol: 'ceg.us',
        keywords: ['constellation energy'],
    },
    {
        label: 'CHTR',
        symbol: 'chtr.us',
        keywords: ['charter communications'],
    },
    {
        label: 'CI',
        symbol: 'ci.us',
        keywords: ['cigna'],
    },
    {
        label: 'CMCSA',
        symbol: 'cmcsa.us',
        keywords: ['comcast', 'nbcuniversal'],
    },
    {
        label: 'CMI',
        symbol: 'cmi.us',
        keywords: ['cummins'],
    },
    {
        label: 'COF',
        symbol: 'cof.us',
        keywords: ['capital one'],
    },
    {
        label: 'COIN',
        symbol: 'coin.us',
        keywords: ['coinbase', 'crypto exchange'],
    },
    {
        label: 'COP',
        symbol: 'cop.us',
        keywords: ['conocophillips', 'conoco phillips'],
    },
    {
        label: 'COST',
        symbol: 'cost.us',
        keywords: ['costco'],
    },
    {
        label: 'CRM',
        symbol: 'crm.us',
        keywords: ['salesforce'],
    },
    {
        label: 'CSCO',
        symbol: 'csco.us',
        keywords: ['cisco'],
    },
    {
        label: 'CTAS',
        symbol: 'ctas.us',
        keywords: ['cintas'],
    },
    {
        label: 'CVS',
        symbol: 'cvs.us',
        keywords: ['cvs health'],
    },
    {
        label: 'CVX',
        symbol: 'cvx.us',
        keywords: ['chevron'],
    },
    {
        label: 'DASH',
        symbol: 'dash.us',
        keywords: ['doordash'],
    },
    {
        label: 'DE',
        symbol: 'de.us',
        keywords: ['deere', 'john deere'],
    },
    {
        label: 'DELL',
        symbol: 'dell.us',
        keywords: ['dell technologies'],
    },
    {
        label: 'DIS',
        symbol: 'dis.us',
        keywords: ['disney', 'walt disney'],
    },
    {
        label: 'DUK',
        symbol: 'duk.us',
        keywords: ['duke energy'],
    },
    {
        label: 'ECL',
        symbol: 'ecl.us',
        keywords: ['ecolab'],
    },
    {
        label: 'EQIX',
        symbol: 'eqix.us',
        keywords: ['equinix'],
    },
    {
        label: 'ETN',
        symbol: 'etn.us',
        keywords: ['eaton'],
    },
    {
        label: 'FDX',
        symbol: 'fdx.us',
        keywords: ['fedex'],
    },
    {
        label: 'GE',
        symbol: 'ge.us',
        keywords: ['ge aerospace', 'general electric'],
    },
    {
        label: 'GILD',
        symbol: 'gild.us',
        keywords: ['gilead sciences'],
    },
    {
        label: 'GM',
        symbol: 'gm.us',
        keywords: ['general motors'],
    },
    {
        label: 'GOOGL',
        symbol: 'googl.us',
        keywords: ['google', 'alphabet'],
    },
    {
        label: 'GS',
        symbol: 'gs.us',
        keywords: ['goldman sachs'],
    },
    {
        label: 'HD',
        symbol: 'hd.us',
        keywords: ['home depot'],
    },
    {
        label: 'HON',
        symbol: 'hon.us',
        keywords: ['honeywell'],
    },
    {
        label: 'IBM',
        symbol: 'ibm.us',
        keywords: ['ibm'],
    },
    {
        label: 'INTC',
        symbol: 'intc.us',
        keywords: ['intel'],
    },
    {
        label: 'INTU',
        symbol: 'intu.us',
        keywords: ['intuit'],
    },
    {
        label: 'ISRG',
        symbol: 'isrg.us',
        keywords: ['intuitive surgical'],
    },
    {
        label: 'JPM',
        symbol: 'jpm.us',
        keywords: ['jpmorgan', 'jp morgan'],
    },
    {
        label: 'KKR',
        symbol: 'kkr.us',
        keywords: ['kkr'],
    },
    {
        label: 'KLAC',
        symbol: 'klac.us',
        keywords: ['kla'],
    },
    {
        label: 'KO',
        symbol: 'ko.us',
        keywords: ['coca-cola', 'coca cola'],
    },
    {
        label: 'LIN',
        symbol: 'lin.us',
        keywords: ['linde'],
    },
    {
        label: 'LLY',
        symbol: 'lly.us',
        keywords: ['eli lilly', 'lilly'],
    },
    {
        label: 'LOW',
        symbol: 'low.us',
        keywords: ['lowes', 'lowe\'s'],
    },
    {
        label: 'LRCX',
        symbol: 'lrcx.us',
        keywords: ['lam research'],
    },
    {
        label: 'MA',
        symbol: 'ma.us',
        keywords: ['mastercard'],
    },
    {
        label: 'MAR',
        symbol: 'mar.us',
        keywords: ['marriott'],
    },
    {
        label: 'MCD',
        symbol: 'mcd.us',
        keywords: ['mcdonalds', 'mcdonald\'s'],
    },
    {
        label: 'MCK',
        symbol: 'mck.us',
        keywords: ['mckesson'],
    },
    {
        label: 'MCO',
        symbol: 'mco.us',
        keywords: ['moodys'],
    },
    {
        label: 'MDLZ',
        symbol: 'mdlz.us',
        keywords: ['mondelez'],
    },
    {
        label: 'MDT',
        symbol: 'mdt.us',
        keywords: ['medtronic'],
    },
    {
        label: 'MELI',
        symbol: 'meli.us',
        keywords: ['mercadolibre'],
    },
    {
        label: 'META',
        symbol: 'meta.us',
        keywords: ['meta platforms', 'facebook'],
    },
    {
        label: 'MMM',
        symbol: 'mmm.us',
        keywords: ['3m'],
    },
    {
        label: 'MO',
        symbol: 'mo.us',
        keywords: ['altria'],
    },
    {
        label: 'MRK',
        symbol: 'mrk.us',
        keywords: ['merck'],
    },
    {
        label: 'MS',
        symbol: 'ms.us',
        keywords: ['morgan stanley'],
    },
    {
        label: 'MSFT',
        symbol: 'msft.us',
        keywords: ['microsoft'],
    },
    {
        label: 'MSTR',
        symbol: 'mstr.us',
        keywords: ['microstrategy', 'strategy'],
    },
    {
        label: 'MU',
        symbol: 'mu.us',
        keywords: ['micron'],
    },
    {
        label: 'NDX',
        symbol: '^ndq',
        priceDecimals: 0,
        keywords: ['nasdaq 100', 'nasdaq', 'index'],
    },
    {
        label: 'NFLX',
        symbol: 'nflx.us',
        keywords: ['netflix'],
    },
    {
        label: 'NKE',
        symbol: 'nke.us',
        keywords: ['nike'],
    },
    {
        label: 'NOW',
        symbol: 'now.us',
        keywords: ['servicenow', 'service now'],
    },
    {
        label: 'NVDA',
        symbol: 'nvda.us',
        keywords: ['nvidia'],
    },
    {
        label: 'ORCL',
        symbol: 'orcl.us',
        keywords: ['oracle'],
    },
    {
        label: 'PANW',
        symbol: 'panw.us',
        keywords: ['palo alto networks', 'palo alto'],
    },
    {
        label: 'PEP',
        symbol: 'pep.us',
        keywords: ['pepsico', 'pepsi'],
    },
    {
        label: 'PFE',
        symbol: 'pfe.us',
        keywords: ['pfizer'],
    },
    {
        label: 'PG',
        symbol: 'pg.us',
        keywords: ['procter & gamble', 'procter and gamble'],
    },
    {
        label: 'PGR',
        symbol: 'pgr.us',
        keywords: ['progressive'],
    },
    {
        label: 'PLD',
        symbol: 'pld.us',
        keywords: ['prologis'],
    },
    {
        label: 'PLTR',
        symbol: 'pltr.us',
        keywords: ['palantir'],
    },
    {
        label: 'PM',
        symbol: 'pm.us',
        keywords: ['philip morris'],
    },
    {
        label: 'PYPL',
        symbol: 'pypl.us',
        keywords: ['paypal'],
    },
    {
        label: 'QCOM',
        symbol: 'qcom.us',
        keywords: ['qualcomm'],
    },
    {
        label: 'RTX',
        symbol: 'rtx.us',
        keywords: ['rtx', 'raytheon'],
    },
    {
        label: 'SBUX',
        symbol: 'sbux.us',
        keywords: ['starbucks'],
    },
    {
        label: 'SCHW',
        symbol: 'schw.us',
        keywords: ['charles schwab', 'schwab'],
    },
    {
        label: 'SNOW',
        symbol: 'snow.us',
        keywords: ['snowflake'],
    },
    {
        label: 'SO',
        symbol: 'so.us',
        keywords: ['southern company'],
    },
    {
        label: 'SPX',
        symbol: '^spx',
        priceDecimals: 0,
        keywords: ['s&p 500', 'sp500', 'index'],
    },
    {
        label: 'SYK',
        symbol: 'syk.us',
        keywords: ['stryker'],
    },
    {
        label: 'T',
        symbol: 't.us',
        keywords: ['at&t', 'att'],
    },
    {
        label: 'TGT',
        symbol: 'tgt.us',
        keywords: ['target'],
    },
    {
        label: 'TMO',
        symbol: 'tmo.us',
        keywords: ['thermo fisher', 'thermo fisher scientific'],
    },
    {
        label: 'TMUS',
        symbol: 'tmus.us',
        keywords: ['t-mobile', 'tmobile'],
    },
    {
        label: 'TSLA',
        symbol: 'tsla.us',
        keywords: ['tesla'],
    },
    {
        label: 'TT',
        symbol: 'tt.us',
        keywords: ['trane technologies', 'trane'],
    },
    {
        label: 'TXN',
        symbol: 'txn.us',
        keywords: ['texas instruments'],
    },
    {
        label: 'UBER',
        symbol: 'uber.us',
        keywords: ['uber'],
    },
    {
        label: 'UNH',
        symbol: 'unh.us',
        keywords: ['unitedhealth', 'unitedhealth group'],
    },
    {
        label: 'UNP',
        symbol: 'unp.us',
        keywords: ['union pacific'],
    },
    {
        label: 'UPS',
        symbol: 'ups.us',
        keywords: ['united parcel service'],
    },
    {
        label: 'USB',
        symbol: 'usb.us',
        keywords: ['u.s. bancorp', 'us bancorp'],
    },
    {
        label: 'V',
        symbol: 'v.us',
        keywords: ['visa'],
    },
    {
        label: 'VZ',
        symbol: 'vz.us',
        keywords: ['verizon'],
    },
    {
        label: 'WELL',
        symbol: 'well.us',
        keywords: ['welltower'],
    },
    {
        label: 'WFC',
        symbol: 'wfc.us',
        keywords: ['wells fargo'],
    },
    {
        label: 'WMT',
        symbol: 'wmt.us',
        keywords: ['walmart'],
    },
    {
        label: 'XOM',
        symbol: 'xom.us',
        keywords: ['exxon', 'exxon mobil'],
    },
    {
        label: 'ZTS',
        symbol: 'zts.us',
        keywords: ['zoetis'],
    },
];

export const US_EQUITY_TICKERS = US_EQUITY_TICKER_DEFINITIONS.map(entry => ({
    assetCategory: ASSET_CATEGORIES.US_EQUITY,
    label: entry.label,
    symbol: entry.symbol,
    priceDecimals: entry.priceDecimals ?? 2,
    marketType: MARKET_TYPES.US_SESSION,
    keywords: [...entry.keywords],
}));
