import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {ASSET_CATEGORIES, CRYPTO_PROVIDERS, MARKET_TYPES} from '../../asset-categories.js';
import {
    isHyperliquidSpotSymbol,
    normalizeHyperliquidLiveSymbol,
    normalizeHyperliquidTickerSymbol,
} from './symbols.js';

export const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info';
export const HYPERLIQUID_WEBSOCKET_URL = 'wss://api.hyperliquid.xyz/ws';

let cachedHyperliquidMarketsPromise = null;

/* prefs loads the cached runtime Hyperliquid catalog through this public entrypoint. */
export async function loadHyperliquidMarkets() {
    if (!cachedHyperliquidMarketsPromise) {
        cachedHyperliquidMarketsPromise = _fetchHyperliquidMarkets().catch(error => {
            cachedHyperliquidMarketsPromise = null;
            throw error;
        });
    }

    return cloneHyperliquidCatalogEntries(await cachedHyperliquidMarketsPromise);
}

/* prefs search and REST fallback both use the same snapshot builder so market lists stay consistent. */
export async function fetchHyperliquidMarketSnapshots(session) {
    const [perpsResponse, spotsResponse] = await Promise.all([
        postHyperliquidInfo(session, {type: 'metaAndAssetCtxs'}),
        postHyperliquidInfo(session, {type: 'spotMetaAndAssetCtxs'}),
    ]);

    return {
        perps: buildHyperliquidPerpEntries(perpsResponse),
        spots: buildHyperliquidSpotEntries(spotsResponse),
    };
}

/* All Hyperliquid REST calls use the same POST helper so transport details stay out of callers. */
export async function postHyperliquidInfo(session, body) {
    const requestSession = session ?? new Soup.Session();
    const message = Soup.Message.new('POST', HYPERLIQUID_API_URL);
    message.get_request_headers().append('Content-Type', 'application/json');
    message.set_request_body_from_bytes(
        'application/json',
        new GLib.Bytes(new TextEncoder().encode(JSON.stringify(body)))
    );

    const bytes = await new Promise((resolve, reject) => {
        requestSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (_session, result) => {
                try {
                    resolve(requestSession.send_and_read_finish(result));
                } catch (error) {
                    reject(error);
                }
            });
    });
    return JSON.parse(new TextDecoder().decode(bytes.get_data()));
}

/* Cached market lists are cloned before returning so callers cannot mutate shared provider state. */
function cloneHyperliquidCatalogEntries(entries) {
    return entries.map(entry => ({
        ...entry,
        keywords: [...(entry.keywords ?? [])],
    }));
}

/* The runtime crypto catalog is assembled once from both perp and spot discovery endpoints. */
async function _fetchHyperliquidMarkets() {
    const session = new Soup.Session();

    try {
        const snapshots = await fetchHyperliquidMarketSnapshots(session);
        return [
            ...snapshots.perps,
            ...snapshots.spots,
        ].sort((left, right) => left.label.localeCompare(right.label));
    } finally {
        session.abort();
    }
}

/* Perp snapshot parsing translates the API response into catalog-friendly entries. */
function buildHyperliquidPerpEntries(response) {
    const [meta, ctxs] = Array.isArray(response) ? response : [];
    const universe = Array.isArray(meta?.universe) ? meta.universe : [];
    const contexts = Array.isArray(ctxs) ? ctxs : [];

    return universe
        .map((market, index) => createHyperliquidPerpCatalogEntry(market, contexts[index]))
        .filter(entry => entry !== null);
}

/* Spot snapshot parsing does the same normalization for canonical spot markets. */
function buildHyperliquidSpotEntries(response) {
    const [meta, ctxs] = Array.isArray(response) ? response : [];
    const universe = Array.isArray(meta?.universe) ? meta.universe : [];
    const contexts = Array.isArray(ctxs) ? ctxs : [];

    return universe
        .map((market, index) => createHyperliquidSpotCatalogEntry(market, contexts[index]))
        .filter(entry => entry !== null);
}

/* Perp catalog entries add provider metadata and search keywords around one Hyperliquid market. */
function createHyperliquidPerpCatalogEntry(market, ctx) {
    const liveSymbol = normalizeHyperliquidLiveSymbol(market?.name);
    if (liveSymbol === '' || market?.isDelisted === true) return null;

    return {
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID,
        label: `${liveSymbol} Perp`,
        symbol: normalizeHyperliquidTickerSymbol(liveSymbol),
        priceDecimals: deriveHyperliquidPriceDecimals(ctx),
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        liveSymbol,
        keywords: [liveSymbol, 'perp', 'perpetual'],
        base: liveSymbol,
        quote: 'USD',
        hyperliquidMarketType: 'perp',
        ctx,
    };
}

/* Spot catalog entries follow the same normalized shape as perps so prefs search can treat them uniformly. */
function createHyperliquidSpotCatalogEntry(market, ctx) {
    const liveSymbol = normalizeHyperliquidLiveSymbol(market?.name);
    if (liveSymbol === '' || market?.isCanonical !== true || !isHyperliquidSpotSymbol(liveSymbol)) return null;

    const [base, quote] = liveSymbol.split('/');
    return {
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        cryptoProvider: CRYPTO_PROVIDERS.HYPERLIQUID,
        label: liveSymbol,
        symbol: normalizeHyperliquidTickerSymbol(liveSymbol),
        priceDecimals: deriveHyperliquidPriceDecimals(ctx),
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        liveSymbol,
        keywords: [base, quote, 'spot'],
        base,
        quote,
        hyperliquidMarketType: 'spot',
        ctx,
    };
}

/* Price precision is derived from provider text because Hyperliquid does not ship one fixed decimal field. */
function deriveHyperliquidPriceDecimals(ctx) {
    const priceText = `${ctx?.midPx ?? ctx?.markPx ?? ctx?.prevDayPx ?? ''}`.trim();
    if (priceText === '') return 2;

    const [, decimals = ''] = priceText.split('.');
    return Math.min(6, Math.max(0, decimals.length));
}
