import {verifySymbol} from '../../services/providers/rest-quotes.js';

/*
 * prefs verification goes through the same REST chain as a runtime refresh, so
 * the dialog never rejects a symbol the panel would display. The asset category
 * travels with the symbol because provider ownership depends on it.
 */
export async function verifyTickerSymbol(session, symbol, assetCategory = null) {
    return verifySymbol(session, symbol, assetCategory);
}
