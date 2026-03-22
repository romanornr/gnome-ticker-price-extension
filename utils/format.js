export const DEFAULT_TEXT_COLOR = '#ffffff';
export const POSITIVE_COLOR = '#3FB950';
export const NEGATIVE_COLOR = '#F85149';

export function createLoadingEntries(tickers) {
    return tickers.map(ticker => ({
        label: ticker.label,
        separatorBefore: ticker.separatorBefore ?? '',
        priceText: '...',
        displayPrice: null,
        arrow: '',
        percentText: '',
        priceColor: DEFAULT_TEXT_COLOR,
        changeColor: DEFAULT_TEXT_COLOR,
    }));
}

export function createErrorEntry(ticker) {
    return {
        label: ticker.label,
        separatorBefore: ticker.separatorBefore ?? '',
        priceText: '--',
        displayPrice: null,
        arrow: '',
        percentText: '',
        priceColor: DEFAULT_TEXT_COLOR,
        changeColor: DEFAULT_TEXT_COLOR,
    };
}

export function createDisplayEntry(ticker, quote, previousClose) {
    if (!Number.isFinite(previousClose)) {
        return {
            label: ticker.label,
            separatorBefore: ticker.separatorBefore ?? '',
            priceText: formatPrice(quote.price, ticker.priceDecimals),
            displayPrice: quote.price,
            arrow: '',
            percentText: '',
            priceColor: DEFAULT_TEXT_COLOR,
            changeColor: DEFAULT_TEXT_COLOR,
        };
    }

    const percentChange = ((quote.price - previousClose) / previousClose) * 100;

    return {
        label: ticker.label,
        separatorBefore: ticker.separatorBefore ?? '',
        priceText: formatPrice(quote.price, ticker.priceDecimals),
        displayPrice: quote.price,
        arrow: getArrow(percentChange),
        percentText: `${Math.abs(percentChange).toFixed(1)}%`,
        priceColor: DEFAULT_TEXT_COLOR,
        changeColor: getChangeColor(percentChange),
    };
}

function formatPrice(price, decimals) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(price);
}

function getArrow(percentChange) {
    if (percentChange > 0)
        return '\u25b2';

    if (percentChange < 0)
        return '\u25bc';

    return '\u25ba';
}

function getChangeColor(percentChange) {
    if (percentChange > 0)
        return POSITIVE_COLOR;

    if (percentChange < 0)
        return NEGATIVE_COLOR;

    return DEFAULT_TEXT_COLOR;
}
