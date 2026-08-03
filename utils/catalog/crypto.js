import {ASSET_CATEGORIES, CRYPTO_PROVIDERS} from '../asset-categories.js';
import {MARKET_SESSION_IDS} from '../market-sessions.js';

/* Static crypto entries provide a minimal curated seed; broader crypto discovery comes from live providers at runtime. */
export const CRYPTO_TICKERS = [
    {
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        label: 'BTC',
        symbol: 'btcusd',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        liveSymbol: 'BTC/USD',
        keywords: ['bitcoin', 'xbt'],
    },
    {
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
        label: 'ETH',
        symbol: 'ethusd',
        priceDecimals: 0,
        marketSessionId: MARKET_SESSION_IDS.ALWAYS_OPEN,
        liveSymbol: 'ETH/USD',
        keywords: ['ethereum', 'ether'],
    },
];
