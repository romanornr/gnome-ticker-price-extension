import {verifySymbol} from '../../services/providers/stooq.js';

/* prefs uses the same Stooq verification logic as the runtime provider instead of duplicating symbol checks. */
export async function verifyTickerSymbol(session, symbol) {
    return verifySymbol(session, symbol);
}
