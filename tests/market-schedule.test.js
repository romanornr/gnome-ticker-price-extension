import {
    createMarketScheduleNow,
    getRefreshIntervalSecondsForTicker,
    shouldRefreshTicker,
} from '../utils/market-schedule.js';
import {MARKET_SESSION_IDS} from '../utils/market-sessions.js';
import {assertEqual} from './support/assert.js';

export function runTests() {
    const alwaysOpenTicker = {marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN};
    const weekdayTicker = {marketSessionId: MARKET_SESSION_IDS.WEEKDAY_24H};
    const usTicker = {marketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED};
    const europeTicker = {marketSessionId: MARKET_SESSION_IDS.EUROPE_EQUITY_CASH};
    const ukTicker = {marketSessionId: MARKET_SESSION_IDS.UK_EQUITY_CASH};
    const japanTicker = {marketSessionId: MARKET_SESSION_IDS.JAPAN_EQUITY_CASH};
    const chinaTicker = {marketSessionId: MARKET_SESSION_IDS.CHINA_EQUITY_CASH};
    const australiaTicker = {marketSessionId: MARKET_SESSION_IDS.AUSTRALIA_EQUITY_CASH};

    const saturdayMorningNy = createMarketScheduleNow(new Date('2026-03-21T14:00:00Z'), 10_000_000);
    const mondayRegularHoursNy = createMarketScheduleNow(new Date('2026-03-23T15:00:00Z'), 10_000_000);
    const mondayOvernightNy = createMarketScheduleNow(new Date('2026-03-23T01:30:00Z'), 10_000_000);

    assertEqual(shouldRefreshTicker(alwaysOpenTicker, saturdayMorningNy, 0, 300), true,
        'Always-open tickers should refresh on weekends');
    assertEqual(shouldRefreshTicker(weekdayTicker, saturdayMorningNy, 0, 300), false,
        'Weekday-session tickers should skip weekends');
    assertEqual(shouldRefreshTicker(weekdayTicker, mondayRegularHoursNy, 0, 300), true,
        'Weekday-session tickers should refresh on weekdays');

    assertEqual(shouldRefreshTicker(usTicker, saturdayMorningNy, 0, 300), false,
        'U.S. session tickers should skip weekends');
    assertEqual(getRefreshIntervalSecondsForTicker(usTicker, mondayRegularHoursNy, 300), 300,
        'U.S. session tickers should use base cadence during extended hours');
    assertEqual(getRefreshIntervalSecondsForTicker(usTicker, mondayOvernightNy, 300), 1800,
        'U.S. session tickers should slow down overnight');

    assertEqual(shouldRefreshTicker(usTicker, mondayRegularHoursNy, 9_900_000, 300), false,
        'U.S. session tickers should respect cadence when recently refreshed');
    assertEqual(shouldRefreshTicker(usTicker, mondayRegularHoursNy, 0, 300), true,
        'U.S. session tickers should refresh when no prior refresh exists');
    assertEqual(getRefreshIntervalSecondsForTicker(europeTicker, mondayOvernightNy, 300), 1800,
        'European equity profiles should be able to slow down outside their cash session');
    assertEqual(getRefreshIntervalSecondsForTicker(ukTicker, mondayOvernightNy, 300), 1800,
        'U.K. equity profiles should be able to slow down outside their cash session');
    assertEqual(getRefreshIntervalSecondsForTicker(japanTicker, mondayOvernightNy, 300), 300,
        'Japan equity profiles should use base cadence during Tokyo daytime trading');
    assertEqual(getRefreshIntervalSecondsForTicker(chinaTicker, mondayRegularHoursNy, 300), 1800,
        'China equity profiles should slow down when the Shanghai session is closed');
    assertEqual(getRefreshIntervalSecondsForTicker(australiaTicker, mondayRegularHoursNy, 300), 1800,
        'Australia equity profiles should slow down when the Sydney session is closed');
}
