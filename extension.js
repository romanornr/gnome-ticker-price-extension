import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Soup from 'gi://Soup?version=3.0';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const API_URL = 'https://stooq.com/q/l/?s=btc.v&i=d';

const TickerIndicator = GObject.registerClass(
class TickerIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Ticker Indicator', false);

        this._label = new St.Label({
            text: 'BTC ...',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'color: white;',
        });

        this.add_child(this._label);
    }

    setText(text) {
        this._label.set_text(text);
    }
});

export default class HelloWorldExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._session = new Soup.Session();
    }
    enable() {
        this._indicator = new TickerIndicator();

        // Keep the center clock and right-side indicators untouched
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'left');
        this._refreshPrice();
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }

    async _refreshPrice() {
        const message = Soup.Message.new('GET', API_URL);
        const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);

        const csv = new TextDecoder().decode(bytes.get_data()).trim();
        const fields = csv.split(',');
        const price = fields[6]?.trim();

        if (price)
            this._indicator?.setText(`BTC ${price}`);
    }
}
