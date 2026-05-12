import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {DEFAULT_DISPLAY_SETTINGS, getFontPresetStyle} from '../utils/display-settings.js';
import {getDensityFontScale, shouldFitFontPreset} from '../utils/display-density.js';
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
        this._contentScale = 1;
        this._shouldFitToAllocation = false;
        this._fitTimeoutId = 0;

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
    setEntries(entries, displaySettings = DEFAULT_DISPLAY_SETTINGS) {
        this._content.destroy_all_children();
        this._shouldFitToAllocation = shouldFitFontPreset(displaySettings.fontPreset);
        this._contentScale = getDensityFontScale(entries, displaySettings.fontPreset);
        this._applyContentScale();
        const fontStyle = getFontPresetStyle(displaySettings.fontPreset);
        const createLabel = this._shouldFitToAllocation ? createFittedTickerLabel : createTickerLabel;

        entries.forEach(entry => {
            if (entry.separatorBefore) {
                this._content.add_child(createLabel({
                    text: entry.separatorBefore,
                    style: buildLabelStyle({color: SECONDARY_TEXT_COLOR, fontStyle}),
                }));
            }

            this._content.add_child(createLabel({
                text: entry.label,
                style: buildLabelStyle({color: PRIMARY_TEXT_COLOR, weight: 500, fontStyle}),
            }));

            if (entry.showPrice) {
                this._content.add_child(createLabel({
                    text: ` ${entry.priceText}`,
                    style: buildLabelStyle({
                        color: entry.priceColor ?? DEFAULT_TEXT_COLOR,
                        fontStyle,
                    }),
                }));
            }

            if (entry.showArrow) {
                this._content.add_child(createLabel({
                    text: ` ${entry.arrow}`,
                    style: buildLabelStyle({
                        color: entry.changeColor ?? DEFAULT_TEXT_COLOR,
                        weight: 500,
                        fontSize: '0.92em',
                        fontStyle,
                    }),
                }));
            }

            if (entry.showPercent) {
                this._content.add_child(createLabel({
                    text: ` ${entry.percentText}`,
                    style: buildLabelStyle({
                        color: entry.changeColor ?? DEFAULT_TEXT_COLOR,
                        weight: 500,
                        fontStyle,
                    }),
                }));
            }
        });

        if (this._shouldFitToAllocation)
            this._scheduleFitToAllocation();
    }

    /* The density estimate is followed by a real allocation check once GNOME has laid out the panel. */
    _scheduleFitToAllocation() {
        this._fitTimeoutId = removeTimeout(this._fitTimeoutId);
        this._fitTimeoutId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
            this._fitTimeoutId = 0;
            this._fitToAllocation();
            return GLib.SOURCE_REMOVE;
        });
    }

    /*
     * If GNOME gives this panel item less width than its natural content wants,
     * scale the whole indicator down based on measured widths rather than a
     * font-name guess.
     */
    _fitToAllocation() {
        if (!this._shouldFitToAllocation)
            return;

        const allocatedWidth = this.get_width();
        if (!Number.isFinite(allocatedWidth) || allocatedWidth <= 0)
            return;

        const [, naturalWidth] = this._content.get_preferred_width(-1);
        if (!Number.isFinite(naturalWidth) || naturalWidth <= allocatedWidth)
            return;

        const measuredScale = Math.max(0.58, Math.min(this._contentScale, (allocatedWidth / naturalWidth) * this._contentScale * 0.96));
        const roundedScale = Math.round(measuredScale * 100) / 100;
        if (roundedScale < this._contentScale) {
            this._contentScale = roundedScale;
            this._applyContentScale();
        }
    }

    _applyContentScale() {
        this._content.style = this._contentScale < 1 ? `font-size: ${this._contentScale}em;` : '';
    }

    destroy() {
        this._fitTimeoutId = removeTimeout(this._fitTimeoutId);
        super.destroy();
    }
});

/* Default fonts use GNOME Shell's normal label allocation behavior. */
function createTickerLabel({text, style}) {
    return new St.Label({
        text,
        y_align: Clutter.ActorAlign.CENTER,
        style,
    });
}

/*
 * GNOME Shell may allocate panel children tightly when a custom font is wider
 * than the default. Disabling ellipsization preserves quote text instead of
 * turning prices into fragments such as "26,...".
 */
function createFittedTickerLabel({text, style}) {
    const label = new St.Label({
        text,
        y_align: Clutter.ActorAlign.CENTER,
        x_expand: false,
        style,
    });
    const textActor = typeof label.get_clutter_text === 'function'
        ? label.get_clutter_text()
        : label.clutter_text;

    textActor?.set_ellipsize(Pango.EllipsizeMode.NONE);
    textActor?.set_line_wrap(false);

    return label;
}

/* Inline style construction keeps the panel fragment hierarchy consistent without adding stylesheet plumbing. */
function buildLabelStyle({color, weight = null, fontSize = null, fontStyle = {}}) {
    const parts = [`color: ${color};`];

    if (weight !== null)
        parts.push(`font-weight: ${weight};`);

    const resolvedFontSize = fontSize ?? fontStyle.fontSize;
    if (resolvedFontSize !== null && resolvedFontSize !== undefined)
        parts.push(`font-size: ${resolvedFontSize};`);

    if (fontStyle.fontFamily)
        parts.push(`font-family: ${fontStyle.fontFamily};`);

    if (fontStyle.fontFeatureSettings)
        parts.push(`font-feature-settings: ${fontStyle.fontFeatureSettings};`);

    return parts.join(' ');
}

function removeTimeout(sourceId) {
    if (sourceId === 0)
        return 0;

    GLib.Source.remove(sourceId);
    return 0;
}
