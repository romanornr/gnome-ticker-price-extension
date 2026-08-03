import {ASSET_CATEGORIES} from '../asset-categories.js';
import {MARKET_SESSION_IDS} from '../market-sessions.js';

/* This file is the curated mainland China equity suggestion source used by prefs search and mainland China cash-session defaults. */
const MAINLAND_CHINA_EQUITY_TICKER_DEFINITIONS = [
    {
        label: '600000',
        symbol: '600000.cn',
        keywords: ['shanghai pudong development bank'],
    },
    {
        label: '600004',
        symbol: '600004.cn',
        keywords: ['guangzhou baiyun int airport'],
    },
    {
        label: '600009',
        symbol: '600009.cn',
        keywords: ['shanghai int airport'],
    },
    {
        label: '600010',
        symbol: '600010.cn',
        keywords: ['inner mongolia baotou steel union'],
    },
    {
        label: '600011',
        symbol: '600011.cn',
        keywords: ['huaneng power int'],
    },
    {
        label: '600015',
        symbol: '600015.cn',
        keywords: ['huaxia bank'],
    },
    {
        label: '600016',
        symbol: '600016.cn',
        keywords: ['china minsheng banking'],
    },
    {
        label: '600018',
        symbol: '600018.cn',
        keywords: ['shanghai int port group'],
    },
    {
        label: '600019',
        symbol: '600019.cn',
        keywords: ['baoshan iron steel'],
    },
    {
        label: '600023',
        symbol: '600023.cn',
        keywords: ['zhejiang zheneng electric power'],
    },
    {
        label: '600025',
        symbol: '600025.cn',
        keywords: ['huaneng lancang river hydropower'],
    },
    {
        label: '600026',
        symbol: '600026.cn',
        keywords: ['cosco shipping energy transportation'],
    },
    {
        label: '600027',
        symbol: '600027.cn',
        keywords: ['huadian power int'],
    },
    {
        label: '600028',
        symbol: '600028.cn',
        keywords: ['china petroleum chemical'],
    },
    {
        label: '600029',
        symbol: '600029.cn',
        keywords: ['china southern airlines'],
    },
    {
        label: '600030',
        symbol: '600030.cn',
        keywords: ['citic securities'],
    },
    {
        label: '600031',
        symbol: '600031.cn',
        keywords: ['sany heavy industry'],
    },
    {
        label: '600036',
        symbol: '600036.cn',
        keywords: ['china merchants bank'],
    },
    {
        label: '600048',
        symbol: '600048.cn',
        keywords: ['poly developments and holdings group'],
    },
    {
        label: '600050',
        symbol: '600050.cn',
        keywords: ['china united network communications'],
    },
    {
        label: '600061',
        symbol: '600061.cn',
        keywords: ['sdic capital'],
    },
    {
        label: '600066',
        symbol: '600066.cn',
        keywords: ['yutong bus'],
    },
    {
        label: '600085',
        symbol: '600085.cn',
        keywords: ['beijing tong ren tang'],
    },
    {
        label: '600089',
        symbol: '600089.cn',
        keywords: ['tbea'],
    },
    {
        label: '600104',
        symbol: '600104.cn',
        keywords: ['saic motor'],
    },
    {
        label: '600111',
        symbol: '600111.cn',
        keywords: ['china northern rare earth group high tech'],
    },
    {
        label: '600115',
        symbol: '600115.cn',
        keywords: ['china eastern airlines'],
    },
    {
        label: '600118',
        symbol: '600118.cn',
        keywords: ['china spacesat'],
    },
    {
        label: '600150',
        symbol: '600150.cn',
        keywords: ['china cssc holdings'],
    },
    {
        label: '600176',
        symbol: '600176.cn',
        keywords: ['china jushi'],
    },
    {
        label: '600183',
        symbol: '600183.cn',
        keywords: ['shengyi technology'],
    },
    {
        label: '600188',
        symbol: '600188.cn',
        keywords: ['yankuang energy group'],
    },
    {
        label: '600196',
        symbol: '600196.cn',
        keywords: ['shanghai fosun pharmaceutical group'],
    },
    {
        label: '600219',
        symbol: '600219.cn',
        keywords: ['shandong nanshan aluminum'],
    },
    {
        label: '600276',
        symbol: '600276.cn',
        keywords: ['jiangsu hengrui pharmaceuticals'],
    },
    {
        label: '600309',
        symbol: '600309.cn',
        keywords: ['wanhua chemical group'],
    },
    {
        label: '600332',
        symbol: '600332.cn',
        keywords: ['guangzhou baiyunshan pharmaceutical holdings'],
    },
    {
        label: '600346',
        symbol: '600346.cn',
        keywords: ['hengli petrochemical'],
    },
    {
        label: '600362',
        symbol: '600362.cn',
        keywords: ['jiangxi copper'],
    },
    {
        label: '600372',
        symbol: '600372.cn',
        keywords: ['avic airborne systems'],
    },
    {
        label: '600383',
        symbol: '600383.cn',
        keywords: ['gemdale'],
    },
    {
        label: '600406',
        symbol: '600406.cn',
        keywords: ['nari technology'],
    },
    {
        label: '600415',
        symbol: '600415.cn',
        keywords: ['zhejiang china commodities'],
    },
    {
        label: '600426',
        symbol: '600426.cn',
        keywords: ['shandong hualu hengsheng chemical'],
    },
    {
        label: '600436',
        symbol: '600436.cn',
        keywords: ['zhangzhou pientzehuang pharmaceutical'],
    },
    {
        label: '600438',
        symbol: '600438.cn',
        keywords: ['tongwei'],
    },
    {
        label: '600489',
        symbol: '600489.cn',
        keywords: ['zhongjin gold'],
    },
    {
        label: '600515',
        symbol: '600515.cn',
        keywords: ['hainan airport infrastructure'],
    },
    {
        label: '600519',
        symbol: '600519.cn',
        keywords: ['kweichow moutai'],
    },
    {
        label: '600547',
        symbol: '600547.cn',
        keywords: ['shandong gold mining'],
    },
    {
        label: '600570',
        symbol: '600570.cn',
        keywords: ['hundsun technologies'],
    },
    {
        label: '600584',
        symbol: '600584.cn',
        keywords: ['jcet group'],
    },
    {
        label: '600585',
        symbol: '600585.cn',
        keywords: ['anhui conch cement'],
    },
    {
        label: '600588',
        symbol: '600588.cn',
        keywords: ['yonyou network technology'],
    },
    {
        label: '600600',
        symbol: '600600.cn',
        keywords: ['tsingtao brewery'],
    },
    {
        label: '600606',
        symbol: '600606.cn',
        keywords: ['greenland holdings'],
    },
    {
        label: '600660',
        symbol: '600660.cn',
        keywords: ['fuyao glass industry group'],
    },
    {
        label: '600674',
        symbol: '600674.cn',
        keywords: ['sichuan chuantou energy'],
    },
    {
        label: '600690',
        symbol: '600690.cn',
        keywords: ['haier smart home'],
    },
    {
        label: '600703',
        symbol: '600703.cn',
        keywords: ['sanan optoelectronics'],
    },
    {
        label: '600732',
        symbol: '600732.cn',
        keywords: ['shanghai aiko solar energy'],
    },
    {
        label: '600741',
        symbol: '600741.cn',
        keywords: ['huayu automotive systems'],
    },
    {
        label: '600745',
        symbol: '600745.cn',
        keywords: ['wingtech technology'],
    },
    {
        label: '600760',
        symbol: '600760.cn',
        keywords: ['avic shenyang aircraft'],
    },
    {
        label: '600795',
        symbol: '600795.cn',
        keywords: ['gd power development'],
    },
    {
        label: '600809',
        symbol: '600809.cn',
        keywords: ['shanxi xinghuacun fen wine'],
    },
    {
        label: '600845',
        symbol: '600845.cn',
        keywords: ['shanghai baosight software'],
    },
    {
        label: '600875',
        symbol: '600875.cn',
        keywords: ['dongfang electric'],
    },
    {
        label: '600886',
        symbol: '600886.cn',
        keywords: ['sdic power holdings'],
    },
    {
        label: '600887',
        symbol: '600887.cn',
        keywords: ['inner mongolia yili industrial group'],
    },
    {
        label: '600893',
        symbol: '600893.cn',
        keywords: ['aecc aviation power'],
    },
    {
        label: '600900',
        symbol: '600900.cn',
        keywords: ['china yangtze power'],
    },
    {
        label: '600905',
        symbol: '600905.cn',
        keywords: ['china three gorges renewables group'],
    },
    {
        label: '600918',
        symbol: '600918.cn',
        keywords: ['zhongtai securities'],
    },
    {
        label: '600919',
        symbol: '600919.cn',
        keywords: ['bank of jiangsu'],
    },
    {
        label: '600926',
        symbol: '600926.cn',
        keywords: ['bank of hangzhou'],
    },
    {
        label: '600938',
        symbol: '600938.cn',
        keywords: ['cnooc'],
    },
    {
        label: '600958',
        symbol: '600958.cn',
        keywords: ['orient securities'],
    },
    {
        label: '600970',
        symbol: '600970.cn',
        keywords: ['sinoma int engineering'],
    },
    {
        label: '600999',
        symbol: '600999.cn',
        keywords: ['china merchants securities'],
    },
    {
        label: '601006',
        symbol: '601006.cn',
        keywords: ['daqin railway'],
    },
    {
        label: '601009',
        symbol: '601009.cn',
        keywords: ['bank of nanjing'],
    },
    {
        label: '601012',
        symbol: '601012.cn',
        keywords: ['longi green energy technology'],
    },
    {
        label: '601018',
        symbol: '601018.cn',
        keywords: ['ningbo zhoushan port'],
    },
    {
        label: '601021',
        symbol: '601021.cn',
        keywords: ['spring airlines'],
    },
    {
        label: '601066',
        symbol: '601066.cn',
        keywords: ['csc financial'],
    },
    {
        label: '601088',
        symbol: '601088.cn',
        keywords: ['china shenhua energy'],
    },
    {
        label: '601100',
        symbol: '601100.cn',
        keywords: ['jiangsu hengli hydraulic'],
    },
    {
        label: '601111',
        symbol: '601111.cn',
        keywords: ['air china'],
    },
    {
        label: '601117',
        symbol: '601117.cn',
        keywords: ['china national chemical'],
    },
    {
        label: '601138',
        symbol: '601138.cn',
        keywords: ['foxconn industrial internet'],
    },
    {
        label: '601155',
        symbol: '601155.cn',
        keywords: ['seazen holdings'],
    },
    {
        label: '601166',
        symbol: '601166.cn',
        keywords: ['industrial bank'],
    },
    {
        label: '601169',
        symbol: '601169.cn',
        keywords: ['bank of beijing'],
    },
    {
        label: '601186',
        symbol: '601186.cn',
        keywords: ['china railway construction'],
    },
    {
        label: '601211',
        symbol: '601211.cn',
        keywords: ['guotai junan securities'],
    },
    {
        label: '601225',
        symbol: '601225.cn',
        keywords: ['shaanxi coal industry'],
    },
    {
        label: '601229',
        symbol: '601229.cn',
        keywords: ['bank of shanghai'],
    },
    {
        label: '601238',
        symbol: '601238.cn',
        keywords: ['guangzhou automobile group'],
    },
    {
        label: '601288',
        symbol: '601288.cn',
        keywords: ['agricultural bank of china'],
    },
    {
        label: '601318',
        symbol: '601318.cn',
        keywords: ['ping an insurance group'],
    },
    {
        label: '601328',
        symbol: '601328.cn',
        keywords: ['bank of communications'],
    },
    {
        label: '601336',
        symbol: '601336.cn',
        keywords: ['new china life insurance'],
    },
    {
        label: '601390',
        symbol: '601390.cn',
        keywords: ['china railway group'],
    },
    {
        label: '601398',
        symbol: '601398.cn',
        keywords: ['industrial commercial bank of china'],
    },
    {
        label: '601600',
        symbol: '601600.cn',
        keywords: ['aluminum of china'],
    },
    {
        label: '601601',
        symbol: '601601.cn',
        keywords: ['china pacific insurance group'],
    },
    {
        label: '601607',
        symbol: '601607.cn',
        keywords: ['shanghai pharmaceuticals holding'],
    },
    {
        label: '601618',
        symbol: '601618.cn',
        keywords: ['metallurgical of china'],
    },
    {
        label: '601628',
        symbol: '601628.cn',
        keywords: ['china life insurance'],
    },
    {
        label: '601633',
        symbol: '601633.cn',
        keywords: ['great wall motor'],
    },
    {
        label: '601668',
        symbol: '601668.cn',
        keywords: ['china state construction engineering'],
    },
    {
        label: '601669',
        symbol: '601669.cn',
        keywords: ['power construction of china'],
    },
    {
        label: '601688',
        symbol: '601688.cn',
        keywords: ['huatai securities'],
    },
    {
        label: '601698',
        symbol: '601698.cn',
        keywords: ['china satellite communications'],
    },
    {
        label: '601699',
        symbol: '601699.cn',
        keywords: ['shanxi luan environmental energy development'],
    },
    {
        label: '601728',
        symbol: '601728.cn',
        keywords: ['china telecom'],
    },
    {
        label: '601766',
        symbol: '601766.cn',
        keywords: ['crrc'],
    },
    {
        label: '601788',
        symbol: '601788.cn',
        keywords: ['everbright securities'],
    },
    {
        label: '601800',
        symbol: '601800.cn',
        keywords: ['china communications construction'],
    },
    {
        label: '601808',
        symbol: '601808.cn',
        keywords: ['china oilfield services'],
    },
    {
        label: '601818',
        symbol: '601818.cn',
        keywords: ['china everbright bank'],
    },
];


export const MAINLAND_CHINA_EQUITY_TICKERS = MAINLAND_CHINA_EQUITY_TICKER_DEFINITIONS.map(entry => ({
    assetCategory: ASSET_CATEGORIES.EQUITY,
    label: entry.label,
    symbol: entry.symbol,
    priceDecimals: 2,
    marketSessionId: MARKET_SESSION_IDS.CHINA_EQUITY_CASH,
    keywords: [...entry.keywords, 'china', 'mainland china', 'a-share', entry.label],
}));
