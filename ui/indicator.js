import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {DEFAULT_TEXT_COLOR} from '../utils/format.js';

export const TickerIndicator = GObject.registerClass(
class TickerIndicator extends PanelMenu.Button {
    _init(openPreferences) {
        super._init(0.0, 'Ticker Indicator', false);

        this._openPreferences = openPreferences;
        this._content = new St.BoxLayout({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.add_child(this._content);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addAction('Settings', () => {
            this.menu.close();
            this._openPreferences?.();
        });
    }

    setEntries(entries) {
        this._content.destroy_all_children();

        entries.forEach(entry => {
            if (entry.separatorBefore) {
                this._content.add_child(new St.Label({
                    text: entry.separatorBefore,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: `color: ${DEFAULT_TEXT_COLOR};`,
                }));
            }

            this._content.add_child(new St.Label({
                text: entry.label,
                y_align: Clutter.ActorAlign.CENTER,
                style: `color: ${DEFAULT_TEXT_COLOR};`,
            }));

            if (entry.showPrice) {
                this._content.add_child(new St.Label({
                    text: ` ${entry.priceText}`,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: `color: ${entry.priceColor ?? DEFAULT_TEXT_COLOR};`,
                }));
            }

            if (entry.showArrow) {
                this._content.add_child(new St.Label({
                    text: ` ${entry.arrow}`,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: `color: ${entry.changeColor ?? DEFAULT_TEXT_COLOR};`,
                }));
            }

            if (entry.showPercent) {
                this._content.add_child(new St.Label({
                    text: ` ${entry.percentText}`,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: `color: ${entry.changeColor ?? DEFAULT_TEXT_COLOR};`,
                }));
            }
        });
    }
});
