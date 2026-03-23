import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Soup from 'gi://Soup?version=3.0';

import {
    buildCatalogSuggestionRows,
    loadCryptoCatalog,
} from './catalog-suggestions.js';
import {
    buildTickerConfig,
    getCatalogMatches,
    getCryptoSearchQuery,
    getCryptoVerificationFailureMessage,
    getCryptoVerificationSuccessMessage,
    getSuggestionsDescription,
    resolveSelectedCryptoTicker,
    validateTickerDraft,
    validateTickerSymbol,
} from './ticker-dialog-state.js';
import {verifyTickerSymbol} from './stooq-verifier.js';
import {
    getDefaultCryptoProvider,
    getMarketSessionForAssetCategory,
    getMarketSessionOptionsForAssetCategory,
    LEFT_PANEL_SIDE,
    RIGHT_PANEL_SIDE,
} from '../settings.js';

const MAX_CURATED_SUGGESTIONS = 8;

/*
 * This controller owns the ticker dialog as one cohesive prefs subsystem.
 *
 * prefs.js remains responsible for the preferences page and row-level actions,
 * but it delegates the dialog's internal state machine here:
 * - asset/provider selection
 * - crypto catalog loading
 * - symbol verification
 * - suggestion rendering
 * - validation and save wiring
 *
 * That keeps the page file readable while preserving the current UX and helper
 * structure.
 */
/*
 * This class keeps the dialog's mutable prefs state in one place while the
 * module continues to expose a small functional entrypoint to prefs.js.
 */
class TickerDialogController {
    constructor({
        window,
        title,
        initialTicker,
        onSave,
        assetCategoryOptions,
        cryptoProviderOptions,
        createComboRow,
        createTextButton,
        findOptionIndex,
        getMarketSessionTitle,
    }) {
        this.window = window;
        this.title = title;
        this.initialTicker = initialTicker;
        this.onSave = onSave;
        this.assetCategoryOptions = assetCategoryOptions;
        this.cryptoProviderOptions = cryptoProviderOptions;
        this.createComboRow = createComboRow;
        this.createTextButton = createTextButton;
        this.findOptionIndex = findOptionIndex;
        this.getMarketSessionTitle = getMarketSessionTitle;

        this.activeAssetCategory = initialTicker.assetCategory ?? assetCategoryOptions[0].value;
        this.activeMarketSessionId = initialTicker.marketSessionId ?? getMarketSessionForAssetCategory(this.activeAssetCategory);
        this.activeCryptoProvider = this.activeAssetCategory === 'crypto'
            ? (initialTicker.cryptoProvider ?? getDefaultCryptoProvider())
            : '';
        this.marketSessionOptions = getMarketSessionOptionsForAssetCategory(this.activeAssetCategory);
        this.cryptoCatalog = null;
        this.cryptoCatalogProvider = '';
        this.cryptoCatalogError = '';
        this.cryptoCatalogLoading = false;
        this.cryptoCatalogRequestId = 0;
        this.isDialogDestroyed = false;
        this.autoFilledCryptoLabel = initialTicker.label ?? '';
        this.verifyInProgress = false;
        this.lastVerifiedSymbol = '';
        this.verificationRequestId = 0;
        this.verificationSession = new Soup.Session();
        this.suggestionRows = [];

        this._buildUi();
        this._connectSignals();
    }

    /* present() keeps the exported API small while the class owns the full GTK lifecycle. */
    present() {
        this._updateSuggestionsDescription();
        this._syncMarketSessionRow();
        if (this.activeAssetCategory === 'crypto')
            void this._ensureCryptoCatalogLoaded();
        this._renderCuratedSuggestions();
        this._updateSaveSensitivity();
        this.dialog.present();
    }

    _buildUi() {
        this.dialog = new Gtk.Dialog({transient_for: this.window, modal: true, use_header_bar: true, title: this.title});
        this.dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        this.saveButton = this.dialog.add_button('Save', Gtk.ResponseType.OK);
        this.saveButton.add_css_class('suggested-action');

        const contentArea = this.dialog.get_content_area();
        contentArea.set_margin_top(12);
        contentArea.set_margin_bottom(12);
        contentArea.set_margin_start(12);
        contentArea.set_margin_end(12);

        const content = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 12});
        contentArea.append(content);

        const formGroup = new Adw.PreferencesGroup();
        content.append(formGroup);

        this.assetCategoryRow = this.createComboRow({
            title: 'Asset type',
            options: this.assetCategoryOptions,
            selectedValue: this.activeAssetCategory,
            onSelected: () => {},
        });
        formGroup.add(this.assetCategoryRow);

        this.marketSessionModel = Gtk.StringList.new(this.marketSessionOptions.map(option => option.title));
        this.marketSessionRow = new Adw.ComboRow({title: 'Market session', model: this.marketSessionModel});
        this.marketSessionRow.selected = Math.max(0, this.marketSessionOptions.findIndex(option => option.value === this.activeMarketSessionId));
        formGroup.add(this.marketSessionRow);

        this.cryptoProviderRow = this.createComboRow({
            title: 'Crypto API',
            subtitle: 'Kraken supports spot pairs. Hyperliquid supports spot symbols and perps.',
            options: this.cryptoProviderOptions,
            selectedValue: this.activeCryptoProvider || getDefaultCryptoProvider(),
            onSelected: () => {},
        });
        this.cryptoProviderRow.visible = this.activeAssetCategory === 'crypto';
        formGroup.add(this.cryptoProviderRow);

        this.labelRow = new Adw.EntryRow({title: 'Label', text: this.initialTicker.label ?? ''});
        formGroup.add(this.labelRow);

        this.symbolRow = new Adw.EntryRow({
            title: 'Symbol',
            text: this.activeAssetCategory === 'crypto'
                ? (this.initialTicker.liveSymbol ?? this.initialTicker.symbol ?? '')
                : (this.initialTicker.symbol ?? ''),
        });
        formGroup.add(this.symbolRow);

        this.verifyButton = this.createTextButton('Verify', () => {
            void this._runSymbolVerification();
        });
        this.symbolRow.add_suffix(this.verifyButton);

        const decimalsAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 6,
            step_increment: 1,
            page_increment: 1,
            value: this.initialTicker.priceDecimals ?? 2,
        });
        this.decimalsRow = new Adw.SpinRow({title: 'Decimals', adjustment: decimalsAdjustment});
        formGroup.add(this.decimalsRow);

        this.sideOptions = [
            {value: LEFT_PANEL_SIDE, title: 'Left'},
            {value: RIGHT_PANEL_SIDE, title: 'Right'},
        ];
        this.sideRow = this.createComboRow({
            title: 'Panel side',
            options: this.sideOptions,
            selectedValue: this.initialTicker.panelSide ?? RIGHT_PANEL_SIDE,
            onSelected: () => {},
        });
        formGroup.add(this.sideRow);

        this.suggestionsGroup = new Adw.PreferencesGroup({
            title: 'Catalog matches',
            description: 'Type a label or symbol above to search the built-in catalog. You can still save any custom Stooq symbol.',
        });
        content.append(this.suggestionsGroup);

        this.errorLabel = new Gtk.Label({halign: Gtk.Align.START, wrap: true, visible: false});
        this.errorLabel.add_css_class('error');
        content.append(this.errorLabel);

        this.verificationLabel = new Gtk.Label({halign: Gtk.Align.START, wrap: true, visible: false});
        this.verificationLabel.add_css_class('dim-label');
        content.append(this.verificationLabel);
    }

    /* All widget signals feed into instance methods so state transitions stay grouped by responsibility. */
    _connectSignals() {
        this.assetCategoryRow.connect('notify::selected', widget => {
            const option = this.assetCategoryOptions[widget.selected];
            if (!option)
                return;

            this.activeAssetCategory = option.value;
            this.activeMarketSessionId = getMarketSessionForAssetCategory(this.activeAssetCategory);
            this.activeCryptoProvider = this.activeAssetCategory === 'crypto'
                ? (this.activeCryptoProvider || getDefaultCryptoProvider())
                : '';
            this._resetCryptoCatalogState();
            this._clearVerificationState();
            this._syncMarketSessionRow();
            this.cryptoProviderRow.visible = this.activeAssetCategory === 'crypto';
            if (this.activeAssetCategory === 'crypto')
                this.cryptoProviderRow.selected = this.findOptionIndex(this.cryptoProviderOptions, this.activeCryptoProvider);
            this._updateSuggestionsDescription();
            if (this.activeAssetCategory === 'crypto')
                void this._ensureCryptoCatalogLoaded();
            this._renderCuratedSuggestions();
            this._updateSaveSensitivity();
        });

        this.marketSessionRow.connect('notify::selected', widget => {
            const option = this.marketSessionOptions[widget.selected];
            if (!option)
                return;

            this.activeMarketSessionId = option.value;
        });

        this.cryptoProviderRow.connect('notify::selected', widget => {
            const option = this.cryptoProviderOptions[widget.selected];
            if (!option)
                return;

            this.activeCryptoProvider = option.value;
            this._resetCryptoCatalogState();
            this._clearVerificationState();
            this._updateSuggestionsDescription();
            if (this.activeAssetCategory === 'crypto')
                void this._ensureCryptoCatalogLoaded();
            this._renderCuratedSuggestions();
            this._updateSaveSensitivity();
        });

        this.labelRow.connect('notify::text', () => {
            this._renderCuratedSuggestions();
            this._updateSaveSensitivity();
        });

        this.symbolRow.connect('notify::text', () => {
            const normalizedSymbolText = this.activeAssetCategory === 'crypto'
                ? this.symbolRow.text.trim()
                : this.symbolRow.text.trim().toLowerCase();

            if (this.lastVerifiedSymbol !== '' && normalizedSymbolText !== this.lastVerifiedSymbol)
                this._clearVerificationState();

            if (this.activeAssetCategory === 'crypto') {
                const resolvedCryptoTicker = this._getResolvedCryptoTicker();
                if (this.labelRow.text.trim() === '' || this.labelRow.text.trim() === this.autoFilledCryptoLabel) {
                    if (resolvedCryptoTicker) {
                        this.autoFilledCryptoLabel = resolvedCryptoTicker.label;
                        this.labelRow.text = resolvedCryptoTicker.label;
                        this.decimalsRow.value = resolvedCryptoTicker.priceDecimals;
                    }
                }
            }

            this._renderCuratedSuggestions();
            this._updateSaveSensitivity();
        });

        this.dialog.connect('destroy', () => {
            this.isDialogDestroyed = true;
            this.verificationRequestId += 1;
            this.verificationSession.abort();
        });

        this.dialog.connect('response', (_dialog, responseId) => {
            if (responseId === Gtk.ResponseType.OK)
                this.onSave(this._buildNextTicker());

            this.dialog.destroy();
        });
    }

    /* Choosing a suggestion updates both the visible form fields and the controller's hidden runtime state. */
    _applyCuratedTicker(curatedTicker) {
        this.labelRow.text = curatedTicker.label;
        this.symbolRow.text = curatedTicker.assetCategory === 'crypto'
            ? (curatedTicker.liveSymbol ?? curatedTicker.symbol)
            : curatedTicker.symbol;
        this.decimalsRow.value = curatedTicker.priceDecimals;
        this.activeAssetCategory = curatedTicker.assetCategory;
        this.activeMarketSessionId = curatedTicker.marketSessionId ?? getMarketSessionForAssetCategory(curatedTicker.assetCategory);
        this.activeCryptoProvider = curatedTicker.assetCategory === 'crypto'
            ? (curatedTicker.cryptoProvider ?? getDefaultCryptoProvider())
            : '';
        this.assetCategoryRow.selected = this.findOptionIndex(this.assetCategoryOptions, curatedTicker.assetCategory);
        this.cryptoProviderRow.selected = this.findOptionIndex(this.cryptoProviderOptions, this.activeCryptoProvider);
        this._syncMarketSessionRow();
        this.cryptoProviderRow.visible = this.activeAssetCategory === 'crypto';
        if (this.activeAssetCategory === 'crypto')
            this.autoFilledCryptoLabel = curatedTicker.label;
        this._updateSaveSensitivity();
    }

    /* Market-session selection stays editable for manual non-crypto tickers and follows the current asset type. */
    _syncMarketSessionRow() {
        this.marketSessionOptions = getMarketSessionOptionsForAssetCategory(this.activeAssetCategory);
        this.marketSessionModel.splice(0, this.marketSessionModel.get_n_items(), this.marketSessionOptions.map(option => option.title));
        this.marketSessionRow.selected = Math.max(0, this.marketSessionOptions.findIndex(option => option.value === this.activeMarketSessionId));
    }

    /* Verification status is funneled through one helper so async branches update the UI consistently. */
    _setVerificationMessage(message, isError = false) {
        this.verificationLabel.visible = message !== '';
        this.verificationLabel.label = message;

        if (isError)
            this.verificationLabel.add_css_class('error');
        else
            this.verificationLabel.remove_css_class('error');
    }

    /* Any edit that invalidates the previous verification result resets the dialog's verification state here. */
    _clearVerificationState() {
        this.lastVerifiedSymbol = '';
        this._setVerificationMessage('');
    }

    /* Suggestion rows are recreated from scratch on each state change, so row teardown is centralized here. */
    _clearSuggestionRows() {
        this.suggestionRows.splice(0).forEach(row => this.suggestionsGroup.remove(row));
    }

    /* Provider or asset-type changes invalidate the previously loaded crypto catalog through this reset helper. */
    _resetCryptoCatalogState() {
        this.cryptoCatalog = null;
        this.cryptoCatalogProvider = '';
        this.cryptoCatalogError = '';
        this.cryptoCatalogLoading = false;
        this.cryptoCatalogRequestId += 1;
    }

    /* The suggestions group description follows current asset/provider mode so the dialog explains the active search source. */
    _updateSuggestionsDescription() {
        this.suggestionsGroup.description = getSuggestionsDescription(this.activeAssetCategory, this.activeCryptoProvider);
    }

    /* Save/verify logic asks this resolver for the currently selected or confidently inferred crypto market. */
    _getResolvedCryptoTicker() {
        return resolveSelectedCryptoTicker({
            assetCategory: this.activeAssetCategory,
            cryptoCatalog: this.cryptoCatalog,
            cryptoProvider: this.activeCryptoProvider,
            labelText: this.labelRow.text,
            symbolText: this.symbolRow.text,
        });
    }

    /*
     * The dialog loads crypto catalogs lazily because provider-backed market
     * lists are runtime data, not static prefs metadata. Request ids guard
     * against stale async responses after provider changes or dialog teardown.
     */
    async _ensureCryptoCatalogLoaded() {
        if (this.activeAssetCategory !== 'crypto' || this.cryptoCatalogLoading)
            return;

        if (Array.isArray(this.cryptoCatalog) && this.cryptoCatalogProvider === this.activeCryptoProvider)
            return;

        this.cryptoCatalogLoading = true;
        this.cryptoCatalogError = '';
        this._renderCuratedSuggestions();
        this._updateSaveSensitivity();

        const requestedCryptoProvider = this.activeCryptoProvider;
        this.cryptoCatalogRequestId += 1;
        const requestId = this.cryptoCatalogRequestId;

        try {
            const loadedCryptoCatalog = await loadCryptoCatalog(requestedCryptoProvider);
            if (this._isStaleCryptoCatalogResponse(requestId, requestedCryptoProvider))
                return;

            this.cryptoCatalog = loadedCryptoCatalog;
            this.cryptoCatalogProvider = requestedCryptoProvider;
            this.cryptoCatalogError = '';
        } catch (error) {
            if (this._isStaleCryptoCatalogResponse(requestId, requestedCryptoProvider))
                return;

            this.cryptoCatalog = null;
            this.cryptoCatalogProvider = '';
            this.cryptoCatalogError = error.message;
        } finally {
            if (this._isStaleCryptoCatalogResponse(requestId, requestedCryptoProvider))
                return;

            this.cryptoCatalogLoading = false;
            this._renderCuratedSuggestions();
            this._updateSaveSensitivity();
        }
    }

    /* Async catalog responses are discarded when the dialog was destroyed or the provider changed mid-flight. */
    _isStaleCryptoCatalogResponse(requestId, requestedCryptoProvider) {
        return this.isDialogDestroyed ||
            requestId !== this.cryptoCatalogRequestId ||
            this.activeCryptoProvider !== requestedCryptoProvider;
    }

    /* Suggestion rendering is the UI projection of the pure catalog-suggestion models. */
    _renderCuratedSuggestions() {
        this._clearSuggestionRows();
        buildCatalogSuggestionRows({
            assetCategory: this.activeAssetCategory,
            cryptoProvider: this.activeCryptoProvider,
            cryptoCatalog: this.cryptoCatalog,
            cryptoCatalogLoading: this.cryptoCatalogLoading,
            cryptoCatalogError: this.cryptoCatalogError,
            labelText: this.labelRow.text,
            symbolText: this.symbolRow.text,
            maxSuggestions: MAX_CURATED_SUGGESTIONS,
        }).forEach(rowModel => {
            const row = new Adw.ActionRow({title: rowModel.title, subtitle: rowModel.subtitle, sensitive: rowModel.kind === 'match'});

            if (rowModel.kind === 'match') {
                row.add_suffix(this.createTextButton('Use', () => {
                    this._applyCuratedTicker(rowModel.curatedTicker);
                }));
            }

            this.suggestionsGroup.add(row);
            this.suggestionRows.push(row);
        });
    }

    /* Verify availability follows dialog validity/loading state so users only trigger meaningful checks. */
    _updateVerifyButtonSensitivity() {
        this.verifyButton.set_sensitive(
            this.symbolRow.text.trim() !== '' &&
            !this.verifyInProgress &&
            !(this.activeAssetCategory === 'crypto' && this.cryptoCatalogLoading)
        );
    }

    /*
     * Verification bridges dialog state to provider checks: crypto validates
     * against the loaded runtime catalog, while non-crypto symbols round-trip
     * through Stooq.
     */
    async _runSymbolVerification() {
        if (this.activeAssetCategory === 'crypto') {
            await this._ensureCryptoCatalogLoaded();

            if (this.cryptoCatalogLoading)
                return;

            if (this.cryptoCatalogError !== '') {
                this._setVerificationMessage(this.cryptoCatalogError, true);
                this._updateVerifyButtonSensitivity();
                return;
            }

            const resolvedCryptoTicker = this._getResolvedCryptoTicker();
            if (!resolvedCryptoTicker) {
                this._setVerificationMessage(getCryptoVerificationFailureMessage(this.activeCryptoProvider), true);
                this._updateVerifyButtonSensitivity();
                return;
            }

            this.lastVerifiedSymbol = resolvedCryptoTicker.liveSymbol;
            this._setVerificationMessage(getCryptoVerificationSuccessMessage(
                this.activeCryptoProvider,
                resolvedCryptoTicker.liveSymbol
            ));
            this._updateVerifyButtonSensitivity();
            return;
        }

        const symbol = this.symbolRow.text.trim().toLowerCase();
        const symbolValidationMessage = validateTickerSymbol(symbol);

        if (symbolValidationMessage !== '') {
            this._setVerificationMessage(symbolValidationMessage, true);
            this._updateVerifyButtonSensitivity();
            return;
        }

        this.verificationRequestId += 1;
        const requestId = this.verificationRequestId;
        this.verifyInProgress = true;
        this._updateVerifyButtonSensitivity();
        this._setVerificationMessage(`Checking ${symbol} on Stooq...`);

        try {
            const result = await verifyTickerSymbol(this.verificationSession, symbol);
            if (requestId !== this.verificationRequestId)
                return;

            this.lastVerifiedSymbol = symbol;
            this._setVerificationMessage(
                `Verified ${result.symbol}. Stooq returned quote data dated ${result.quoteDate}.`
            );
        } catch (error) {
            if (requestId !== this.verificationRequestId)
                return;

            this.lastVerifiedSymbol = '';
            this._setVerificationMessage(error.message, true);
        } finally {
            if (requestId === this.verificationRequestId) {
                this.verifyInProgress = false;
                this._updateVerifyButtonSensitivity();
            }
        }
    }

    /* Save sensitivity mirrors the pure dialog-state validation rules into the live GTK button and error UI. */
    _updateSaveSensitivity() {
        const hasCryptoCatalogMatches = this.activeAssetCategory === 'crypto' &&
            getCatalogMatches(
                this.activeAssetCategory,
                getCryptoSearchQuery(this.labelRow.text, this.symbolRow.text),
                this.cryptoCatalog,
                this.activeCryptoProvider
            ).length > 0;
        const validationMessage = validateTickerDraft(this.labelRow.text, this.symbolRow.text, {
            assetCategory: this.activeAssetCategory,
            cryptoProvider: this.activeCryptoProvider,
            cryptoCatalogLoading: this.cryptoCatalogLoading,
            cryptoCatalogError: this.cryptoCatalogError,
            resolvedCryptoTicker: this._getResolvedCryptoTicker(),
            hasCryptoCatalogMatches,
        });
        const isValid = validationMessage === '';
        this.saveButton.set_sensitive(isValid);
        this.errorLabel.visible = !isValid;
        this.errorLabel.label = validationMessage;
        this._updateVerifyButtonSensitivity();
    }

    /* Saving reuses the shared ticker-config builder so prefs UI state stays aligned with runtime normalization policy. */
    _buildNextTicker() {
        return buildTickerConfig({
            initialTicker: this.initialTicker,
            labelText: this.labelRow.text,
            symbolText: this.symbolRow.text,
            priceDecimals: this.decimalsRow.value,
            panelSide: this.sideOptions[this.sideRow.selected].value,
            assetCategory: this.activeAssetCategory,
            marketSessionId: this.activeMarketSessionId,
            cryptoProvider: this.activeCryptoProvider,
            resolvedCryptoTicker: this._getResolvedCryptoTicker(),
            cryptoCatalog: this.cryptoCatalog,
        });
    }
}

/* presentTickerDialog() keeps prefs.js decoupled from the controller's internal class shape. */
export function presentTickerDialog(options) {
    new TickerDialogController(options).present();
}
