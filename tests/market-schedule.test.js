import {
    createMarketScheduleNow,
    getRefreshIntervalSecondsForTicker,
    shouldRefreshTicker,
} from '../utils/market-schedule.js';
import {MARKET_TYPES} from '../utils/asset-categories.js';
import {assertEqual} from './support/assert.js';

export function runTests() {
    const alwaysOpenTicker = {marketType: MARKET_TYPES.ALWAYS_OPEN};
    const weekdayTicker = {marketType: MARKET_TYPES.WEEKDAY_SESSION};
    const usTicker = {marketType: MARKET_TYPES.US_SESSION};

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
}
