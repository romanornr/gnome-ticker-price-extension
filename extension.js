import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {QuotesService} from './services/quotes.js';
import {TickerIndicator} from './ui/indicator.js';
import {getSharedDensityFontScale} from './utils/display-density.js';
import {createLoadingEntries} from './utils/format.js';
import {LEFT_PANEL_SIDE, RIGHT_PANEL_SIDE} from './utils/panel-sides.js';
import {
    getTickersForSide,
    loadDisplaySettings,
    loadTickerConfigs,
    SETTINGS_KEYS,
} from './utils/settings.js';

const LEFT_PANEL_POSITION = 999;

/*
 * This file is the GNOME Shell entrypoint for the extension as a whole.
 *
 * It does not fetch or format quotes itself. Its system role is to:
 * - own extension lifecycle hooks from GNOME Shell
 * - create and stop the QuotesService runtime
 * - mirror the current entry set into left and right panel indicators
 *
 * In other words, this is the bridge between GNOME Shell lifecycle/events and
 * the rest of the internal market-data system.
 */
export default class TickerPriceExtension extends Extension {
    /* The extension object owns the shell-visible instances that survive between enable and disable. */
    constructor(metadata) {
        super(metadata);
        this._leftIndicator = null;
        this._rightIndicator = null;
        this._quotesService = null;
        this._quotesChangedId = 0;
        this._settings = null;
        this._settingsSignalIds = [];
    }

    /* enable() is the shell entry hook that boots the extension's runtime graph. */
    enable() {
        this._startup();
    }

    /* disable() mirrors enable() and tears the runtime down from the shell boundary inward. */
    disable() {
        this._shutdown();
    }

    /* Startup creates the runtime service, subscribes to entry changes, and seeds the panel with placeholders. */
    _startup() {
        this._shutdown();

        this._settings = this.getSettings();

        this._quotesService = new QuotesService(this.uuid, this._settings);
        this._quotesChangedId = this._quotesService.connect('entries-changed', () => {
            this._syncIndicators(this._quotesService.getEntries());
        });

        this._settingsSignalIds = [
            this._settings.connect(`changed::${SETTINGS_KEYS.TICKERS_JSON}`, () => {
                this._syncIndicators(this._quotesService?.getEntries() ?? this._getLoadingEntries());
            }),
        ];

        this._syncIndicators(this._getLoadingEntries());
        this._quotesService.start();
    }

    /* Before live data arrives, the shell still needs placeholder entries to render. */
    _getLoadingEntries() {
        const tickers = loadTickerConfigs(this._settings);
        const displaySettings = loadDisplaySettings(this._settings);
        return createLoadingEntries(tickers, displaySettings);
    }

    /* Entry changes from QuotesService are fanned back out to both panel-side indicators here. */
    _syncIndicators(entries) {
        const displaySettings = loadDisplaySettings(this._settings);
        const leftEntries = this._getEntriesForSide(entries, LEFT_PANEL_SIDE);
        const rightEntries = this._getEntriesForSide(entries, RIGHT_PANEL_SIDE);
        const sharedDisplaySettings = {
            ...displaySettings,
            fontScaleOverride: getSharedDensityFontScale([leftEntries, rightEntries], displaySettings.fontPreset),
        };

        this._ensureIndicatorForSide(LEFT_PANEL_SIDE, leftEntries, sharedDisplaySettings);
        this._ensureIndicatorForSide(RIGHT_PANEL_SIDE, rightEntries, sharedDisplaySettings);
    }

    /*
     * The extension keeps separate indicator instances per panel side so ticker
     * placement remains stable even as the saved list changes.
     */
    _ensureIndicatorForSide(side, sideEntries, displaySettings) {
        const propertyName = side === LEFT_PANEL_SIDE ? '_leftIndicator' : '_rightIndicator';
        const areaName = side === LEFT_PANEL_SIDE ? `${this.uuid}-left` : `${this.uuid}-right`;
        const position = side === LEFT_PANEL_SIDE ? LEFT_PANEL_POSITION : 0;

        if (sideEntries.length === 0) {
            this[propertyName]?.destroy();
            this[propertyName] = null;
            return;
        }

        if (!this[propertyName]) {
            this[propertyName] = new TickerIndicator(() => this.openPreferences());
            Main.panel.addToStatusArea(areaName, this[propertyName], position, side);
        }

        this[propertyName].setEntries(sideEntries, displaySettings);
    }

    /* Side filtering preserves saved ticker order per panel side before the indicator renders. */
    _getEntriesForSide(entries, side) {
        const tickersForSide = getTickersForSide(loadTickerConfigs(this._settings), side);
        const entriesBySymbol = new Map(entries.map(entry => [entry.symbol.toUpperCase(), entry]));
        const sideEntries = tickersForSide
            .map(ticker => entriesBySymbol.get(ticker.symbol.toUpperCase()))
            .filter(entry => entry !== undefined)
            .map(entry => ({...entry}));

        if (sideEntries.length > 0)
            sideEntries[0].separatorBefore = '';

        return sideEntries;
    }

    /* Shutdown tears the shell-facing boundary down cleanly so a later enable starts from a blank slate. */
    _shutdown() {
        this._settingsSignalIds.forEach(signalId => this._settings?.disconnect(signalId));
        this._settingsSignalIds = [];

        if (this._quotesService && this._quotesChangedId !== 0) {
            this._quotesService.disconnect(this._quotesChangedId);
            this._quotesChangedId = 0;
        }

        this._quotesService?.stop();
        this._quotesService = null;

        this._leftIndicator?.destroy();
        this._leftIndicator = null;

        this._rightIndicator?.destroy();
        this._rightIndicator = null;

        this._settings = null;
    }
}
