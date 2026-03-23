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
    getMarketTypeForAssetCategory,
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
 * presentTickerDialog() is the controller entrypoint that turns page-level
 * callbacks and option catalogs into one self-contained GTK dialog flow.
 */
export function presentTickerDialog({
    window,
    title,
    initialTicker,
    onSave,
    assetCategoryOptions,
    cryptoProviderOptions,
    createComboRow,
    createTextButton,
    findOptionIndex,
    getMarketTypeTitle,
}) {
    const dialog = new Gtk.Dialog({transient_for: window, modal: true, use_header_bar: true, title});
    dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
    const saveButton = dialog.add_button('Save', Gtk.ResponseType.OK);
    saveButton.add_css_class('suggested-action');

    const contentArea = dialog.get_content_area();
    contentArea.set_margin_top(12);
    contentArea.set_margin_bottom(12);
    contentArea.set_margin_start(12);
    contentArea.set_margin_end(12);

    const content = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 12});
    contentArea.append(content);

    const formGroup = new Adw.PreferencesGroup();
    content.append(formGroup);

    let activeAssetCategory = initialTicker.assetCategory ?? assetCategoryOptions[0].value;
    let activeMarketType = getMarketTypeForAssetCategory(activeAssetCategory);
    let activeCryptoProvider = activeAssetCategory === 'crypto'
        ? (initialTicker.cryptoProvider ?? getDefaultCryptoProvider())
        : '';
    let cryptoCatalog = null;
    let cryptoCatalogProvider = '';
    let cryptoCatalogError = '';
    let cryptoCatalogLoading = false;
    let cryptoCatalogRequestId = 0;
    let isDialogDestroyed = false;
    let autoFilledCryptoLabel = initialTicker.label ?? '';
    let verifyInProgress = false;
    let lastVerifiedSymbol = '';
    let verificationRequestId = 0;

    const assetCategoryRow = createComboRow({title: 'Asset type', options: assetCategoryOptions, selectedValue: activeAssetCategory, onSelected: () => {}});
    formGroup.add(assetCategoryRow);

    const marketTypeRow = new Adw.ActionRow({title: 'Market session', subtitle: getMarketTypeTitle(activeMarketType)});
    formGroup.add(marketTypeRow);

    const cryptoProviderRow = createComboRow({
        title: 'Crypto API',
        subtitle: 'Kraken supports spot pairs. Hyperliquid supports spot symbols and perps.',
        options: cryptoProviderOptions,
        selectedValue: activeCryptoProvider || getDefaultCryptoProvider(),
        onSelected: () => {},
    });
    cryptoProviderRow.visible = activeAssetCategory === 'crypto';
    formGroup.add(cryptoProviderRow);

    const labelRow = new Adw.EntryRow({title: 'Label', text: initialTicker.label ?? ''});
    formGroup.add(labelRow);

    const symbolRow = new Adw.EntryRow({
        title: 'Symbol',
        text: activeAssetCategory === 'crypto'
            ? (initialTicker.liveSymbol ?? initialTicker.symbol ?? '')
            : (initialTicker.symbol ?? ''),
    });
    formGroup.add(symbolRow);

    const verifyButton = createTextButton('Verify', () => {
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
    const decimalsRow = new Adw.SpinRow({title: 'Decimals', adjustment: decimalsAdjustment});
    formGroup.add(decimalsRow);

    const sideOptions = [
        {value: LEFT_PANEL_SIDE, title: 'Left'},
        {value: RIGHT_PANEL_SIDE, title: 'Right'},
    ];
    const sideRow = createComboRow({title: 'Panel side', options: sideOptions, selectedValue: initialTicker.panelSide ?? RIGHT_PANEL_SIDE, onSelected: () => {}});
    formGroup.add(sideRow);

    const suggestionsGroup = new Adw.PreferencesGroup({title: 'Catalog matches', description: 'Type a label or symbol above to search the built-in catalog. You can still save any custom Stooq symbol.'});
    content.append(suggestionsGroup);

    const errorLabel = new Gtk.Label({halign: Gtk.Align.START, wrap: true, visible: false});
    errorLabel.add_css_class('error');
    content.append(errorLabel);

    const verificationLabel = new Gtk.Label({halign: Gtk.Align.START, wrap: true, visible: false});
    verificationLabel.add_css_class('dim-label');
    content.append(verificationLabel);

    const verificationSession = new Soup.Session();
    const suggestionRows = [];

    /*
     * Choosing a curated suggestion is the bridge from search UX back into the
     * underlying ticker configuration model. It updates both visible form fields
     * and the hidden dialog state that later drives validation and save behavior.
     */
    const applyCuratedTicker = curatedTicker => {
        labelRow.text = curatedTicker.label;
        symbolRow.text = curatedTicker.assetCategory === 'crypto'
            ? (curatedTicker.liveSymbol ?? curatedTicker.symbol)
            : curatedTicker.symbol;
        decimalsRow.value = curatedTicker.priceDecimals;
        activeAssetCategory = curatedTicker.assetCategory;
        activeMarketType = curatedTicker.marketType;
        activeCryptoProvider = curatedTicker.assetCategory === 'crypto'
            ? (curatedTicker.cryptoProvider ?? getDefaultCryptoProvider())
            : '';
        assetCategoryRow.selected = findOptionIndex(assetCategoryOptions, curatedTicker.assetCategory);
        cryptoProviderRow.selected = findOptionIndex(cryptoProviderOptions, activeCryptoProvider);
        marketTypeRow.subtitle = getMarketTypeTitle(activeMarketType);
        cryptoProviderRow.visible = activeAssetCategory === 'crypto';
        if (activeAssetCategory === 'crypto')
            autoFilledCryptoLabel = curatedTicker.label;
        updateSaveSensitivity();
    };

    /* Verification status is funneled through one label helper so async branches update the UI consistently. */
    const setVerificationMessage = (message, isError = false) => {
        verificationLabel.visible = message !== '';
        verificationLabel.label = message;

        if (isError)
            verificationLabel.add_css_class('error');
        else
            verificationLabel.remove_css_class('error');
    };

    /* Any edit that invalidates the previous verification result resets the dialog's verification state here. */
    const clearVerificationState = () => {
        lastVerifiedSymbol = '';
        setVerificationMessage('');
    };

    /* Suggestion rows are recreated from scratch on each state change, so row teardown is centralized here. */
    const clearSuggestionRows = () => {
        suggestionRows.splice(0).forEach(row => suggestionsGroup.remove(row));
    };

    /* Provider or asset-type changes invalidate the previously loaded crypto catalog through this reset helper. */
    const resetCryptoCatalogState = () => {
        cryptoCatalog = null;
        cryptoCatalogProvider = '';
        cryptoCatalogError = '';
        cryptoCatalogLoading = false;
        cryptoCatalogRequestId += 1;
    };

    /* The suggestions group description follows current asset/provider mode so the dialog explains the active search source. */
    const updateSuggestionsDescription = () => {
        suggestionsGroup.description = getSuggestionsDescription(activeAssetCategory, activeCryptoProvider);
    };

    /* Save/verify logic asks this resolver for the currently selected or confidently inferred crypto market. */
    const getResolvedCryptoTicker = () => resolveSelectedCryptoTicker({
        assetCategory: activeAssetCategory,
        cryptoCatalog,
        cryptoProvider: activeCryptoProvider,
        labelText: labelRow.text,
        symbolText: symbolRow.text,
    });

    /*
     * The dialog loads crypto catalogs lazily because provider-backed market
     * lists are runtime data, not static prefs metadata. Request ids guard
     * against stale async responses after provider changes or dialog teardown.
     */
    const ensureCryptoCatalogLoaded = async () => {
        if (activeAssetCategory !== 'crypto' || cryptoCatalogLoading)
            return;

        if (Array.isArray(cryptoCatalog) && cryptoCatalogProvider === activeCryptoProvider)
            return;

        cryptoCatalogLoading = true;
        cryptoCatalogError = '';
        renderCuratedSuggestions();
        updateSaveSensitivity();

        const requestedCryptoProvider = activeCryptoProvider;
        cryptoCatalogRequestId += 1;
        const requestId = cryptoCatalogRequestId;

        try {
            const loadedCryptoCatalog = await loadCryptoCatalog(requestedCryptoProvider);
            if (
                isDialogDestroyed ||
                requestId !== cryptoCatalogRequestId ||
                activeCryptoProvider !== requestedCryptoProvider
            ) {
                return;
            }

            cryptoCatalog = loadedCryptoCatalog;
            cryptoCatalogProvider = requestedCryptoProvider;
            cryptoCatalogError = '';
        } catch (error) {
            if (
                isDialogDestroyed ||
                requestId !== cryptoCatalogRequestId ||
                activeCryptoProvider !== requestedCryptoProvider
            ) {
                return;
            }

            cryptoCatalog = null;
            cryptoCatalogProvider = '';
            cryptoCatalogError = error.message;
        } finally {
            if (
                isDialogDestroyed ||
                requestId !== cryptoCatalogRequestId ||
                activeCryptoProvider !== requestedCryptoProvider
            ) {
                return;
            }

            cryptoCatalogLoading = false;
            renderCuratedSuggestions();
            updateSaveSensitivity();
        }
    };

    /*
     * Suggestion rendering is the UI projection of the pure catalog-suggestion
     * models. The controller only turns those row models into GTK rows/actions.
     */
    const renderCuratedSuggestions = () => {
        clearSuggestionRows();
        buildCatalogSuggestionRows({
            assetCategory: activeAssetCategory,
            cryptoProvider: activeCryptoProvider,
            cryptoCatalog,
            cryptoCatalogLoading,
            cryptoCatalogError,
            labelText: labelRow.text,
            symbolText: symbolRow.text,
            maxSuggestions: MAX_CURATED_SUGGESTIONS,
        }).forEach(rowModel => {
            const row = new Adw.ActionRow({title: rowModel.title, subtitle: rowModel.subtitle, sensitive: rowModel.kind === 'match'});

            if (rowModel.kind === 'match') {
                row.add_suffix(createTextButton('Use', () => {
                    applyCuratedTicker(rowModel.curatedTicker);
                }));
            }

            suggestionsGroup.add(row);
            suggestionRows.push(row);
        });
    };

    /* Verify availability follows dialog validity/loading state so users only trigger meaningful checks. */
    const updateVerifyButtonSensitivity = () => {
        verifyButton.set_sensitive(
            symbolRow.text.trim() !== '' &&
            !verifyInProgress &&
            !(activeAssetCategory === 'crypto' && cryptoCatalogLoading)
        );
    };

    /*
     * Verification bridges dialog state to provider checks: crypto validates
     * against the loaded runtime catalog, while non-crypto symbols round-trip
     * through Stooq.
     */
    const runSymbolVerification = async () => {
        if (activeAssetCategory === 'crypto') {
            await ensureCryptoCatalogLoaded();

            if (cryptoCatalogLoading)
                return;

            if (cryptoCatalogError !== '') {
                setVerificationMessage(cryptoCatalogError, true);
                updateVerifyButtonSensitivity();
                return;
            }

            const resolvedCryptoTicker = getResolvedCryptoTicker();
            if (!resolvedCryptoTicker) {
                setVerificationMessage(getCryptoVerificationFailureMessage(activeCryptoProvider), true);
                updateVerifyButtonSensitivity();
                return;
            }

            lastVerifiedSymbol = resolvedCryptoTicker.liveSymbol;
            setVerificationMessage(getCryptoVerificationSuccessMessage(
                activeCryptoProvider,
                resolvedCryptoTicker.liveSymbol
            ));
            updateVerifyButtonSensitivity();
            return;
        }

        const symbol = symbolRow.text.trim().toLowerCase();
        const symbolValidationMessage = validateTickerSymbol(symbol);

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
            const result = await verifyTickerSymbol(verificationSession, symbol);
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

    /* Save sensitivity mirrors the pure dialog-state validation rules into the live GTK button/error UI. */
    const updateSaveSensitivity = () => {
        const hasCryptoCatalogMatches = activeAssetCategory === 'crypto' &&
            getCatalogMatches(
                activeAssetCategory,
                getCryptoSearchQuery(labelRow.text, symbolRow.text),
                cryptoCatalog,
                activeCryptoProvider
            ).length > 0;
        const validationMessage = validateTickerDraft(labelRow.text, symbolRow.text, {
            assetCategory: activeAssetCategory,
            cryptoProvider: activeCryptoProvider,
            cryptoCatalogLoading,
            cryptoCatalogError,
            resolvedCryptoTicker: getResolvedCryptoTicker(),
            hasCryptoCatalogMatches,
        });
        const isValid = validationMessage === '';
        saveButton.set_sensitive(isValid);
        errorLabel.visible = !isValid;
        errorLabel.label = validationMessage;
        updateVerifyButtonSensitivity();
    };

    assetCategoryRow.connect('notify::selected', widget => {
        const option = assetCategoryOptions[widget.selected];
        if (!option)
            return;

        activeAssetCategory = option.value;
        activeMarketType = getMarketTypeForAssetCategory(activeAssetCategory);
        activeCryptoProvider = activeAssetCategory === 'crypto'
            ? (activeCryptoProvider || getDefaultCryptoProvider())
            : '';
        resetCryptoCatalogState();
        clearVerificationState();
        marketTypeRow.subtitle = getMarketTypeTitle(activeMarketType);
        cryptoProviderRow.visible = activeAssetCategory === 'crypto';
        if (activeAssetCategory === 'crypto')
            cryptoProviderRow.selected = findOptionIndex(cryptoProviderOptions, activeCryptoProvider);
        updateSuggestionsDescription();
        if (activeAssetCategory === 'crypto')
            void ensureCryptoCatalogLoaded();
        renderCuratedSuggestions();
        updateSaveSensitivity();
    });

    cryptoProviderRow.connect('notify::selected', widget => {
        const option = cryptoProviderOptions[widget.selected];
        if (!option)
            return;

        activeCryptoProvider = option.value;
        resetCryptoCatalogState();
        clearVerificationState();
        updateSuggestionsDescription();
        if (activeAssetCategory === 'crypto')
            void ensureCryptoCatalogLoaded();
        renderCuratedSuggestions();
        updateSaveSensitivity();
    });

    labelRow.connect('notify::text', () => {
        renderCuratedSuggestions();
        updateSaveSensitivity();
    });

    symbolRow.connect('notify::text', () => {
        const normalizedSymbolText = activeAssetCategory === 'crypto'
            ? symbolRow.text.trim()
            : symbolRow.text.trim().toLowerCase();

        if (lastVerifiedSymbol !== '' && normalizedSymbolText !== lastVerifiedSymbol)
            clearVerificationState();

        if (activeAssetCategory === 'crypto') {
            const resolvedCryptoTicker = getResolvedCryptoTicker();
            if (labelRow.text.trim() === '' || labelRow.text.trim() === autoFilledCryptoLabel) {
                if (resolvedCryptoTicker) {
                    autoFilledCryptoLabel = resolvedCryptoTicker.label;
                    labelRow.text = resolvedCryptoTicker.label;
                    decimalsRow.value = resolvedCryptoTicker.priceDecimals;
                }
            }
        }

        renderCuratedSuggestions();
        updateSaveSensitivity();
    });

    updateSuggestionsDescription();
    if (activeAssetCategory === 'crypto')
        void ensureCryptoCatalogLoaded();
    renderCuratedSuggestions();
    updateSaveSensitivity();

    dialog.connect('destroy', () => {
        isDialogDestroyed = true;
        verificationRequestId += 1;
        verificationSession.abort();
    });

    dialog.connect('response', (_dialog, responseId) => {
        if (responseId === Gtk.ResponseType.OK) {
            const resolvedCryptoTicker = getResolvedCryptoTicker();
            const nextTicker = buildTickerConfig({
                initialTicker,
                labelText: labelRow.text,
                symbolText: symbolRow.text,
                priceDecimals: decimalsRow.value,
                panelSide: sideOptions[sideRow.selected].value,
                assetCategory: activeAssetCategory,
                cryptoProvider: activeCryptoProvider,
                resolvedCryptoTicker,
                cryptoCatalog,
            });
            onSave(nextTicker);
        }

        dialog.destroy();
    });

    dialog.present();
}
