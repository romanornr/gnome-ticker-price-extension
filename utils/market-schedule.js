import GLib from 'gi://GLib';

import {MARKET_TYPES} from './asset-categories.js';
import {DEFAULT_REFRESH_INTERVAL_SECONDS} from './display-settings.js';

/*
 * Market schedule rules answer one narrow system question:
 * when should a ticker be refreshed, given its market session model?
 *
 * Keeping these rules here prevents time-zone/session policy from being spread
 * across QuotesService, providers, and prefs code.
 */
const US_SESSION_OVERNIGHT_REFRESH_INTERVAL_SECONDS = 1800;
const US_MARKET_TIME_ZONE = 'America/New_York';
const US_MARKET_PREMARKET_START_HOUR = 4;
const US_MARKET_AFTER_HOURS_END_HOUR = 20;

/* The scheduler snapshots both wall-clock date and monotonic time here so policy and cadence share one input shape. */
export function createMarketScheduleNow(date = new Date(), monotonicUsec = GLib.get_monotonic_time()) {
    return {date, monotonicUsec};
}

/* The scheduling layer asks this one question for every ticker on each refresh pass. */
export function shouldRefreshTicker(
    ticker,
    now = createMarketScheduleNow(),
    lastRefreshUsec = 0,
    baseIntervalSeconds = DEFAULT_REFRESH_INTERVAL_SECONDS
) {
    if (ticker.marketType === MARKET_TYPES.ALWAYS_OPEN) return true;

    if (ticker.marketType === MARKET_TYPES.WEEKDAY_SESSION) return !isUsMarketWeekend(now.date);

    if (ticker.marketType === MARKET_TYPES.US_SESSION) {
        if (isUsMarketWeekend(now.date)) return false;

        return hasReachedCadence(
            lastRefreshUsec,
            getRefreshIntervalSecondsForTicker(ticker, now, baseIntervalSeconds),
            now.monotonicUsec
        );
    }

    return true;
}

/* U.S.-session tickers reuse this helper so the overnight slowdown policy stays centralized. */
export function getRefreshIntervalSecondsForTicker(
    ticker,
    now = createMarketScheduleNow(),
    baseIntervalSeconds = DEFAULT_REFRESH_INTERVAL_SECONDS
) {
    const intervalSeconds = baseIntervalSeconds || DEFAULT_REFRESH_INTERVAL_SECONDS;
    if (ticker.marketType !== MARKET_TYPES.US_SESSION) return intervalSeconds;

    return isUsMarketExtendedHoursActive(now.date)
        ? intervalSeconds
        : Math.max(intervalSeconds, US_SESSION_OVERNIGHT_REFRESH_INTERVAL_SECONDS);
}

/* Refresh cadence is evaluated against monotonic time so local clock changes do not distort polling behavior. */
function hasReachedCadence(lastRefreshUsec, refreshIntervalSeconds, nowUsec) {
    if (!lastRefreshUsec) return true;

    const elapsedSeconds = (nowUsec - lastRefreshUsec) / 1_000_000;
    return elapsedSeconds >= refreshIntervalSeconds;
}

/* Weekend rules are based on New York market time rather than the user's local timezone. */
function isUsMarketWeekend(date) {
    const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: US_MARKET_TIME_ZONE,
        weekday: 'short',
    }).format(date);

    return weekday === 'Sat' || weekday === 'Sun';
}

/* Extended-hours detection centralizes the repo's U.S. session window policy in one place. */
function isUsMarketExtendedHoursActive(date) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: US_MARKET_TIME_ZONE,
        hour: 'numeric',
        hourCycle: 'h23',
        minute: 'numeric',
    }).formatToParts(date);

    const hour = Number.parseInt(parts.find(part => part.type === 'hour')?.value ?? '', 10);
    const minute = Number.parseInt(parts.find(part => part.type === 'minute')?.value ?? '', 10);

    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return true;

    const minutesSinceMidnight = (hour * 60) + minute;
    return minutesSinceMidnight >= US_MARKET_PREMARKET_START_HOUR * 60 &&
        minutesSinceMidnight < US_MARKET_AFTER_HOURS_END_HOUR * 60;
}
