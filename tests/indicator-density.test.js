import {FONT_PRESETS} from '../utils/display-settings.js';
import {getDensityFontScale, shouldFitFontPreset} from '../utils/display-density.js';
import {assertEqual, assertFalse, assertTruthy} from './support/assert.js';

export function runTests() {
    const shortEntries = [
        createEntry({label: 'DXY', priceText: '98.21', percentText: '0.1%'}),
        createEntry({label: 'EUR/USD', priceText: '1.0912', percentText: '0.2%'}),
    ];
    assertEqual(getDensityFontScale(shortEntries, FONT_PRESETS.JETBRAINS_MONO), 1,
        'Short panel sides should keep the default font scale even for mono fonts');

    const crowdedEntries = [
        createEntry({label: 'SPX', priceText: '6,870', percentText: '0.5%'}),
        createEntry({label: 'NDX', priceText: '26,123', percentText: '0.8%'}),
        createEntry({label: 'Gold', priceText: '4,120', percentText: '1.2%'}),
        createEntry({label: 'USO', priceText: '138.42', percentText: '0.6%'}),
        createEntry({label: 'ETH', priceText: '4,812', percentText: '2.4%'}),
        createEntry({label: 'BTC', priceText: '81,512', percentText: '1.7%'}),
    ];
    const crowdedMonoScale = getDensityFontScale(crowdedEntries, FONT_PRESETS.JETBRAINS_MONO);

    assertTruthy(crowdedMonoScale <= 0.8,
        'Crowded panel sides should scale down aggressively enough for full-detail right-side tickers');
    assertEqual(getDensityFontScale(crowdedEntries, FONT_PRESETS.SYSTEM), 1,
        'System font preset should not be pre-scaled by density');
    assertEqual(getDensityFontScale(crowdedEntries, FONT_PRESETS.INTER), 1,
        'Inter preset should not be pre-scaled by mono density policy');
    assertTruthy(shouldFitFontPreset(FONT_PRESETS.JETBRAINS_MONO),
        'JetBrains Mono should opt into measured fitting');
    assertFalse(shouldFitFontPreset(FONT_PRESETS.SYSTEM),
        'System font should not opt into measured fitting');
}

function createEntry({
    label,
    priceText,
    percentText,
}) {
    return {
        separatorBefore: ' · ',
        label,
        priceText,
        arrow: '▲',
        percentText,
        showPrice: true,
        showArrow: true,
        showPercent: true,
    };
}
