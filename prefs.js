import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Soup from 'gi://Soup?version=3.0';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    getAssetCategoryOptions,
    cloneTicker,
    formatRefreshIntervalLabel,
    getFormatPresetOptions,
    getMarketTypeForAssetCategory,
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
import {
    findCuratedTicker,
    matchCuratedTickers,
} from './utils/ticker-catalog.js';

const MAX_CURATED_SUGGESTIONS = 8;

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
        this._assetCategoryOptions = getAssetCategoryOptions();
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
            this._presentAssetCategoryDialog({
                title: 'Add ticker',
                initialAssetCategory: this._assetCategoryOptions[0].value,
                onSelected: assetCategory => {
                    this._presentTickerDialog({
                        title: 'Add ticker',
                        initialTicker: {
                            label: '',
                            symbol: '',
                            priceDecimals: 2,
                            panelSide: addSide,
                            assetCategory,
                            marketType: getMarketTypeForAssetCategory(assetCategory),
                        },
                        onSave: newTicker => {
                            saveTickerConfigs(this._settings, [...tickers, newTicker]);
                            this._rebuildTickerRows();
                        },
                    });
                },
            });
        }));
        this._addTickerRow(group, addRow);
    }

    _presentAssetCategoryDialog({title, initialAssetCategory, onSelected}) {
        const dialog = new Gtk.Dialog({
            transient_for: this._window,
            modal: true,
            use_header_bar: true,
            title,
        });
        dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        const continueButton = dialog.add_button('Continue', Gtk.ResponseType.OK);
        continueButton.add_css_class('suggested-action');

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

        const introLabel = new Gtk.Label({
            label: 'Choose what kind of ticker you want to add so the right market session and suggestions are ready immediately.',
            halign: Gtk.Align.START,
            wrap: true,
        });
        content.append(introLabel);

        const group = new Adw.PreferencesGroup();
        content.append(group);

        const categoryRow = this._createComboRow({
            title: 'Asset type',
            options: this._assetCategoryOptions,
            selectedValue: initialAssetCategory,
            onSelected: () => {},
        });
        group.add(categoryRow);

        dialog.connect('response', (_dialog, responseId) => {
            if (responseId === Gtk.ResponseType.OK) {
                const selectedOption = this._assetCategoryOptions[categoryRow.selected];
                if (selectedOption)
                    onSelected(selectedOption.value);
            }

            dialog.destroy();
        });

        dialog.present();
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

        let activeAssetCategory = initialTicker.assetCategory ?? this._assetCategoryOptions[0].value;
        let activeMarketType = getMarketTypeForAssetCategory(activeAssetCategory);

        const assetCategoryRow = this._createComboRow({
            title: 'Asset type',
            options: this._assetCategoryOptions,
            selectedValue: activeAssetCategory,
            onSelected: () => {},
        });
        formGroup.add(assetCategoryRow);

        const marketTypeRow = new Adw.ActionRow({
            title: 'Market session',
            subtitle: this._getMarketTypeTitle(activeMarketType),
        });
        formGroup.add(marketTypeRow);

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

        const verifyButton = this._createTextButton('Verify', () => {
            void runSymbolVerification();
        });
        symbolRow.add_suffix(verifyButton);

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

        const suggestionsGroup = new Adw.PreferencesGroup({
            title: 'Catalog matches',
            description: 'Type a label or symbol above to search the built-in catalog. You can still save any custom Stooq symbol.',
        });
        content.append(suggestionsGroup);

        const errorLabel = new Gtk.Label({
            halign: Gtk.Align.START,
            wrap: true,
            visible: false,
        });
        errorLabel.add_css_class('error');
        content.append(errorLabel);

        const verificationLabel = new Gtk.Label({
            halign: Gtk.Align.START,
            wrap: true,
            visible: false,
        });
        verificationLabel.add_css_class('dim-label');
        content.append(verificationLabel);

        const verificationSession = new Soup.Session();
        let verifyInProgress = false;
        let lastVerifiedSymbol = '';
        let verificationRequestId = 0;

        const suggestionRows = [];
        const applyCuratedTicker = curatedTicker => {
            labelRow.text = curatedTicker.label;
            symbolRow.text = curatedTicker.symbol;
            decimalsRow.value = curatedTicker.priceDecimals;
            activeAssetCategory = curatedTicker.assetCategory;
            activeMarketType = curatedTicker.marketType;
            assetCategoryRow.selected = this._findOptionIndex(this._assetCategoryOptions, curatedTicker.assetCategory);
            marketTypeRow.subtitle = this._getMarketTypeTitle(activeMarketType);
            updateSaveSensitivity();
        };

        const setVerificationMessage = (message, isError = false) => {
            verificationLabel.visible = message !== '';
            verificationLabel.label = message;

            if (isError)
                verificationLabel.add_css_class('error');
            else
                verificationLabel.remove_css_class('error');
        };

        const clearVerificationState = () => {
            lastVerifiedSymbol = '';
            setVerificationMessage('');
        };

        const clearSuggestionRows = () => {
            suggestionRows.splice(0).forEach(row => suggestionsGroup.remove(row));
        };

        const renderCuratedSuggestions = () => {
            clearSuggestionRows();

            const query = symbolRow.text.trim() || labelRow.text.trim();
            if (query === '') {
                const promptRow = new Adw.ActionRow({
                    title: 'Start typing to search',
                    subtitle: 'Curated matches stay hidden until you enter a label or symbol.',
                    sensitive: false,
                });
                suggestionsGroup.add(promptRow);
                suggestionRows.push(promptRow);
                return;
            }

            const matches = matchCuratedTickers(activeAssetCategory, query);
            if (matches.length === 0) {
                const emptyRow = new Adw.ActionRow({
                    title: 'No curated matches',
                    subtitle: 'Keep your manual symbol and use Verify to check whether Stooq returns data for it.',
                    sensitive: false,
                });
                suggestionsGroup.add(emptyRow);
                suggestionRows.push(emptyRow);
                return;
            }

            matches.slice(0, MAX_CURATED_SUGGESTIONS).forEach(curatedTicker => {
                const keywordText = (curatedTicker.keywords ?? []).slice(0, 3).join(' · ');
                const subtitle = keywordText === ''
                    ? `${curatedTicker.symbol} · ${curatedTicker.priceDecimals} decimals`
                    : `${curatedTicker.symbol} · ${curatedTicker.priceDecimals} decimals · ${keywordText}`;
                const row = new Adw.ActionRow({
                    title: curatedTicker.label,
                    subtitle,
                });
                row.add_suffix(this._createTextButton('Use', () => {
                    applyCuratedTicker(curatedTicker);
                }));
                suggestionsGroup.add(row);
                suggestionRows.push(row);
            });

            if (matches.length > MAX_CURATED_SUGGESTIONS) {
                const overflowRow = new Adw.ActionRow({
                    title: `Showing first ${MAX_CURATED_SUGGESTIONS} matches`,
                    subtitle: 'Keep typing to narrow the catalog results.',
                    sensitive: false,
                });
                suggestionsGroup.add(overflowRow);
                suggestionRows.push(overflowRow);
            }
        };

        const updateVerifyButtonSensitivity = () => {
            verifyButton.set_sensitive(symbolRow.text.trim() !== '' && !verifyInProgress);
        };

        const runSymbolVerification = async () => {
            const symbol = symbolRow.text.trim().toLowerCase();
            const symbolValidationMessage = this._validateTickerSymbol(symbol);

            if (symbolValidationMessage !== '') {
                setVerificationMessage(symbolValidationMessage, true);
                updateVerifyButtonSensitivity();
                return;
            }

            verificationRequestId += 1;
            const requestId = verificationRequestId;
            verifyInProgress = true;
            updateVerifyButtonSensitivity();
            setVerificationMessage(`Checking ${symbol} on Stooq...`);

            try {
                const result = await this._verifyTickerSymbol(verificationSession, symbol);
                if (requestId !== verificationRequestId)
                    return;

                lastVerifiedSymbol = symbol;
                setVerificationMessage(
                    `Verified ${result.symbol}. Stooq returned quote data dated ${result.quoteDate}.`
                );
            } catch (error) {
                if (requestId !== verificationRequestId)
                    return;

                lastVerifiedSymbol = '';
                setVerificationMessage(error.message, true);
            } finally {
                if (requestId === verificationRequestId) {
                    verifyInProgress = false;
                    updateVerifyButtonSensitivity();
                }
            }
        };

        const updateSaveSensitivity = () => {
            const validationMessage = this._validateTickerDraft(labelRow.text, symbolRow.text);
            const isValid = validationMessage === '';
            saveButton.set_sensitive(isValid);
            errorLabel.visible = !isValid;
            errorLabel.label = validationMessage;
            updateVerifyButtonSensitivity();
        };

        assetCategoryRow.connect('notify::selected', widget => {
            const option = this._assetCategoryOptions[widget.selected];
            if (!option)
                return;

            activeAssetCategory = option.value;
            activeMarketType = getMarketTypeForAssetCategory(activeAssetCategory);
            marketTypeRow.subtitle = this._getMarketTypeTitle(activeMarketType);
            renderCuratedSuggestions();
            updateSaveSensitivity();
        });
        labelRow.connect('notify::text', () => {
            renderCuratedSuggestions();
            updateSaveSensitivity();
        });
        symbolRow.connect('notify::text', () => {
            if (lastVerifiedSymbol !== '' && symbolRow.text.trim().toLowerCase() !== lastVerifiedSymbol)
                clearVerificationState();

            renderCuratedSuggestions();
            updateSaveSensitivity();
        });
        renderCuratedSuggestions();
        updateSaveSensitivity();

        dialog.connect('destroy', () => {
            verificationRequestId += 1;
            verificationSession.abort();
        });

        dialog.connect('response', (_dialog, responseId) => {
            if (responseId === Gtk.ResponseType.OK) {
                const matchingCuratedTicker = findCuratedTicker({
                    label: labelRow.text.trim(),
                    symbol: symbolRow.text.trim().toLowerCase(),
                    assetCategory: activeAssetCategory,
                });
                const nextTicker = {
                    ...initialTicker,
                    label: labelRow.text.trim(),
                    symbol: symbolRow.text.trim().toLowerCase(),
                    priceDecimals: decimalsRow.value,
                    panelSide: sideOptions[sideRow.selected].value,
                    marketType: getMarketTypeForAssetCategory(activeAssetCategory),
                    assetCategory: activeAssetCategory,
                };

                if (matchingCuratedTicker?.liveSymbol)
                    nextTicker.liveSymbol = matchingCuratedTicker.liveSymbol;
                else
                    delete nextTicker.liveSymbol;

                onSave(nextTicker);
            }

            dialog.destroy();
        });

        dialog.present();
    }

    _validateTickerDraft(label, symbol) {
        if (label.trim() === '')
            return 'Label is required.';

        return this._validateTickerSymbol(symbol);
    }

    _validateTickerSymbol(symbol) {
        if (symbol.trim() === '')
            return 'Symbol is required.';

        if (/\s/.test(symbol))
            return 'Symbol cannot contain spaces.';

        return '';
    }

    async _verifyTickerSymbol(session, symbol) {
        const csv = await this._fetchText(session, this._buildStooqLookupUrl(symbol));
        const rows = csv
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');
        const firstRow = rows[0] ?? '';
        const fields = firstRow.split(',');

        if (fields.length < 4)
            throw new Error(`Could not verify ${symbol}. Stooq returned an unexpected response.`);

        const returnedSymbol = `${fields[0] ?? ''}`.trim().toLowerCase();
        const quoteDate = `${fields[1] ?? ''}`.trim();
        const price = Number.parseFloat(`${fields[3] ?? ''}`.trim());

        if (returnedSymbol === '' || returnedSymbol === 'symbol')
            throw new Error(`Could not verify ${symbol}. Stooq returned an unexpected response.`);

        if (quoteDate.toUpperCase() === 'N/D' || !Number.isFinite(price))
            throw new Error(`Could not verify ${symbol}. No quote data was returned by Stooq.`);

        return {
            symbol: returnedSymbol,
            quoteDate,
        };
    }

    async _fetchText(session, url) {
        const message = Soup.Message.new('GET', url);
        const bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        return new TextDecoder().decode(bytes.get_data()).trim();
    }

    _buildStooqLookupUrl(symbol) {
        return `https://stooq.com/q/l/?s=${encodeURIComponent(symbol).replace(/%2B/g, '+')}&f=sd2t2cp&i=d`;
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

    _findOptionIndex(options, value) {
        return Math.max(0, options.findIndex(option => option.value === value));
    }

    _getMarketTypeTitle(marketType) {
        const option = this._marketTypeOptions.find(candidate => candidate.value === marketType);
        return option?.title ?? 'Unknown market session';
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
