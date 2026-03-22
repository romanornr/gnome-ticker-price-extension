import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {QuotesService} from './services/quotes.js';
import {TickerIndicator} from './ui/indicator.js';
import {createLoadingEntries} from './utils/format.js';
import {
    getTickersForSide,
    LEFT_PANEL_SIDE,
    loadDisplaySettings,
    loadTickerConfigs,
    RIGHT_PANEL_SIDE,
    SETTINGS_KEYS,
} from './utils/settings.js';

const LEFT_PANEL_POSITION = 999;

export default class TickerPriceExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._leftIndicator = null;
        this._rightIndicator = null;
        this._quotesService = null;
        this._quotesChangedId = 0;
        this._settings = null;
        this._settingsSignalIds = [];
    }

    enable() {
        this._startup();
    }

    disable() {
        this._shutdown();
    }

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

    _getLoadingEntries() {
        const tickers = loadTickerConfigs(this._settings);
        const displaySettings = loadDisplaySettings(this._settings);
        return createLoadingEntries(tickers, displaySettings);
    }

    _syncIndicators(entries) {
        this._ensureIndicatorForSide(LEFT_PANEL_SIDE, entries);
        this._ensureIndicatorForSide(RIGHT_PANEL_SIDE, entries);
    }

    _ensureIndicatorForSide(side, entries) {
        const sideEntries = this._getEntriesForSide(entries, side);
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

        this[propertyName].setEntries(sideEntries);
    }

    _getEntriesForSide(entries, side) {
        const tickersForSide = getTickersForSide(loadTickerConfigs(this._settings), side);
        const entriesBySymbol = new Map(entries.map(entry => [entry.symbol?.toUpperCase() ?? entry.label, entry]));

        return tickersForSide
            .map(ticker => entriesBySymbol.get(ticker.symbol.toUpperCase()) ?? entriesBySymbol.get(ticker.label))
            .filter(entry => entry !== undefined);
    }

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
