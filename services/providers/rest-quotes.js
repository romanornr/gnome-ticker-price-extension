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
    const nasdaqTickers = missingTickers.filter(isNasdaqFallbackTicker);
    const fxTickers = missingTickers.filter(ticker => parseFxPairSymbol(ticker?.symbol) !== null);

    /* The two fallbacks hit unrelated hosts, so a slow one must not delay the other. */
    const recoveredCounts = await Promise.all([
        nasdaqTickers.length > 0
            ? mergeFallbackQuotes('Nasdaq', () => refreshNasdaqQuotes(nasdaqTickers, context), quotesBySymbol)
            : 0,
        fxTickers.length > 0
            ? mergeFallbackQuotes('FX rate table', () => refreshFallbackFxQuotes(fxTickers, context), quotesBySymbol)
            : 0,
    ]);

    return recoveredCounts.reduce((total, count) => total + count, 0);
}

async function mergeFallbackQuotes(fallbackName, refreshFallback, quotesBySymbol) {
    try {
        const fallbackQuotes = await refreshFallback();
        fallbackQuotes.forEach((quote, storeKey) => quotesBySymbol.set(storeKey, quote));
        return fallbackQuotes.size;
    } catch (error) {
        logRestError(error, `${fallbackName} fallback refresh failed`);
        return 0;
    }
}

/* Tests run outside GNOME Shell's logging globals, so logging stays optional at the provider boundary. */
function logRestWarning(message) {
    if (typeof log === 'function')
        log(`Ticker Price Extension: ${message}`);
}

/* Swallowed fallback failures never reach QuotesService, so the stack trace has to be logged here or it is lost. */
function logRestError(error, message) {
    if (typeof logError === 'function')
        logError(error, `Ticker Price Extension: ${message}`);
    else
        logRestWarning(`${message}: ${error.message}`);
}
