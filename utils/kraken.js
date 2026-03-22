import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {ASSET_CATEGORIES, MARKET_TYPES} from './asset-categories.js';

/*
 * Kraken helpers play the same role for Kraken that hyperliquid.js plays for
 * Hyperliquid: they isolate provider-specific discovery, normalization, and
 * search scoring from the prefs and provider runtime layers.
 */
export const KRAKEN_WEBSOCKET_URL = 'wss://ws.kraken.com/v2';

const KRAKEN_INSTRUMENT_TIMEOUT_SECONDS = 15;
const KRAKEN_INSTRUMENT_MAX_INCOMING_PAYLOAD_SIZE = 32 * 1024 * 1024;
const KRAKEN_SPOT_PAIR_QUOTE_PRIORITY = ['USD', 'EUR', 'USDT', 'USDC', 'BTC', 'ETH'];

let cachedKrakenSpotPairsPromise = null;

/* prefs loads the cached Kraken spot catalog through this public entrypoint. */
export async function loadKrakenSpotPairs() {
    if (!cachedKrakenSpotPairsPromise) {
        cachedKrakenSpotPairsPromise = _fetchKrakenSpotPairs().catch(error => {
            cachedKrakenSpotPairsPromise = null;
            throw error;
        });
    }

    return cloneKrakenSpotPairs(await cachedKrakenSpotPairsPromise);
}

/* Kraken instrument metadata becomes the runtime crypto catalog through this normalizer. */
export function createKrakenCatalogEntry(pair) {
    const liveSymbol = normalizeKrakenLiveSymbol(pair?.symbol ?? '');
    const base = `${pair?.base ?? ''}`.trim().toUpperCase();
    const quote = `${pair?.quote ?? ''}`.trim().toUpperCase();
    const normalizedSymbol = normalizeKrakenTickerSymbol(liveSymbol);

    return {
        assetCategory: ASSET_CATEGORIES.CRYPTO,
        label: liveSymbol || `${base}/${quote}`,
        symbol: normalizedSymbol,
        priceDecimals: clampDecimals(pair?.price_precision),
        marketType: MARKET_TYPES.ALWAYS_OPEN,
        liveSymbol,
        keywords: [base, quote, normalizedSymbol],
        base,
        quote,
    };
}

/* Kraken websocket pair symbols are normalized here so all layers compare the same live identifier. */
export function normalizeKrakenLiveSymbol(value) {
    const compact = `${value ?? ''}`
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');

    if (/^[A-Z0-9]+\/[A-Z0-9]+$/.test(compact))
        return compact;

    return '';
}

/* Saved ticker ids for Kraken are consistently derived from the websocket pair symbol here. */
export function normalizeKrakenTickerSymbol(value) {
    return normalizeKrakenLiveSymbol(value).replace('/', '').toLowerCase();
}

/* Search scoring prefers strong Kraken pair matches while still supporting fuzzy asset/pair queries. */
export function scoreKrakenCatalogEntry(entry, query) {
    const normalizedQuery = normalizeKrakenSearchQuery(query);
    if (normalizedQuery === '')
        return Number.NEGATIVE_INFINITY;

    const normalizedLiveSymbol = normalizeKrakenSearchQuery(entry.liveSymbol);
    const normalizedCompactSymbol = normalizeKrakenSearchQuery(entry.symbol);
    const normalizedBase = normalizeKrakenSearchQuery(entry.base);
    const normalizedLabel = normalizeKrakenSearchQuery(entry.label);
    const normalizedQuote = normalizeKrakenSearchQuery(entry.quote);

    let score = -1;

    if (normalizedBase === normalizedQuery)
        score = Math.max(score, 700 - getKrakenQuotePriority(entry.quote));

    if (normalizedLiveSymbol === normalizedQuery)
        score = Math.max(score, 900);

    if (normalizedCompactSymbol === normalizedQuery)
        score = Math.max(score, 850);

    if (normalizedLabel === normalizedQuery)
        score = Math.max(score, 800);

    if (normalizedBase.startsWith(normalizedQuery))
        score = Math.max(score, 650 - getKrakenQuotePriority(entry.quote));

    if (normalizedLiveSymbol.startsWith(normalizedQuery))
        score = Math.max(score, 600 - getKrakenQuotePriority(entry.quote));

    if (normalizedCompactSymbol.startsWith(normalizedQuery))
        score = Math.max(score, 580 - getKrakenQuotePriority(entry.quote));

    if (
        normalizedLiveSymbol.includes(normalizedQuery) ||
        normalizedCompactSymbol.includes(normalizedQuery) ||
        normalizedBase.includes(normalizedQuery) ||
        normalizedQuote.includes(normalizedQuery)
    ) {
        score = Math.max(score, 500 - getKrakenQuotePriority(entry.quote));
    }

    return score;
}

/* Cached Kraken pair lists are cloned to keep callers from mutating shared provider state. */
function cloneKrakenSpotPairs(pairs) {
    return pairs.map(entry => ({
        ...entry,
        keywords: [...(entry.keywords ?? [])],
    }));
}

/* Kraken spot pairs are discovered by subscribing to the instrument snapshot websocket channel once. */
async function _fetchKrakenSpotPairs() {
    const session = new Soup.Session();
    let websocket = null;
    let timeoutId = 0;
    let messageSignalId = 0;
    let closedSignalId = 0;
    let errorSignalId = 0;

    try {
        const message = Soup.Message.new('GET', KRAKEN_WEBSOCKET_URL);
        websocket = await new Promise((resolve, reject) => {
            session.websocket_connect_async(
                message,
                null,
                [],
                GLib.PRIORITY_DEFAULT,
                null,
                (_session, result) => {
                    try {
                        resolve(session.websocket_connect_finish(result));
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
        websocket.set_max_incoming_payload_size(KRAKEN_INSTRUMENT_MAX_INCOMING_PAYLOAD_SIZE);

        const pairs = await new Promise((resolve, reject) => {
            const rejectOnce = error => {
                if (timeoutId !== 0) {
                    GLib.Source.remove(timeoutId);
                    timeoutId = 0;
                }

                reject(error);
            };

            timeoutId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                KRAKEN_INSTRUMENT_TIMEOUT_SECONDS,
                () => {
                    timeoutId = 0;
                    reject(new Error('Timed out while loading Kraken instrument data.'));
                    return GLib.SOURCE_REMOVE;
                }
            );

            messageSignalId = websocket.connect('message', (_connection, type, messageBytes) => {
                if (type !== Soup.WebsocketDataType.TEXT)
                    return;

                try {
                    const payload = JSON.parse(new TextDecoder().decode(messageBytes.get_data()));

                    if (payload?.success === false)
                        throw new Error(payload.error ?? 'Kraken instrument subscription failed.');

                    if (payload?.channel === 'instrument' && payload?.type === 'snapshot') {
                        if (timeoutId !== 0) {
                            GLib.Source.remove(timeoutId);
                            timeoutId = 0;
                        }

                        resolve(payload?.data?.pairs ?? []);
                    }
                } catch (error) {
                    rejectOnce(error);
                }
            });

            closedSignalId = websocket.connect('closed', () => {
                rejectOnce(new Error('Kraken instrument socket closed before a snapshot arrived.'));
            });

            errorSignalId = websocket.connect('error', (_connection, error) => {
                rejectOnce(error);
            });

            websocket.send_text(JSON.stringify({
                method: 'subscribe',
                params: {
                    channel: 'instrument',
                    snapshot: true,
                },
            }));
        });

        return pairs
            .filter(pair => pair?.status === 'online')
            .map(createKrakenCatalogEntry)
            .filter(entry => entry.liveSymbol !== '' && entry.symbol !== '' && entry.base !== '' && entry.quote !== '')
            .sort(compareKrakenCatalogEntries);
    } finally {
        if (timeoutId !== 0)
            GLib.Source.remove(timeoutId);

        if (websocket) {
            if (messageSignalId !== 0)
                websocket.disconnect(messageSignalId);

            if (closedSignalId !== 0)
                websocket.disconnect(closedSignalId);

            if (errorSignalId !== 0)
                websocket.disconnect(errorSignalId);

            const state = websocket.get_state();
            if (state !== Soup.WebsocketState.CLOSING && state !== Soup.WebsocketState.CLOSED)
                websocket.close(1000, null);
        }

        session.abort();
    }
}

/* Price precision is normalized into the extension's bounded decimals range here. */
function clampDecimals(value) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    if (!Number.isInteger(parsed))
        return 2;

    return Math.min(6, Math.max(0, parsed));
}

/* Sorting keeps similar bases grouped while preferring common quote currencies first. */
function compareKrakenCatalogEntries(left, right) {
    const priorityDifference = getKrakenQuotePriority(left.quote) - getKrakenQuotePriority(right.quote);
    if (left.base === right.base && priorityDifference !== 0)
        return priorityDifference;

    return left.label.localeCompare(right.label);
}

/* Quote-priority is a search/ranking signal, not a market-data value. */
function getKrakenQuotePriority(quote) {
    const index = KRAKEN_SPOT_PAIR_QUOTE_PRIORITY.indexOf(`${quote ?? ''}`.trim().toUpperCase());
    return index === -1 ? KRAKEN_SPOT_PAIR_QUOTE_PRIORITY.length : index;
}

/* Search normalization makes Kraken labels, compact symbols, and pair strings comparable. */
function normalizeKrakenSearchQuery(value) {
    return `${value ?? ''}`
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}
