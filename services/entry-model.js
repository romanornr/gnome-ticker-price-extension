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

export function clearPriceFlash(entries) {
    return entries.map(entry => ({
        ...entry,
        priceColor: DEFAULT_TEXT_COLOR,
    }));
}

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

function isLiveCryptoTicker(ticker) {
    return ticker?.assetCategory === ASSET_CATEGORIES.CRYPTO &&
        typeof ticker.liveSymbol === 'string' &&
        ticker.liveSymbol !== '';
}
