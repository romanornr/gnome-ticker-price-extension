import {refresh as refreshCnbcQuotes} from './cnbc.js';
import {ownsFallbackTicker as isNasdaqFallbackTicker, refresh as refreshNasdaqQuotes} from './nasdaq.js';
import {refresh as refreshFallbackFxQuotes} from './open-er-api.js';
import {parseFxPairSymbol} from './cnbc-symbols.js';

/*
 * This module is the registry's REST refresh entrypoint: CNBC is the primary
 * source for every non-live symbol, and narrow fallbacks cover only what they
 * genuinely serve — Nasdaq for US listings, the daily USD rate table for FX.
 * A fully successful CNBC pass issues no fallback requests at all.
 */
export async function refresh(tickers, context) {
    let quotesBySymbol = new Map();
    let cnbcError = null;

    try {
        quotesBySymbol = await refreshCnbcQuotes(tickers, context);
    } catch (error) {
        cnbcError = error;
    }

    const missingTickers = tickers.filter(ticker => !quotesBySymbol.has(`${ticker?.symbol ?? ''}`.trim().toUpperCase()));
    if (missingTickers.length === 0) {
        if (cnbcError)
            throw cnbcError;

        return quotesBySymbol;
    }

    const recoveredCount = await runFallbacks(missingTickers, context, quotesBySymbol);
    if (recoveredCount > 0)
        logRestWarning(`CNBC missed ${missingTickers.length} symbol(s); fallbacks recovered ${recoveredCount}.`);

    if (quotesBySymbol.size === 0 && cnbcError)
        throw cnbcError;

    return quotesBySymbol;
}

/* Each fallback failure is contained so one broken fallback cannot cost the other's recoveries. */
async function runFallbacks(missingTickers, context, quotesBySymbol) {
    let recoveredCount = 0;

    const nasdaqTickers = missingTickers.filter(isNasdaqFallbackTicker);
    if (nasdaqTickers.length > 0)
        recoveredCount += await mergeFallbackQuotes('Nasdaq', () => refreshNasdaqQuotes(nasdaqTickers, context), quotesBySymbol);

    const fxTickers = missingTickers.filter(ticker => parseFxPairSymbol(ticker?.symbol) !== null);
    if (fxTickers.length > 0)
        recoveredCount += await mergeFallbackQuotes('FX rate table', () => refreshFallbackFxQuotes(fxTickers, context), quotesBySymbol);

    return recoveredCount;
}

async function mergeFallbackQuotes(fallbackName, refreshFallback, quotesBySymbol) {
    try {
        const fallbackQuotes = await refreshFallback();
        fallbackQuotes.forEach((quote, storeKey) => quotesBySymbol.set(storeKey, quote));
        return fallbackQuotes.size;
    } catch (error) {
        logRestWarning(`${fallbackName} fallback refresh failed: ${error.message}`);
        return 0;
    }
}

/* Tests run outside GNOME Shell's logging globals, so logging stays optional at the provider boundary. */
function logRestWarning(message) {
    if (typeof log === 'function')
        log(`Ticker Price Extension: ${message}`);
}
