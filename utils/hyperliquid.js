import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {ASSET_CATEGORIES, CRYPTO_PROVIDERS, MARKET_TYPES} from './asset-categories.js';

/*
 * Hyperliquid helpers cover three system responsibilities in one provider area:
 * - runtime market discovery for prefs search
 * - symbol normalization/scoring for catalog selection
 * - REST/live quote normalization for the quote pipeline
 *
 * Higher layers call into these helpers instead of embedding Hyperliquid's API
 * response shapes directly in prefs or quote orchestration.
 */
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

/* Provider/live symbols are normalized here so prefs, providers, and storage agree on one symbol shape. */
export function normalizeHyperliquidLiveSymbol(value) {
    const compact = `${value ?? ''}`
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');

    if (/^[A-Z0-9]+(?:\/[A-Z0-9]+)?$/.test(compact))
        return compact;

    return '';
}

/* Saved ticker symbols are provider-neutral lowercase ids derived from Hyperliquid live symbols here. */
export function normalizeHyperliquidTickerSymbol(value) {
    return normalizeHyperliquidLiveSymbol(value)
        .replace(/[^A-Z0-9]/g, '')
        .toLowerCase();
}

/* Spot/perp branching elsewhere uses this helper instead of repeating string-shape checks inline. */
export function isHyperliquidSpotSymbol(value) {
    return normalizeHyperliquidLiveSymbol(value).includes('/');
}

/* Search scoring encodes Hyperliquid-specific matching priorities for the prefs dialog. */
export function scoreHyperliquidCatalogEntry(entry, query) {
    const normalizedQuery = normalizeHyperliquidSearchQuery(query);
    if (normalizedQuery === '')
        return Number.NEGATIVE_INFINITY;

    const normalizedLabel = normalizeHyperliquidSearchQuery(entry.label);
    const normalizedSymbol = normalizeHyperliquidSearchQuery(entry.symbol);
    const normalizedLiveSymbol = normalizeHyperliquidSearchQuery(entry.liveSymbol);
    const normalizedBase = normalizeHyperliquidSearchQuery(entry.base);
    const normalizedQuote = normalizeHyperliquidSearchQuery(entry.quote);
    const normalizedKeywords = (entry.keywords ?? []).map(keyword => normalizeHyperliquidSearchQuery(keyword));
    const marketTypeBias = entry.hyperliquidMarketType === 'perp' ? 20 : 0;

    let score = -1;

    if (normalizedLiveSymbol === normalizedQuery)
        score = Math.max(score, 950);

    if (normalizedSymbol === normalizedQuery)
        score = Math.max(score, 900);

    if (normalizedBase === normalizedQuery)
        score = Math.max(score, 860 + marketTypeBias);

    if (normalizedLabel === normalizedQuery)
        score = Math.max(score, 820);

    if (normalizedKeywords.some(keyword => keyword === normalizedQuery))
        score = Math.max(score, 760);

    if (normalizedBase.startsWith(normalizedQuery))
        score = Math.max(score, 720 + marketTypeBias);

    if (normalizedLiveSymbol.startsWith(normalizedQuery))
        score = Math.max(score, 690);

    if (normalizedSymbol.startsWith(normalizedQuery))
        score = Math.max(score, 660);

    if (
        normalizedLabel.startsWith(normalizedQuery) ||
        normalizedKeywords.some(keyword => keyword.startsWith(normalizedQuery))
    ) {
        score = Math.max(score, 620);
    }

    if (
        normalizedLiveSymbol.includes(normalizedQuery) ||
        normalizedSymbol.includes(normalizedQuery) ||
        normalizedBase.includes(normalizedQuery) ||
        normalizedQuote.includes(normalizedQuery) ||
        normalizedLabel.includes(normalizedQuery) ||
        normalizedKeywords.some(keyword => keyword.includes(normalizedQuery))
    ) {
        score = Math.max(score, 500);
    }

    return score;
}

/* Provider quote objects are normalized here so both REST and websocket paths emit the same shape. */
export function createHyperliquidQuote(entry, fallbackPreviousClose = null) {
    const price = firstFiniteNumber(entry?.ctx?.midPx, entry?.ctx?.markPx);
    const previousClose = firstFinitePositiveNumber(entry?.ctx?.prevDayPx, fallbackPreviousClose);

    if (!Number.isFinite(price))
        return null;

    return {
        price,
        quoteDate: getCurrentUtcDate(),
        previousClose: Number.isFinite(previousClose) ? previousClose : null,
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
        requestSession.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (_session, result) => {
                try {
                    resolve(requestSession.send_and_read_finish(result));
                } catch (error) {
                    reject(error);
                }
            }
        );
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
/* Runtime market discovery combines spot and perp listings into the dialog's unified crypto catalog. */
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
    if (liveSymbol === '' || market?.isDelisted === true)
        return null;

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
    if (
        liveSymbol === '' ||
        market?.isCanonical !== true ||
        !liveSymbol.includes('/')
    ) {
        return null;
    }

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
    if (priceText === '')
        return 2;

    const [, decimals = ''] = priceText.split('.');
    return Math.min(6, Math.max(0, decimals.length));
}

/* Quote normalization picks the first usable numeric field from Hyperliquid's multiple price representations. */
function firstFiniteNumber(...values) {
    for (const value of values) {
        const parsed = Number.parseFloat(`${value ?? ''}`);
        if (Number.isFinite(parsed))
            return parsed;
    }

    return null;
}

/* Previous close fallbacks require a positive finite number, not just any parseable float. */
function firstFinitePositiveNumber(...values) {
    for (const value of values) {
        const parsed = Number.parseFloat(`${value ?? ''}`);
        if (Number.isFinite(parsed) && parsed > 0)
            return parsed;
    }

    return null;
}

/* Search normalization strips formatting noise so catalog ranking compares provider values consistently. */
function normalizeHyperliquidSearchQuery(value) {
    return `${value ?? ''}`
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

/* Hyperliquid quote dates are represented in UTC date form for cache invalidation and display consistency. */
function getCurrentUtcDate() {
    return new Date().toISOString().slice(0, 10).replaceAll('-', '');
}
