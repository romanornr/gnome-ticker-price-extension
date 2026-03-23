import {buildEntries, clearPriceFlash} from '../services/entry-model.js';
import {QuoteStore} from '../services/quote-store.js';
import {DEFAULT_DISPLAY_SETTINGS} from '../utils/display-settings.js';
import {DEFAULT_TEXT_COLOR, POSITIVE_COLOR} from '../utils/format.js';
import {ASSET_CATEGORIES, CRYPTO_PROVIDERS, MARKET_TYPES} from '../utils/asset-categories.js';
import {assertDeepEqual, assertEqual, assertTruthy} from './support/assert.js';

export function runTests() {
    const displaySettings = {...DEFAULT_DISPLAY_SETTINGS};
    const quoteStore = new QuoteStore();
    const stooqTicker = {
        label: 'SPX',
        symbol: '^spx',
        priceDecimals: 0,
        marketType: MARKET_TYPES.US_SESSION,
        assetCategory: ASSET_CATEGORIES.EQUITY,
    };
    const liveCryptoTicker = {
        label: 'BTC',
        symbol: 'btcusd',
        priceDecimals: 0,
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        liveSymbol: 'BTC/USD',
    };

    let entries = buildEntries([stooqTicker, liveCryptoTicker], quoteStore, displaySettings);
    assertEqual(entries[0].priceText, '--', 'Missing non-live quotes should render error entries');
    assertEqual(entries[1].priceText, '...', 'Missing live crypto quotes should render loading entries');

    quoteStore.setQuote('^spx', {price: 5100, quoteDate: '20260323', previousClose: 5000});
    entries = buildEntries([stooqTicker], quoteStore, displaySettings);
    assertEqual(entries[0].priceText, '5,100', 'Known quotes should render formatted prices');
    assertEqual(entries[0].percentText, '2.0%', 'Known quotes should render percent change');

    quoteStore.setQuote('^spx', {price: 5200, quoteDate: '20260323', previousClose: 5000});
    const flashedEntries = buildEntries([stooqTicker], quoteStore, displaySettings, entries);
    assertEqual(flashedEntries[0].priceColor, POSITIVE_COLOR,
        'Price increases should flash positive color');

    const clearedEntries = clearPriceFlash(flashedEntries);
    assertEqual(clearedEntries[0].priceColor, DEFAULT_TEXT_COLOR,
        'Flash clearing should restore default text color');
    assertTruthy(clearedEntries[0].showPrice, 'Rendered entries should preserve display flags');
    assertDeepEqual(
        clearedEntries.map(entry => entry.label),
        ['SPX'],
        'Entry labels should remain stable through flash decoration'
    );
}
