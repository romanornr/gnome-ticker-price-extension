import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    cloneTicker,
    formatRefreshIntervalLabel,
    getFormatPresetOptions,
    getMarketTypeOptions,
    getRefreshIntervalOptions,
    getTickersForSide,
    getSeparatorOptions,
    LEFT_PANEL_SIDE,
    loadDisplaySettings,
    loadRefreshIntervalSeconds,
    loadTickerConfigs,
    resetTickerConfigs,
    RIGHT_PANEL_SIDE,
    saveTickerConfigs,
    SETTINGS_KEYS,
} from './utils/settings.js';

class TickerPreferencesPage extends Adw.PreferencesPage {
    static {
        GObject.registerClass(this);
    }

    constructor(settings, window) {
        super({
            title: 'Preferences',
            icon_name: 'view-list-symbolic',
        });

        this._settings = settings;
        this._window = window;
        this._leftTickerGroup = null;
        this._rightTickerGroup = null;
        this._tickerActionsGroup = null;
        this._tickerRows = [];
        this._refreshOptions = getRefreshIntervalOptions();
        this._marketTypeOptions = getMarketTypeOptions();

        this._build();
        this._rebuildTickerRows();
    }

    _build() {
        this._leftTickerGroup = new Adw.PreferencesGroup({
            title: 'Left Panel Tickers',
            description: 'Tickers configured to appear on the left side of the panel.',
        });
        this.add(this._leftTickerGroup);

        this._rightTickerGroup = new Adw.PreferencesGroup({
            title: 'Right Panel Tickers',
            description: 'Tickers configured to appear on the right side of the panel.',
        });
        this.add(this._rightTickerGroup);

        this._tickerActionsGroup = new Adw.PreferencesGroup({
            title: 'Ticker Management',
            description: 'Restore the built-in ticker list and placement.',
        });
        this.add(this._tickerActionsGroup);

        const refreshGroup = new Adw.PreferencesGroup({
            title: 'Refresh',
        });
        this.add(refreshGroup);

        const refreshRow = this._createComboRow({
            title: 'Base polling interval',
            subtitle: 'Used as the normal polling cadence. Existing weekend and overnight rules still apply.',
            options: this._refreshOptions.map(seconds => ({
                value: seconds,
                title: formatRefreshIntervalLabel(seconds),
            })),
            selectedValue: loadRefreshIntervalSeconds(this._settings),
            onSelected: value => this._settings.set_uint(SETTINGS_KEYS.REFRESH_INTERVAL_SECONDS, value),
        });
        refreshGroup.add(refreshRow);

        const displayGroup = new Adw.PreferencesGroup({
            title: 'Display',
        });
        this.add(displayGroup);

        const displaySettings = loadDisplaySettings(this._settings);

        displayGroup.add(this._createComboRow({
            title: 'Format preset',
            options: getFormatPresetOptions(),
            selectedValue: displaySettings.formatPreset,
            onSelected: value => this._settings.set_string(SETTINGS_KEYS.FORMAT_PRESET, value),
        }));

        displayGroup.add(this._createSwitchRow({
            title: 'Show price',
            key: SETTINGS_KEYS.SHOW_PRICE,
        }));
        displayGroup.add(this._createSwitchRow({
            title: 'Show arrow',
            key: SETTINGS_KEYS.SHOW_ARROW,
        }));
        displayGroup.add(this._createSwitchRow({
            title: 'Show percent',
            key: SETTINGS_KEYS.SHOW_PERCENT,
        }));

        displayGroup.add(this._createComboRow({
            title: 'Separator',
            options: getSeparatorOptions(),
            selectedValue: displaySettings.separatorStyle,
            onSelected: value => this._settings.set_string(SETTINGS_KEYS.SEPARATOR_STYLE, value),
        }));
    }

    _rebuildTickerRows() {
        this._clearTickerRows();

        const tickers = loadTickerConfigs(this._settings);
        const leftTickers = getTickersForSide(tickers, LEFT_PANEL_SIDE);
        const rightTickers = getTickersForSide(tickers, RIGHT_PANEL_SIDE);

        this._addTickerRowsForSide({
            tickers,
            visibleTickers: leftTickers,
            group: this._leftTickerGroup,
            addSide: LEFT_PANEL_SIDE,
        });
        this._addTickerRowsForSide({
            tickers,
            visibleTickers: rightTickers,
            group: this._rightTickerGroup,
            addSide: RIGHT_PANEL_SIDE,
        });

        const resetRow = new Adw.ActionRow({
            title: 'Reset to defaults',
            subtitle: 'Restore the built-in ticker list and placement.',
        });
        resetRow.add_suffix(this._createTextButton('Reset', () => {
            resetTickerConfigs(this._settings);
            this._rebuildTickerRows();
        }));
        this._addTickerRow(this._tickerActionsGroup, resetRow);
    }

    _addTickerRowsForSide({tickers, visibleTickers, group, addSide}) {
        visibleTickers.forEach((ticker, visibleIndex) => {
            const index = tickers.indexOf(ticker);
            const row = new Adw.ActionRow({
                title: ticker.label,
                subtitle: `${ticker.symbol} \u00b7 ${ticker.priceDecimals} decimals`,
            });

            row.add_suffix(this._createIconButton('go-up-symbolic', 'Move up', () => {
                if (visibleIndex === 0)
                    return;

                const previousTicker = visibleTickers[visibleIndex - 1];
                const previousIndex = tickers.indexOf(previousTicker);
                const nextTickers = [...tickers];
                [nextTickers[previousIndex], nextTickers[index]] = [nextTickers[index], nextTickers[previousIndex]];
                saveTickerConfigs(this._settings, nextTickers);
                this._rebuildTickerRows();
            }, visibleIndex === 0));

            row.add_suffix(this._createIconButton('go-down-symbolic', 'Move down', () => {
                if (visibleIndex === visibleTickers.length - 1)
                    return;

                const nextTicker = visibleTickers[visibleIndex + 1];
                const nextIndex = tickers.indexOf(nextTicker);
                const nextTickers = [...tickers];
                [nextTickers[index], nextTickers[nextIndex]] = [nextTickers[nextIndex], nextTickers[index]];
                saveTickerConfigs(this._settings, nextTickers);
                this._rebuildTickerRows();
            }, visibleIndex === visibleTickers.length - 1));

            row.add_suffix(this._createTextButton('Edit', () => {
                this._presentTickerDialog({
                    title: 'Edit ticker',
                    initialTicker: cloneTicker(ticker),
                    onSave: updatedTicker => {
                        const nextTickers = [...tickers];
                        nextTickers[index] = updatedTicker;
                        saveTickerConfigs(this._settings, nextTickers);
                        this._rebuildTickerRows();
                    },
                });
            }));

            row.add_suffix(this._createTextButton('Remove', () => {
                const nextTickers = tickers.filter((_, tickerIndex) => tickerIndex !== index);
                saveTickerConfigs(this._settings, nextTickers);
                this._rebuildTickerRows();
            }));

            this._addTickerRow(group, row);
        });

        const addRow = new Adw.ActionRow({
            title: 'Add ticker',
        });
        addRow.add_suffix(this._createTextButton('+ Add ticker', () => {
            this._presentTickerDialog({
                title: 'Add ticker',
                initialTicker: {
                    label: '',
                    symbol: '',
                    priceDecimals: 2,
                    panelSide: addSide,
                    marketType: this._marketTypeOptions[1].value,
                },
                onSave: newTicker => {
                    saveTickerConfigs(this._settings, [...tickers, newTicker]);
                    this._rebuildTickerRows();
                },
            });
        }));
        this._addTickerRow(group, addRow);
    }

    _presentTickerDialog({title, initialTicker, onSave}) {
        const dialog = new Gtk.Dialog({
            transient_for: this._window,
            modal: true,
            use_header_bar: true,
            title,
        });
        dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        const saveButton = dialog.add_button('Save', Gtk.ResponseType.OK);
        saveButton.add_css_class('suggested-action');

        const contentArea = dialog.get_content_area();
        contentArea.set_margin_top(12);
        contentArea.set_margin_bottom(12);
        contentArea.set_margin_start(12);
        contentArea.set_margin_end(12);

        const content = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
        });
        contentArea.append(content);

        const formGroup = new Adw.PreferencesGroup();
        content.append(formGroup);

        const labelRow = new Adw.EntryRow({
            title: 'Label',
            text: initialTicker.label ?? '',
        });
        formGroup.add(labelRow);

        const symbolRow = new Adw.EntryRow({
            title: 'Symbol',
            text: initialTicker.symbol ?? '',
        });
        formGroup.add(symbolRow);

        const decimalsAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 6,
            step_increment: 1,
            page_increment: 1,
            value: initialTicker.priceDecimals ?? 2,
        });
        const decimalsRow = new Adw.SpinRow({
            title: 'Decimals',
            adjustment: decimalsAdjustment,
        });
        formGroup.add(decimalsRow);

        const sideOptions = [
            {value: LEFT_PANEL_SIDE, title: 'Left'},
            {value: RIGHT_PANEL_SIDE, title: 'Right'},
        ];
        const sideRow = this._createComboRow({
            title: 'Panel side',
            options: sideOptions,
            selectedValue: initialTicker.panelSide ?? RIGHT_PANEL_SIDE,
            onSelected: () => {},
        });
        formGroup.add(sideRow);

        const marketGroup = new Adw.PreferencesGroup({
            title: 'Market type',
        });
        content.append(marketGroup);

        let activeMarketType = initialTicker.marketType ?? this._marketTypeOptions[1].value;
        let firstButton = null;

        this._marketTypeOptions.forEach(option => {
            const button = new Gtk.CheckButton({
                active: option.value === activeMarketType,
                valign: Gtk.Align.CENTER,
                group: firstButton,
            });
            if (!firstButton)
                firstButton = button;

            button.connect('toggled', () => {
                if (button.active)
                    activeMarketType = option.value;
            });

            const row = new Adw.ActionRow({
                title: option.title,
                subtitle: option.description,
                activatable_widget: button,
            });
            row.add_prefix(button);
            marketGroup.add(row);
        });

        const errorLabel = new Gtk.Label({
            halign: Gtk.Align.START,
            wrap: true,
            visible: false,
        });
        errorLabel.add_css_class('error');
        content.append(errorLabel);

        const updateSaveSensitivity = () => {
            const validationMessage = this._validateTickerDraft(labelRow.text, symbolRow.text);
            const isValid = validationMessage === '';
            saveButton.set_sensitive(isValid);
            errorLabel.visible = !isValid;
            errorLabel.label = validationMessage;
        };

        labelRow.connect('notify::text', updateSaveSensitivity);
        symbolRow.connect('notify::text', updateSaveSensitivity);
        updateSaveSensitivity();

        dialog.connect('response', (_dialog, responseId) => {
            if (responseId === Gtk.ResponseType.OK) {
                const nextTicker = {
                    ...initialTicker,
                    label: labelRow.text.trim(),
                    symbol: symbolRow.text.trim().toLowerCase(),
                    priceDecimals: decimalsRow.value,
                    panelSide: sideOptions[sideRow.selected].value,
                    marketType: activeMarketType,
                };

                onSave(nextTicker);
            }

            dialog.destroy();
        });

        dialog.present();
    }

    _validateTickerDraft(label, symbol) {
        if (label.trim() === '')
            return 'Label is required.';

        if (symbol.trim() === '')
            return 'Symbol is required.';

        if (/\s/.test(symbol))
            return 'Symbol cannot contain spaces.';

        return '';
    }

    _clearTickerRows() {
        this._tickerRows.forEach(({group, row}) => group.remove(row));
        this._tickerRows = [];
    }

    _addTickerRow(group, row) {
        group.add(row);
        this._tickerRows.push({group, row});
    }

    _createSwitchRow({title, key}) {
        const row = new Adw.SwitchRow({
            title,
            active: this._settings.get_boolean(key),
        });
        row.connect('notify::active', widget => {
            this._settings.set_boolean(key, widget.active);
        });
        return row;
    }

    _createComboRow({title, subtitle = '', options, selectedValue, onSelected}) {
        const stringList = Gtk.StringList.new(options.map(option => option.title));
        const row = new Adw.ComboRow({
            title,
            subtitle,
            model: stringList,
        });

        const selectedIndex = Math.max(0, options.findIndex(option => option.value === selectedValue));
        row.selected = selectedIndex;
        row.connect('notify::selected', widget => {
            const option = options[widget.selected];
            if (option)
                onSelected(option.value);
        });

        return row;
    }

    _createIconButton(iconName, tooltipText, onClicked, disabled = false) {
        const button = new Gtk.Button({
            icon_name: iconName,
            tooltip_text: tooltipText,
            sensitive: !disabled,
            valign: Gtk.Align.CENTER,
        });
        button.connect('clicked', onClicked);
        return button;
    }

    _createTextButton(label, onClicked) {
        const button = new Gtk.Button({
            label,
            valign: Gtk.Align.CENTER,
        });
        button.connect('clicked', onClicked);
        return button;
    }
}

export default class TickerPriceExtensionPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(760, 720);
        window.add(new TickerPreferencesPage(this.getSettings(), window));
    }
}
