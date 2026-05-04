import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {
    DEFAULT_TEXT_COLOR,
    PRIMARY_TEXT_COLOR,
    SECONDARY_TEXT_COLOR,
} from '../utils/format.js';

/*
 * TickerIndicator is the last step of the pipeline: it turns prebuilt entry
 * models into actual GNOME Shell label actors.
 *
 * It deliberately expects already-formatted entries from the quote/entry-model
 * layers, so it stays dumb about markets, providers, and formatting rules.
 */
export const TickerIndicator = GObject.registerClass(
class TickerIndicator extends PanelMenu.Button {
    /* The indicator initializes one reusable actor tree and one lightweight settings menu entry. */
    _init(openPreferences) {
        super._init(0.0, 'Ticker Indicator', false);

        this._openPreferences = openPreferences;
        this._content = new St.BoxLayout({y_align: Clutter.ActorAlign.CENTER});

        this.add_child(this._content);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addAction('Settings', () => {
            this.menu.close();
            this._openPreferences?.();
        });
    }

    /*
     * setEntries() is the final projection from entry-model output into GNOME
     * Shell actors. The indicator trusts upstream layers to have already
     * decided formatting, visibility, and colors.
     */
    setEntries(entries) {
        this._content.destroy_all_children();

        entries.forEach(entry => {
            if (entry.separatorBefore) {
                this._content.add_child(new St.Label({
                    text: entry.separatorBefore,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: buildLabelStyle({color: SECONDARY_TEXT_COLOR}),
                }));
            }

            this._content.add_child(new St.Label({
                text: entry.label,
                y_align: Clutter.ActorAlign.CENTER,
                style: buildLabelStyle({color: PRIMARY_TEXT_COLOR, weight: 500}),
            }));

            if (entry.showPrice) {
                this._content.add_child(new St.Label({
                    text: ` ${entry.priceText}`,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: buildLabelStyle({
                        color: entry.priceColor ?? DEFAULT_TEXT_COLOR,
                    }),
                }));
            }

            if (entry.showArrow) {
                this._content.add_child(new St.Label({
                    text: ` ${entry.arrow}`,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: buildLabelStyle({
                        color: entry.changeColor ?? DEFAULT_TEXT_COLOR,
                        weight: 500,
                        fontSize: '0.92em',
                    }),
                }));
            }

            if (entry.showPercent) {
                this._content.add_child(new St.Label({
                    text: ` ${entry.percentText}`,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: buildLabelStyle({
                        color: entry.changeColor ?? DEFAULT_TEXT_COLOR,
                        weight: 500,
                    }),
                }));
            }
        });
    }
});

/* Inline style construction keeps the panel fragment hierarchy consistent without adding stylesheet plumbing. */
function buildLabelStyle({color, weight = null, fontSize = null}) {
    const parts = [`color: ${color};`];

    if (weight !== null)
        parts.push(`font-weight: ${weight};`);

    if (fontSize !== null)
        parts.push(`font-size: ${fontSize};`);

    return parts.join(' ');
}
