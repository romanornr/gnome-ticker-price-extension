export const FORMAT_PRESETS = {
    DEFAULT: 'default',
    CHANGE: 'change-only',
    PRICE: 'price-only',
};

export const SEPARATOR_STYLES = {
    DOT: 'dot',
    PIPES: 'pipes',
    SPACE: 'space',
};

export const DEFAULT_REFRESH_INTERVAL_SECONDS = 300;

export const DEFAULT_DISPLAY_SETTINGS = {
    formatPreset: FORMAT_PRESETS.DEFAULT,
    showPrice: true,
    showArrow: true,
    showPercent: true,
    separatorStyle: SEPARATOR_STYLES.DOT,
};

export function getSeparatorText(separatorStyle) {
    switch (separatorStyle) {
    case SEPARATOR_STYLES.PIPES:
        return ' || ';
    case SEPARATOR_STYLES.SPACE:
        return '   ';
    case SEPARATOR_STYLES.DOT:
    default:
        return ' \u00b7 ';
    }
}

export function getFormatPresetOptions() {
    return [
        {value: FORMAT_PRESETS.DEFAULT, title: 'Ticker + price + change'},
        {value: FORMAT_PRESETS.CHANGE, title: 'Ticker + change'},
        {value: FORMAT_PRESETS.PRICE, title: 'Ticker + price'},
    ];
}

export function getSeparatorOptions() {
    return [
        {value: SEPARATOR_STYLES.DOT, title: '\u00b7'},
        {value: SEPARATOR_STYLES.PIPES, title: '||'},
        {value: SEPARATOR_STYLES.SPACE, title: 'Spacing'},
    ];
}

export function getRefreshIntervalOptions() {
    return [60, 120, 300, 600, 900, 1800, 3600];
}

export function formatRefreshIntervalLabel(seconds) {
    if (seconds < 60)
        return `${seconds} sec`;

    const minutes = seconds / 60;
    return `${minutes} min`;
}
