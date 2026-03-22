import {verifySymbol} from '../../services/providers/stooq.js';

export async function verifyTickerSymbol(session, symbol) {
    return verifySymbol(session, symbol);
}
