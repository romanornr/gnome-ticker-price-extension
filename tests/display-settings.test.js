import {
    DEFAULT_DISPLAY_SETTINGS,
    FONT_PRESETS,
    getFontPresetOptions,
    getFontPresetStyle,
} from '../utils/display-settings.js';
import {loadDisplaySettings} from '../utils/settings.js';
import {assertEqual} from './support/assert.js';

export function runTests() {
    const monospaceStyle = getFontPresetStyle(FONT_PRESETS.MONOSPACE);
    const ibmPlexStyle = getFontPresetStyle(FONT_PRESETS.IBM_PLEX_MONO);
    const jetBrainsStyle = getFontPresetStyle(FONT_PRESETS.JETBRAINS_MONO);
    const optionValues = getFontPresetOptions().map(option => option.value);

    assertEqual(monospaceStyle.fontFamily, 'monospace',
        'Generic monospace preset should use the system monospace family');
    assertEqual(ibmPlexStyle.fontFamily, '"IBM Plex Mono", monospace',
        'IBM Plex Mono preset should include a monospace fallback');
    assertEqual(jetBrainsStyle.fontFamily, '"JetBrains Mono", monospace',
        'JetBrains Mono preset should include a monospace fallback');
    assertEqual(optionValues.includes(FONT_PRESETS.MONOSPACE), true,
        'Font preset options should include the generic monospace fallback');

    const invalidSettings = {
        settings_schema: {has_key: () => true},
        get_boolean: () => true,
        get_string: () => 'invalid-option',
    };
    const normalizedSettings = loadDisplaySettings(invalidSettings);
    assertEqual(normalizedSettings.formatPreset, DEFAULT_DISPLAY_SETTINGS.formatPreset,
        'Unknown format presets should fall back to the registry default');
    assertEqual(normalizedSettings.separatorStyle, DEFAULT_DISPLAY_SETTINGS.separatorStyle,
        'Unknown separator styles should fall back to the registry default');
    assertEqual(normalizedSettings.fontPreset, DEFAULT_DISPLAY_SETTINGS.fontPreset,
        'Unknown font presets should fall back to the registry default');
}
