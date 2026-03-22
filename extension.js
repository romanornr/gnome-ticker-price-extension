import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {QuotesService, TICKERS} from './services/quotes.js';
import {TickerIndicator} from './ui/indicator.js';
import {createLoadingEntries} from './utils/format.js';

export default class TickerPriceExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
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

        this._indicator = new TickerIndicator();
        this._indicator.setEntries(createLoadingEntries(TICKERS));

        Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'right');

        this._quotesService = new QuotesService(this.uuid);
        this._quotesChangedId = this._quotesService.connect('entries-changed', () => {
            if (this._indicator)
                this._indicator.setEntries(this._quotesService.getEntries());
        });

        this._quotesService.start();
    }

    _shutdown() {
        if (this._quotesService && this._quotesChangedId !== 0) {
            this._quotesService.disconnect(this._quotesChangedId);
            this._quotesChangedId = 0;
        }

        this._quotesService?.stop();
        this._quotesService = null;

        this._indicator?.destroy();
        this._indicator = null;
    }
}
