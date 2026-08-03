import {verifySymbol} from '../../services/providers/cnbc.js';

/* prefs uses the same CNBC verification logic as the runtime provider instead of duplicating symbol checks. */
export async function verifyTickerSymbol(session, symbol) {
    return verifySymbol(session, symbol);
}
