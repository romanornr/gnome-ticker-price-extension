/*
 * This module centralizes display-oriented defaults and option catalogs.
 *
 * It exists so formatting/prefs code can share one definition of presets,
 * separators, and refresh interval options without pushing that UI metadata back
 * into the heavier settings-normalization module.
 */
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

export const FONT_PRESETS = {
    SYSTEM: 'system',
    MONOSPACE: 'monospace',
    IBM_PLEX_MONO: 'ibm-plex-mono',
    JETBRAINS_MONO: 'jetbrains-mono',
    INTER: 'inter',
};

export const DEFAULT_REFRESH_INTERVAL_SECONDS = 300;

export const DEFAULT_DISPLAY_SETTINGS = {
    formatPreset: FORMAT_PRESETS.DEFAULT,
    showPrice: true,
    showArrow: true,
    showPercent: true,
    separatorStyle: SEPARATOR_STYLES.DOT,
    fontPreset: FONT_PRESETS.SYSTEM,
};

/* Formatters call this helper to turn the saved separator style into the actual panel text fragment. */
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

/* prefs reads these presets to expose the supported coarse display modes of the entry-formatting layer. */
export function getFormatPresetOptions() {
    return [
        {value: FORMAT_PRESETS.DEFAULT, title: 'Ticker + price + change'},
        {value: FORMAT_PRESETS.CHANGE, title: 'Ticker + change'},
        {value: FORMAT_PRESETS.PRICE, title: 'Ticker + price'},
    ];
}

/* Separator options stay centralized so formatting and prefs share the same allowed values and labels. */
export function getSeparatorOptions() {
    return [
        {value: SEPARATOR_STYLES.DOT, title: '\u00b7'},
        {value: SEPARATOR_STYLES.PIPES, title: '||'},
        {value: SEPARATOR_STYLES.SPACE, title: 'Spacing'},
    ];
}

/* Font presets stay intentionally curated so panel rendering remains predictable across systems. */
export function getFontPresetOptions() {
    return [
        {value: FONT_PRESETS.SYSTEM, title: 'System / GNOME default'},
        {value: FONT_PRESETS.MONOSPACE, title: 'System monospace'},
        {value: FONT_PRESETS.IBM_PLEX_MONO, title: 'IBM Plex Mono'},
        {value: FONT_PRESETS.JETBRAINS_MONO, title: 'JetBrains Mono'},
        {value: FONT_PRESETS.INTER, title: 'Inter'},
    ];
}

/* Indicator rendering asks this helper for CSS fragments instead of knowing preset details. */
export function getFontPresetStyle(fontPreset) {
    switch (fontPreset) {
    case FONT_PRESETS.MONOSPACE:
        return {
            fontFamily: 'monospace',
            fontFeatureSettings: '"tnum"',
        };
    case FONT_PRESETS.IBM_PLEX_MONO:
        return {
            fontFamily: '"IBM Plex Mono", monospace',
            fontFeatureSettings: '"tnum"',
        };
    case FONT_PRESETS.JETBRAINS_MONO:
        return {
            fontFamily: '"JetBrains Mono", monospace',
            fontFeatureSettings: '"tnum"',
        };
    case FONT_PRESETS.INTER:
        return {
            fontFamily: '"Inter Tight", "Inter", sans-serif',
            fontFeatureSettings: '"tnum"',
        };
    case FONT_PRESETS.SYSTEM:
    default:
        return {};
    }
}

/* Refresh interval options live here because they are UI-facing choices, not runtime scheduling policy itself. */
export function getRefreshIntervalOptions() {
    return [60, 120, 300, 600, 900, 1800, 3600];
}

/* prefs uses this formatter so interval labels stay consistent anywhere they are presented. */
export function formatRefreshIntervalLabel(seconds) {
    if (seconds < 60)
        return `${seconds} sec`;

    const minutes = seconds / 60;
    return `${minutes} min`;
}
