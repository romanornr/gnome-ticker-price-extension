import {FONT_PRESETS} from './display-settings.js';

const DENSITY_SCALE_START = 70;
const DENSITY_SCALE_END = 120;
const MIN_DENSITY_FONT_SCALE = 0.76;

/*
 * Display density estimates how much text one panel-side indicator is about to
 * render, then maps crowded mono-font content to a smaller inherited font size.
 *
 * It is kept separate from ui/indicator.js so the policy can be tested outside
 * the GNOME Shell process.
 */
export function shouldFitFontPreset(fontPreset) {
    switch (fontPreset) {
    case FONT_PRESETS.MONOSPACE:
    case FONT_PRESETS.IBM_PLEX_MONO:
    case FONT_PRESETS.JETBRAINS_MONO:
        return true;
    default:
        return false;
    }
}

export function getDensityFontScale(entries, fontPreset = FONT_PRESETS.SYSTEM) {
    if (!shouldFitFontPreset(fontPreset))
        return 1;

    const density = estimateEntriesDensity(entries);
    if (density <= DENSITY_SCALE_START)
        return 1;

    const progress = Math.min(1, (density - DENSITY_SCALE_START) / (DENSITY_SCALE_END - DENSITY_SCALE_START));
    const scale = 1 - (progress * (1 - MIN_DENSITY_FONT_SCALE));
    return Math.round(scale * 100) / 100;
}

function estimateEntriesDensity(entries) {
    return entries.reduce((total, entry) => {
        let entryDensity = textDensity(entry.separatorBefore) + textDensity(entry.label);

        if (entry.showPrice)
            entryDensity += textDensity(` ${entry.priceText}`);

        if (entry.showArrow)
            entryDensity += textDensity(` ${entry.arrow}`);

        if (entry.showPercent)
            entryDensity += textDensity(` ${entry.percentText}`);

        return total + entryDensity;
    }, 0);
}

function textDensity(text) {
    return `${text ?? ''}`.length;
}
