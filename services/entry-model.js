import {
    createDisplayEntry,
    createErrorEntry,
    createLoadingEntry,
} from '../utils/format.js';
import {
    DEFAULT_TEXT_COLOR,
    NEGATIVE_COLOR,
    POSITIVE_COLOR,
} from '../utils/format.js';
import {ASSET_CATEGORIES} from '../utils/asset-categories.js';

/*
 * This module translates normalized quote cache state into UI-facing entry
 * models. It is the boundary between "we have quotes" and "the panel knows how
 * to render them".
 *
 * QuotesService and QuoteStore remain concerned with data freshness; this module
 * is concerned with user-visible states such as loading, error, formatted quote
 * display, and the temporary price-flash effect.
 */
/*
 * buildEntries() is the single translation step from normalized quotes into
 * indicator-ready render models, including the distinction between loading,
 * error, and normal display states.
 */
export function buildEntries(tickers, quoteStore, displaySettings, previousEntries = []) {
    const baseEntries = tickers.map((ticker, index) => {
        const quote = quoteStore.getQuote(ticker.symbol);

        if (!quote && isLiveCryptoTicker(ticker))
            return createLoadingEntry(ticker, index, displaySettings);

        if (!quote)
            return createErrorEntry(ticker, index, displaySettings);

        return createDisplayEntry(ticker, quote, quote.previousClose, index, displaySettings);
    });

    return decorateEntriesWithPriceFlash(baseEntries, previousEntries);
}

/* After the temporary flash window expires, entries return to the neutral text color. */
export function clearPriceFlash(entries) {
    return entries.map(entry => ({
        ...entry,
        priceColor: DEFAULT_TEXT_COLOR,
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
        };
    });
}

/* Live crypto should render as loading until the socket or fallback populates a quote. */
function isLiveCryptoTicker(ticker) {
    return ticker?.assetCategory === ASSET_CATEGORIES.CRYPTO &&
        typeof ticker.liveSymbol === 'string' &&
        ticker.liveSymbol !== '';
}
