import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import {DEFAULT_TEXT_COLOR} from '../utils/format.js';

export const TickerIndicator = GObject.registerClass(
class TickerIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Ticker Indicator', false);

        this._content = new St.BoxLayout({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.add_child(this._content);
    }

    setEntries(entries) {
        this._content.destroy_all_children();

        entries.forEach((entry, index) => {
            if (index > 0) {
                this._content.add_child(new St.Label({
                    text: ' \u00b7 ',
                    y_align: Clutter.ActorAlign.CENTER,
                    style: `color: ${DEFAULT_TEXT_COLOR};`,
                }));
            }

            this._content.add_child(new St.Label({
                text: `${entry.label} ${entry.priceText}`,
                y_align: Clutter.ActorAlign.CENTER,
                style: `color: ${entry.priceColor ?? DEFAULT_TEXT_COLOR};`,
            }));

            if (!entry.arrow || !entry.percentText)
                return;

            this._content.add_child(new St.Label({
                text: ` ${entry.arrow}`,
                y_align: Clutter.ActorAlign.CENTER,
                style: `color: ${entry.changeColor};`,
            }));

            this._content.add_child(new St.Label({
                text: ` ${entry.percentText}`,
                y_align: Clutter.ActorAlign.CENTER,
                style: `color: ${entry.changeColor};`,
            }));
        });
    }
});
