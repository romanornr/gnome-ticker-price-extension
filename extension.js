import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {QuotesService, TICKERS} from './services/quotes.js';
import {TickerIndicator} from './ui/indicator.js';
import {createLoadingEntries} from './utils/format.js';

const LEFT_PANEL_SIDE = 'left';
const RIGHT_PANEL_SIDE = 'right';
const LEFT_PANEL_POSITION = 999;

export default class TickerPriceExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._leftIndicator = null;
        this._rightIndicator = null;
        this._quotesService = null;
        this._quotesChangedId = 0;
    }

    enable() {
        this._startup();
    }

    disable() {
        this._shutdown();
    }

    _startup() {
        this._shutdown();

        this._leftIndicator = this._createIndicatorForSide(LEFT_PANEL_SIDE);
        this._rightIndicator = this._createIndicatorForSide(RIGHT_PANEL_SIDE);

        if (this._leftIndicator)
            Main.panel.addToStatusArea(
                `${this.uuid}-left`,
                this._leftIndicator,
                LEFT_PANEL_POSITION,
                LEFT_PANEL_SIDE
            );

        if (this._rightIndicator)
            Main.panel.addToStatusArea(`${this.uuid}-right`, this._rightIndicator, 0, RIGHT_PANEL_SIDE);

        this._quotesService = new QuotesService(this.uuid);
        this._quotesChangedId = this._quotesService.connect('entries-changed', () => {
            this._updateIndicators(this._quotesService.getEntries());
        });

        this._quotesService.start();
    }

    _createIndicatorForSide(side) {
        const entries = this._getEntriesForSide(createLoadingEntries(TICKERS), side);
        if (entries.length === 0)
            return null;

        const indicator = new TickerIndicator();
        indicator.setEntries(entries);
        return indicator;
    }

    _updateIndicators(entries) {
        this._leftIndicator?.setEntries(this._getEntriesForSide(entries, LEFT_PANEL_SIDE));
        this._rightIndicator?.setEntries(this._getEntriesForSide(entries, RIGHT_PANEL_SIDE));
    }

    _getEntriesForSide(entries, side) {
        const tickersForSide = TICKERS.filter(ticker => (ticker.panelSide ?? RIGHT_PANEL_SIDE) === side);
        const entriesByLabel = new Map(entries.map(entry => [entry.label, entry]));

        return tickersForSide
            .map(ticker => entriesByLabel.get(ticker.label))
            .filter(entry => entry !== undefined);
    }

    _shutdown() {
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
    }
}
