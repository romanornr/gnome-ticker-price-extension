import {
    DEFAULT_DISPLAY_SETTINGS,
    FORMAT_PRESETS,
    getSeparatorText,
} from './settings.js';

export const DEFAULT_TEXT_COLOR = '#ffffff';
export const POSITIVE_COLOR = '#3FB950';
export const NEGATIVE_COLOR = '#F85149';

export function createLoadingEntries(tickers, displaySettings = DEFAULT_DISPLAY_SETTINGS) {
    return tickers.map((ticker, index) => createLoadingEntry(ticker, index, displaySettings));
}

export function createLoadingEntry(ticker, index, displaySettings = DEFAULT_DISPLAY_SETTINGS) {
    return createBaseEntry({
        ticker,
        index,
        displaySettings,
        priceText: '...',
        displayPrice: null,
        arrow: '',
        percentText: '',
        priceColor: DEFAULT_TEXT_COLOR,
        changeColor: DEFAULT_TEXT_COLOR,
    });
}

export function createErrorEntry(ticker, index, displaySettings = DEFAULT_DISPLAY_SETTINGS) {
    return createBaseEntry({
        ticker,
        index,
        displaySettings,
        priceText: '--',
        displayPrice: null,
        arrow: '',
        percentText: '',
        priceColor: DEFAULT_TEXT_COLOR,
        changeColor: DEFAULT_TEXT_COLOR,
    });
}

export function createDisplayEntry(ticker, quote, previousClose, index, displaySettings = DEFAULT_DISPLAY_SETTINGS) {
    const priceText = formatPrice(quote.price, ticker.priceDecimals);

    if (!Number.isFinite(previousClose)) {
        return createBaseEntry({
            ticker,
            index,
            displaySettings,
            priceText,
            displayPrice: quote.price,
            arrow: '',
            percentText: '',
            priceColor: DEFAULT_TEXT_COLOR,
            changeColor: DEFAULT_TEXT_COLOR,
        });
    }

    const percentChange = ((quote.price - previousClose) / previousClose) * 100;

    return createBaseEntry({
        ticker,
        index,
        displaySettings,
        priceText,
        displayPrice: quote.price,
        arrow: getArrow(percentChange),
        percentText: `${Math.abs(percentChange).toFixed(1)}%`,
        priceColor: DEFAULT_TEXT_COLOR,
        changeColor: getChangeColor(percentChange),
    });
}

function createBaseEntry({
    ticker,
    index,
    displaySettings,
    priceText,
    displayPrice,
    arrow,
    percentText,
    priceColor,
    changeColor,
}) {
    const visibility = resolveVisibility(displaySettings);

    return {
        label: ticker.label,
        symbol: ticker.symbol,
        separatorBefore: index > 0
            ? (ticker.separatorBefore ?? getSeparatorText(displaySettings.separatorStyle))
            : '',
        priceText,
        displayPrice,
        arrow,
        percentText,
        showPrice: visibility.showPrice,
        showArrow: visibility.showArrow && arrow !== '',
        showPercent: visibility.showPercent && percentText !== '',
        priceColor,
        changeColor,
    };
}

function resolveVisibility(displaySettings) {
    const settings = {...DEFAULT_DISPLAY_SETTINGS, ...displaySettings};

    let presetVisibility;
    switch (settings.formatPreset) {
    case FORMAT_PRESETS.CHANGE:
        presetVisibility = {showPrice: false, showArrow: true, showPercent: true};
        break;
    case FORMAT_PRESETS.PRICE:
        presetVisibility = {showPrice: true, showArrow: false, showPercent: false};
        break;
    case FORMAT_PRESETS.DEFAULT:
    default:
        presetVisibility = {showPrice: true, showArrow: true, showPercent: true};
        break;
    }

    return {
        showPrice: presetVisibility.showPrice && settings.showPrice,
        showArrow: presetVisibility.showArrow && settings.showArrow,
        showPercent: presetVisibility.showPercent && settings.showPercent,
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
