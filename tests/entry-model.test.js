import {buildEntries, clearPriceFlash} from '../services/entry-model.js';
import {QuoteStore} from '../services/quote-store.js';
import {DEFAULT_DISPLAY_SETTINGS} from '../utils/display-settings.js';
import {DEFAULT_TEXT_COLOR, NEGATIVE_COLOR, POSITIVE_COLOR, STALE_TEXT_COLOR} from '../utils/format.js';
import {MARKET_SESSION_IDS} from '../utils/market-sessions.js';
import {ASSET_CATEGORIES, CRYPTO_PROVIDERS} from '../utils/asset-categories.js';
import {assertDeepEqual, assertEqual, assertFalse, assertTruthy} from './support/assert.js';

export function runTests() {
    const displaySettings = {...DEFAULT_DISPLAY_SETTINGS};
    const quoteStore = new QuoteStore();
    const restTicker = {
        label: 'SPX',
        symbol: '^spx',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.US_EQUITY_EXTENDED,
        assetCategory: ASSET_CATEGORIES.EQUITY,
    };
    const liveCryptoTicker = {
        label: 'BTC',
        symbol: 'btcusd',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        liveSymbol: 'BTC/USD',
    };

    let entries = buildEntries([restTicker, liveCryptoTicker], quoteStore, displaySettings);
    assertEqual(entries[0].priceText, '...', 'Unattempted REST quotes should render loading entries');
    assertEqual(entries[1].priceText, '...', 'Missing live crypto quotes should render loading entries');

    quoteStore.markStale([restTicker, liveCryptoTicker]);
    entries = buildEntries([restTicker, liveCryptoTicker], quoteStore, displaySettings);
    assertEqual(entries[0].priceText, '--', 'Completed REST failures should render error entries');
    assertEqual(entries[1].priceText, '--', 'Completed live-provider failures should render error entries');

    quoteStore.setQuote('^spx', {price: 5100, quoteDate: '20260323', previousClose: 5000});
    entries = buildEntries([restTicker], quoteStore, displaySettings);
    assertEqual(entries[0].priceText, '5,100', 'Known quotes should render formatted prices');
    assertEqual(entries[0].percentText, '2.0%', 'Known quotes should render percent change');
    assertEqual(entries[0].priceColor, DEFAULT_TEXT_COLOR,
        'Fresh known quotes should render price text in the default color');
    assertFalse(entries[0].priceFlash, 'Fresh known quotes should not be marked as flashing');

    quoteStore.setQuote('^spx', {price: 5200, quoteDate: '20260323', previousClose: 5000});
    const flashedEntries = buildEntries([restTicker], quoteStore, displaySettings, entries);
    assertEqual(flashedEntries[0].priceColor, POSITIVE_COLOR,
        'Price increases should flash positive color');
    assertTruthy(flashedEntries[0].priceFlash, 'Price increases should mark the entry as flashing');

    const clearedEntries = clearPriceFlash(flashedEntries);
    assertEqual(clearedEntries[0].priceColor, DEFAULT_TEXT_COLOR,
        'Flash clearing should restore default text color');
    assertFalse(clearedEntries[0].priceFlash, 'Flash clearing should reset flash state');

    quoteStore.setQuote('^spx', {price: 5100, quoteDate: '20260323', previousClose: 5000});
    const negativeFlashedEntries = buildEntries([restTicker], quoteStore, displaySettings, clearedEntries);
    assertEqual(negativeFlashedEntries[0].priceColor, NEGATIVE_COLOR,
        'Price decreases should flash negative color');

    quoteStore.markStale(['^spx']);
    const staleEntries = buildEntries([restTicker], quoteStore, displaySettings, negativeFlashedEntries);
    assertEqual(staleEntries[0].priceColor, STALE_TEXT_COLOR,
        'Stale cached quotes should render price text in the stale color');
    assertFalse(staleEntries[0].priceFlash, 'Stale cached quotes without a visible price move should not flash');

    /* A failed refresh is a failed refresh whatever the clock says, so the hour no longer changes styling. */
    const outsideRegularHoursEntries = buildEntries([restTicker], quoteStore, displaySettings, staleEntries);
    assertEqual(outsideRegularHoursEntries[0].priceColor, STALE_TEXT_COLOR,
        'A failed refresh outside regular hours should still render the stale color');
    assertEqual(outsideRegularHoursEntries[0].isStale, true,
        'A failed refresh outside regular hours should still be exposed as stale');

    const clearedStaleEntries = clearPriceFlash(staleEntries);
    assertEqual(clearedStaleEntries[0].priceColor, STALE_TEXT_COLOR,
        'Flash clearing should preserve stale quote color');

    quoteStore.markRefreshed(['^spx']);
    const refreshedEntries = buildEntries([restTicker], quoteStore, displaySettings, staleEntries);
    assertEqual(refreshedEntries[0].priceColor, DEFAULT_TEXT_COLOR,
        'Successful refresh should return stale cached quotes to the default color');

    assertTruthy(clearedEntries[0].showPrice, 'Rendered entries should preserve display flags');
    assertDeepEqual(
        clearedEntries.map(entry => entry.label),
        ['SPX'],
        'Entry labels should remain stable through flash decoration'
    );
}
