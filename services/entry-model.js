import {
    createDisplayEntry,
    createErrorEntry,
    createLoadingEntry,
} from '../utils/format.js';
import {
    DEFAULT_TEXT_COLOR,
    NEGATIVE_COLOR,
    POSITIVE_COLOR,
    STALE_TEXT_COLOR,
} from '../utils/format.js';
import {isLiveCryptoTicker} from '../utils/asset-categories.js';
import {createMarketScheduleNow, getTickerSessionPhase} from '../utils/market-schedule.js';

/*
 * This module translates QuoteStore state into loading, error, and display entries.
 * It decorates price changes while provider and schedule concerns remain upstream.
 */
export function buildEntries(tickers, quoteStore, displaySettings, previousEntries = [], now = createMarketScheduleNow()) {
    const baseEntries = tickers.map((ticker, index) => {
        const quote = quoteStore.getQuote(ticker.symbol);

        if (!quote && isLiveCryptoTicker(ticker))
            return createLoadingEntry(ticker, index, displaySettings);

        if (!quote)
            return createErrorEntry(ticker, index, displaySettings);

        return createDisplayEntry(ticker, quote, quote.previousClose, index, displaySettings, {
            isStale: shouldRenderStaleQuote(ticker, quoteStore, now),
        });
    });

    return decorateEntriesWithPriceFlash(baseEntries, previousEntries);
}

/* After the temporary flash window expires, entries return to the neutral text color. */
export function clearPriceFlash(entries) {
    return entries.map(entry => ({
        ...entry,
        priceColor: entry.isStale ? STALE_TEXT_COLOR : DEFAULT_TEXT_COLOR,
        priceFlash: false,
    }));
}

/* Price flash compares the new view-model to the previous render, not to raw quotes. */
function decorateEntriesWithPriceFlash(entries, previousEntries) {
    const previousEntriesBySymbol = new Map(
        previousEntries.map(entry => [entry.symbol?.toUpperCase() ?? entry.label, entry])
    );

    return entries.map(entry => {
        const previousEntry = previousEntriesBySymbol.get(entry.symbol?.toUpperCase() ?? entry.label);
        const previousPrice = previousEntry?.displayPrice;

        if (
            !previousEntry ||
            !Number.isFinite(previousPrice) ||
            !Number.isFinite(entry.displayPrice) ||
            previousEntry.priceText === entry.priceText
        ) {
            return entry;
        }

        return {
            ...entry,
            priceColor: entry.displayPrice > previousPrice ? POSITIVE_COLOR : NEGATIVE_COLOR,
            priceFlash: true,
        };
    });
}

/* Non-regular-session cached quotes are expected, so only regular-session stale quotes get muted. */
function shouldRenderStaleQuote(ticker, quoteStore, now) {
    if (!quoteStore.isStale(ticker.symbol))
        return false;

    return getTickerSessionPhase(ticker, now) === 'open';
}
