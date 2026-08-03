/*
 * Market-session profiles define how a ticker's exchange schedule behaves.
 *
 * This module is the shared registry for runtime scheduling, settings defaults,
 * and prefs session-selection UI. It keeps session-policy data declarative so
 * adding a new exchange does not require spreading more branch logic across the
 * rest of the codebase.
 */
export const MARKET_SESSION_IDS = {
    ALWAYS_OPEN: 'always-open',
    WEEKDAY_24H: 'weekday-24h',
    US_EQUITY_EXTENDED: 'us-equity-extended',
    EUROPE_EQUITY_CASH: 'europe-equity-cash',
    UK_EQUITY_CASH: 'uk-equity-cash',
    JAPAN_EQUITY_CASH: 'japan-equity-cash',
    CHINA_EQUITY_CASH: 'china-equity-cash',
    HONG_KONG_EQUITY_CASH: 'hong-kong-equity-cash',
    TAIWAN_EQUITY_CASH: 'taiwan-equity-cash',
    SOUTH_KOREA_EQUITY_CASH: 'south-korea-equity-cash',
    INDIA_EQUITY_CASH: 'india-equity-cash',
    AUSTRALIA_EQUITY_CASH: 'australia-equity-cash',
};

const SESSION_PHASES = {
    OPEN: 'open',
    EXTENDED: 'extended',
    CLOSED: 'closed',
};

const MARKET_SESSION_PROFILES = {
    [MARKET_SESSION_IDS.ALWAYS_OPEN]: {
        title: 'Always open',
        description: 'Crypto and other 24/7 markets. Refreshes every day.',
        kind: 'always-open',
    },
    [MARKET_SESSION_IDS.WEEKDAY_24H]: {
        title: 'Weekday global market',
        description: 'Forex, spot commodities, and futures. Refreshes on weekdays and skips weekends.',
        kind: 'weekday-24h',
        timeZone: 'America/New_York',
        weekendDays: ['Sat', 'Sun'],
    },
    [MARKET_SESSION_IDS.US_EQUITY_EXTENDED]: {
        title: 'U.S. equity market with extended hours',
        description: 'U.S. stocks and ETFs. Uses premarket, regular, and after-hours windows with slower overnight refreshes.',
        kind: 'session-window',
        timeZone: 'America/New_York',
        weekendDays: ['Sat', 'Sun'],
        phases: [
            {name: SESSION_PHASES.EXTENDED, startMinutes: 4 * 60, endMinutes: 9 * 60 + 30},
            {name: SESSION_PHASES.OPEN, startMinutes: 9 * 60 + 30, endMinutes: 16 * 60},
            {name: SESSION_PHASES.EXTENDED, startMinutes: 16 * 60, endMinutes: 20 * 60},
        ],
    },
    [MARKET_SESSION_IDS.EUROPE_EQUITY_CASH]: {
        title: 'Europe equity market',
        description: 'European cash equities following standard continental Europe trading hours.',
        kind: 'session-window',
        timeZone: 'Europe/Berlin',
        weekendDays: ['Sat', 'Sun'],
        phases: [
            {name: SESSION_PHASES.OPEN, startMinutes: 9 * 60, endMinutes: 17 * 60 + 30},
        ],
    },
    [MARKET_SESSION_IDS.UK_EQUITY_CASH]: {
        title: 'U.K. equity market',
        description: 'U.K. cash equities following London market hours.',
        kind: 'session-window',
        timeZone: 'Europe/London',
        weekendDays: ['Sat', 'Sun'],
        phases: [
            {name: SESSION_PHASES.OPEN, startMinutes: 8 * 60, endMinutes: 16 * 60 + 30},
        ],
    },
    [MARKET_SESSION_IDS.JAPAN_EQUITY_CASH]: {
        title: 'Japan equity market',
        description: 'Japanese cash equities with morning and afternoon sessions separated by a lunch break.',
        kind: 'session-window',
        timeZone: 'Asia/Tokyo',
        weekendDays: ['Sat', 'Sun'],
        phases: [
            {name: SESSION_PHASES.OPEN, startMinutes: 9 * 60, endMinutes: 11 * 60 + 30},
            {name: SESSION_PHASES.OPEN, startMinutes: 12 * 60 + 30, endMinutes: 15 * 60 + 30},
        ],
    },
    [MARKET_SESSION_IDS.CHINA_EQUITY_CASH]: {
        title: 'China equity market',
        description: 'Mainland China cash equities with a midday lunch break.',
        kind: 'session-window',
        timeZone: 'Asia/Shanghai',
        weekendDays: ['Sat', 'Sun'],
        phases: [
            {name: SESSION_PHASES.OPEN, startMinutes: 9 * 60 + 30, endMinutes: 11 * 60 + 30},
            {name: SESSION_PHASES.OPEN, startMinutes: 13 * 60, endMinutes: 15 * 60},
        ],
    },
    [MARKET_SESSION_IDS.HONG_KONG_EQUITY_CASH]: {
        title: 'Hong Kong equity market',
        description: 'Hong Kong cash equities with separate morning and afternoon sessions.',
        kind: 'session-window',
        timeZone: 'Asia/Hong_Kong',
        weekendDays: ['Sat', 'Sun'],
        phases: [
            {name: SESSION_PHASES.OPEN, startMinutes: 9 * 60 + 30, endMinutes: 12 * 60},
            {name: SESSION_PHASES.OPEN, startMinutes: 13 * 60, endMinutes: 16 * 60},
        ],
    },
    [MARKET_SESSION_IDS.TAIWAN_EQUITY_CASH]: {
        title: 'Taiwan equity market',
        description: 'Taiwan cash equities following the TWSE daytime session.',
        kind: 'session-window',
        timeZone: 'Asia/Taipei',
        weekendDays: ['Sat', 'Sun'],
        phases: [
            {name: SESSION_PHASES.OPEN, startMinutes: 9 * 60, endMinutes: 13 * 60 + 30},
        ],
    },
    [MARKET_SESSION_IDS.SOUTH_KOREA_EQUITY_CASH]: {
        title: 'South Korea equity market',
        description: 'South Korean cash equities following KRX daytime trading hours.',
        kind: 'session-window',
        timeZone: 'Asia/Seoul',
        weekendDays: ['Sat', 'Sun'],
        phases: [
            {name: SESSION_PHASES.OPEN, startMinutes: 9 * 60, endMinutes: 15 * 60 + 30},
        ],
    },
    [MARKET_SESSION_IDS.INDIA_EQUITY_CASH]: {
        title: 'India equity market',
        description: 'Indian cash equities following NSE and BSE daytime trading hours.',
        kind: 'session-window',
        timeZone: 'Asia/Kolkata',
        weekendDays: ['Sat', 'Sun'],
        phases: [
            {name: SESSION_PHASES.OPEN, startMinutes: 9 * 60 + 15, endMinutes: 15 * 60 + 30},
        ],
    },
    [MARKET_SESSION_IDS.AUSTRALIA_EQUITY_CASH]: {
        title: 'Australia equity market',
        description: 'Australian cash equities following ASX daytime trading hours.',
        kind: 'session-window',
        timeZone: 'Australia/Sydney',
        weekendDays: ['Sat', 'Sun'],
        phases: [
            {name: SESSION_PHASES.OPEN, startMinutes: 10 * 60, endMinutes: 16 * 60},
        ],
    },
};

const LEGACY_MARKET_TYPE_TO_SESSION_ID = {
    'always-open': MARKET_SESSION_IDS.ALWAYS_OPEN,
    'always_open': MARKET_SESSION_IDS.ALWAYS_OPEN,
    'weekday-session': MARKET_SESSION_IDS.WEEKDAY_24H,
    'weekday_session': MARKET_SESSION_IDS.WEEKDAY_24H,
    'us-session': MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
    'us_session': MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
};

/* Session membership is owned by this registry so config normalization never repeats the id list. */
export function hasMarketSessionId(sessionId) {
    return Object.prototype.hasOwnProperty.call(MARKET_SESSION_PROFILES, sessionId);
}

/* Equity eligibility follows profile behavior rather than another manually synchronized id set. */
export function isEquityMarketSessionId(sessionId) {
    return hasMarketSessionId(sessionId) && MARKET_SESSION_PROFILES[sessionId].kind === 'session-window';
}

/* Callers use one accessor so session-profile data stays immutable at the module boundary. */
export function getMarketSessionProfile(sessionId) {
    if (!hasMarketSessionId(sessionId)) return null;

    const profile = MARKET_SESSION_PROFILES[sessionId];

    return {
        id: sessionId,
        ...profile,
        phases: Array.isArray(profile.phases) ? profile.phases.map(phase => ({...phase})) : [],
        weekendDays: Array.isArray(profile.weekendDays) ? [...profile.weekendDays] : [],
    };
}

/* prefs uses these options to expose explicit session choices for ticker entries. */
export function getMarketSessionOptions() {
    return Object.entries(MARKET_SESSION_PROFILES)
        .map(([sessionId, profile]) => ({value: sessionId, title: profile.title, description: profile.description}));
}

/* Recognized legacy marketType values resolve here; unknown values defer to ticker policy's single default. */
export function getMarketSessionIdFromLegacyMarketType(marketType) {
    return LEGACY_MARKET_TYPE_TO_SESSION_ID[marketType] ?? null;
}
