import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Soup from 'gi://Soup?version=3.0';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const REFRESH_INTERVAL_SECONDS = 300;
const HISTORY_LOOKBACK_DAYS = 7;
const KRAKEN_WEBSOCKET_URL = 'wss://ws.kraken.com/v2';
const KRAKEN_TICKER_SYMBOLS = ['BTC/USD', 'ETH/USD'];
const KRAKEN_RECONNECT_DELAYS_SECONDS = [2, 5, 10, 20, 30, 60];
const CRYPTO_UI_UPDATE_INTERVAL_SECONDS = 4;
const DEFAULT_TEXT_COLOR = '#ffffff';
const POSITIVE_COLOR = '#3FB950';
const NEGATIVE_COLOR = '#F85149';
const US_MARKET_TIME_ZONE = 'America/New_York';
const KRAKEN_SYMBOL_TO_TICKER_SYMBOL = new Map([
    ['BTC/USD', 'BTC.V'],
    ['ETH/USD', 'ETH.V'],
]);
const TICKERS = [
    {label: 'SPX', symbol: '^spx', priceDecimals: 0, marketType: 'us-session'},
    {label: 'ETH', symbol: 'eth.v', priceDecimals: 2, marketType: 'always-open'},
    {label: 'BTC', symbol: 'btc.v', priceDecimals: 1, marketType: 'always-open'},
];

const TickerIndicator = GObject.registerClass(
class TickerIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Ticker Indicator', false);

        this._content = new St.BoxLayout({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.add_child(this._content);
        this.setEntries(TICKERS.map(ticker => ({
            label: ticker.label,
            priceText: '...',
            arrow: '',
            percentText: '',
            changeColor: DEFAULT_TEXT_COLOR,
        })));
    }

    setEntries(entries) {
        this._content.destroy_all_children();

        entries.forEach((entry, index) => {
            if (index > 0) {
                this._content.add_child(new St.Label({
                    text: ' \u00b7 ',
                    y_align: Clutter.ActorAlign.CENTER,
                    style: `color: ${DEFAULT_TEXT_COLOR};`,
                }));
            }

            this._content.add_child(new St.Label({
                text: `${entry.label} ${entry.priceText}`,
                y_align: Clutter.ActorAlign.CENTER,
                style: `color: ${DEFAULT_TEXT_COLOR};`,
            }));

            if (!entry.arrow || !entry.percentText)
                return;

            this._content.add_child(new St.Label({
                text: ` ${entry.arrow}`,
                y_align: Clutter.ActorAlign.CENTER,
                style: `color: ${entry.changeColor};`,
            }));

            this._content.add_child(new St.Label({
                text: ` ${entry.percentText}`,
                y_align: Clutter.ActorAlign.CENTER,
                style: `color: ${entry.changeColor};`,
            }));
        });
    }
});

export default class HelloWorldExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._latestQuotesBySymbol = new Map();
        this._previousCloseCache = new Map();
        this._refreshTimeoutId = 0;
        this._indicatorUpdateTimeoutId = 0;
        this._indicatorUpdateInProgress = false;
        this._indicatorUpdateQueued = false;
        this._lastIndicatorUpdateUsec = 0;
        this._krakenWebsocket = null;
        this._krakenReconnectTimeoutId = 0;
        this._krakenReconnectAttempt = 0;
        this._session = new Soup.Session();
    }

    enable() {
        this._indicator = new TickerIndicator();

        // Insert at the start of the right box so the ticker stays on the right
        // side of the panel without displacing the user's existing status icons
        // from the far-right edge.
        Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'right');
        this._refreshPrices(true);
        this._connectKrakenWebsocket();

        this._refreshTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            REFRESH_INTERVAL_SECONDS,
            () => {
                this._refreshPrices(false);
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    disable() {
        if (this._refreshTimeoutId !== 0) {
            GLib.Source.remove(this._refreshTimeoutId);
            this._refreshTimeoutId = 0;
        }

        if (this._indicatorUpdateTimeoutId !== 0) {
            GLib.Source.remove(this._indicatorUpdateTimeoutId);
            this._indicatorUpdateTimeoutId = 0;
        }

        if (this._krakenReconnectTimeoutId !== 0) {
            GLib.Source.remove(this._krakenReconnectTimeoutId);
            this._krakenReconnectTimeoutId = 0;
        }

        const indicator = this._indicator;
        this._indicator = null;
        this._indicatorUpdateInProgress = false;
        this._indicatorUpdateQueued = false;
        this._lastIndicatorUpdateUsec = 0;
        this._krakenReconnectAttempt = 0;
        this._disconnectKrakenWebsocket();
        this._latestQuotesBySymbol.clear();
        this._previousCloseCache.clear();
        indicator?.destroy();
    }

    async _refreshPrices(forceRefreshAll = false) {
        const tickersToRefresh = forceRefreshAll
            ? TICKERS
            : TICKERS.filter(ticker => this._shouldRefreshTicker(ticker));

        if (tickersToRefresh.length > 0) {
            try {
                const quoteCsv = await this._fetchText(this._buildBatchQuoteUrl(tickersToRefresh));
                const quotesBySymbol = this._parseBatchQuotes(quoteCsv, tickersToRefresh.length);

                quotesBySymbol.forEach((quote, symbol) => {
                    this._latestQuotesBySymbol.set(symbol, quote);
                });
            } catch (error) {
                logError(error, `${this.uuid}: failed to refresh batched quotes`);
            }
        }

        this._requestIndicatorUpdate(true);
    }

    _requestIndicatorUpdate(immediate = false) {
        if (!this._indicator)
            return;

        if (this._indicatorUpdateInProgress) {
            this._indicatorUpdateQueued = true;
            return;
        }

        if (immediate) {
            if (this._indicatorUpdateTimeoutId !== 0) {
                GLib.Source.remove(this._indicatorUpdateTimeoutId);
                this._indicatorUpdateTimeoutId = 0;
            }

            void this._updateIndicator();
            return;
        }

        const elapsedSeconds = (GLib.get_monotonic_time() - this._lastIndicatorUpdateUsec) / 1_000_000;
        if (this._lastIndicatorUpdateUsec === 0 || elapsedSeconds >= CRYPTO_UI_UPDATE_INTERVAL_SECONDS) {
            void this._updateIndicator();
            return;
        }

        if (this._indicatorUpdateTimeoutId !== 0)
            return;

        const remainingMs = Math.max(
            1,
            Math.round((CRYPTO_UI_UPDATE_INTERVAL_SECONDS - elapsedSeconds) * 1000)
        );

        this._indicatorUpdateTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            remainingMs,
            () => {
                this._indicatorUpdateTimeoutId = 0;
                void this._updateIndicator();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    async _updateIndicator() {
        if (!this._indicator || this._indicatorUpdateInProgress)
            return;

        this._indicatorUpdateInProgress = true;

        const entries = await Promise.all(
            TICKERS.map(async ticker => {
                try {
                    return await this._fetchTickerEntry(ticker);
                } catch (error) {
                    logError(error, `${this.uuid}: failed to refresh ${ticker.label}`);

                    return {
                        label: ticker.label,
                        priceText: '--',
                        arrow: '',
                        percentText: '',
                        changeColor: DEFAULT_TEXT_COLOR,
                    };
                }
            })
        );

        if (this._indicator) {
            this._indicator.setEntries(entries);
            this._lastIndicatorUpdateUsec = GLib.get_monotonic_time();
        }

        this._indicatorUpdateInProgress = false;

        if (!this._indicatorUpdateQueued)
            return;

        this._indicatorUpdateQueued = false;
        this._requestIndicatorUpdate(false);
    }

    async _fetchTickerEntry(ticker) {
        const quote = this._latestQuotesBySymbol.get(ticker.symbol.toUpperCase());

        if (!quote)
            throw new Error(`Missing batched quote for ${ticker.symbol}`);

        const previousClose = await this._getPreviousClose(ticker, quote.quoteDate);
        const percentChange = ((quote.price - previousClose) / previousClose) * 100;

        return {
            label: ticker.label,
            priceText: this._formatPrice(quote.price, ticker.priceDecimals),
            arrow: this._getArrow(percentChange),
            percentText: `${Math.abs(percentChange).toFixed(1)}%`,
            changeColor: this._getChangeColor(percentChange),
        };
    }

    async _getPreviousClose(ticker, quoteDate) {
        const cacheKey = ticker.symbol.toUpperCase();
        const cachedEntry = this._previousCloseCache.get(cacheKey);

        if (cachedEntry?.quoteDate === quoteDate)
            return cachedEntry.previousClose;

        const historyCsv = await this._fetchText(this._buildHistoryUrl(ticker.symbol));
        const previousClose = this._parsePreviousClose(historyCsv, quoteDate);

        this._previousCloseCache.set(cacheKey, {
            quoteDate,
            previousClose,
        });

        return previousClose;
    }

    async _fetchText(url) {
        const message = Soup.Message.new('GET', url);
        const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        return new TextDecoder().decode(bytes.get_data()).trim();
    }

    async _connectKrakenWebsocket() {
        if (!this._indicator || this._krakenWebsocket)
            return;

        try {
            const message = Soup.Message.new('GET', KRAKEN_WEBSOCKET_URL);
            const websocket = await new Promise((resolve, reject) => {
                this._session.websocket_connect_async(
                    message,
                    null,
                    [],
                    GLib.PRIORITY_DEFAULT,
                    null,
                    (_session, result) => {
                        try {
                            resolve(this._session.websocket_connect_finish(result));
                        } catch (error) {
                            reject(error);
                        }
                    }
                );
            });

            if (!this._indicator) {
                websocket.close(1000, null);
                return;
            }

            this._krakenWebsocket = websocket;

            websocket.connect('message', (_connection, type, messageBytes) => {
                this._handleKrakenMessage(type, messageBytes);
            });

            websocket.connect('error', (_connection, error) => {
                logError(error, `${this.uuid}: Kraken websocket error`);
            });

            websocket.connect('closed', () => {
                this._handleKrakenDisconnect();
            });

            websocket.send_text(JSON.stringify({
                method: 'subscribe',
                params: {
                    channel: 'ticker',
                    event_trigger: 'trades',
                    symbol: KRAKEN_TICKER_SYMBOLS,
                    snapshot: true,
                },
            }));
        } catch (error) {
            logError(error, `${this.uuid}: failed to connect Kraken websocket`);
            this._scheduleKrakenReconnect();
        }
    }

    _disconnectKrakenWebsocket() {
        const websocket = this._krakenWebsocket;
        this._krakenWebsocket = null;

        if (!websocket)
            return;

        const state = websocket.get_state();
        if (state !== Soup.WebsocketState.CLOSING && state !== Soup.WebsocketState.CLOSED)
            websocket.close(1000, null);
    }

    _handleKrakenDisconnect() {
        this._krakenWebsocket = null;

        if (!this._indicator)
            return;

        this._scheduleKrakenReconnect();
    }

    _scheduleKrakenReconnect() {
        if (!this._indicator || this._krakenReconnectTimeoutId !== 0)
            return;

        const index = Math.min(
            this._krakenReconnectAttempt,
            KRAKEN_RECONNECT_DELAYS_SECONDS.length - 1
        );
        const delaySeconds = KRAKEN_RECONNECT_DELAYS_SECONDS[index];
        this._krakenReconnectAttempt += 1;

        this._krakenReconnectTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            delaySeconds,
            () => {
                this._krakenReconnectTimeoutId = 0;
                void this._connectKrakenWebsocket();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    _handleKrakenMessage(type, messageBytes) {
        if (type !== Soup.WebsocketDataType.TEXT)
            return;

        let payload;

        try {
            payload = JSON.parse(new TextDecoder().decode(messageBytes.get_data()));
        } catch (error) {
            logError(error, `${this.uuid}: failed to parse Kraken websocket payload`);
            return;
        }

        if (payload?.success === false) {
            logError(
                new Error(payload.error ?? 'Kraken websocket subscription failed'),
                `${this.uuid}: Kraken websocket rejected request`
            );
            this._disconnectKrakenWebsocket();
            this._scheduleKrakenReconnect();
            return;
        }

        if (
            payload?.method === 'subscribe' &&
            payload?.success === true &&
            payload?.result?.channel === 'ticker'
        ) {
            this._krakenReconnectAttempt = 0;
            return;
        }

        if (payload?.channel !== 'ticker' || !Array.isArray(payload.data))
            return;

        let updated = false;

        payload.data.forEach(entry => {
            const tickerSymbol = KRAKEN_SYMBOL_TO_TICKER_SYMBOL.get(entry?.symbol ?? '');
            const price = Number.parseFloat(`${entry?.last ?? ''}`);
            const quoteDate = this._normalizeTimestampDate(entry?.timestamp ?? '');

            if (!tickerSymbol || !Number.isFinite(price) || !quoteDate)
                return;

            this._latestQuotesBySymbol.set(tickerSymbol, {price, quoteDate});
            updated = true;
        });

        if (updated) {
            this._krakenReconnectAttempt = 0;
            this._requestIndicatorUpdate(false);
        }
    }

    _buildBatchQuoteUrl(tickers) {
        const joinedSymbols = tickers
            .map(ticker => ticker.symbol)
            .join('+');

        return `https://stooq.com/q/l/?s=${encodeURIComponent(joinedSymbols).replace(/%2B/g, '+')}&i=d`;
    }

    _buildHistoryUrl(symbol) {
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setUTCDate(startDate.getUTCDate() - HISTORY_LOOKBACK_DAYS);

        return `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&d1=${this._formatApiDate(startDate)}&d2=${this._formatApiDate(endDate)}&i=d`;
    }

    _formatApiDate(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    _parseBatchQuotes(csv, expectedCount) {
        const quotesBySymbol = new Map();
        const rows = csv
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');

        rows.forEach(row => {
            const fields = row.split(',');
            const symbol = fields[0]?.trim().toUpperCase();
            const quoteDate = this._normalizeQuoteDate(fields[1]?.trim() ?? '');
            const price = Number.parseFloat(fields[6]?.trim() ?? '');

            if (!symbol || !quoteDate || !Number.isFinite(price))
                throw new Error(`Unexpected batched quote row: ${row}`);

            quotesBySymbol.set(symbol, {price, quoteDate});
        });

        if (quotesBySymbol.size !== expectedCount)
            throw new Error(`Unexpected batched quote response: ${csv}`);

        return quotesBySymbol;
    }

    _parsePreviousClose(csv, quoteDate) {
        const rows = csv
            .split('\n')
            .slice(1)
            .filter(line => line.trim() !== '')
            .map(line => {
                const fields = line.split(',');
                return {
                    date: this._normalizeQuoteDate(fields[0]?.trim() ?? ''),
                    close: Number.parseFloat(fields[4]?.trim() ?? ''),
                };
            });

        if (rows.length < 2)
            throw new Error(`Not enough history rows: ${csv}`);

        const previousRow = rows.findLast(row => row.date && row.date < quoteDate);
        const previousClose = previousRow?.close;

        if (!Number.isFinite(previousClose))
            throw new Error(`Unexpected history response: ${csv}`);

        return previousClose;
    }

    _normalizeQuoteDate(dateText) {
        const normalized = dateText.replaceAll('-', '');
        return /^\d{8}$/.test(normalized) ? normalized : '';
    }

    _normalizeTimestampDate(timestampText) {
        return this._normalizeQuoteDate(timestampText.slice(0, 10));
    }

    _shouldRefreshTicker(ticker) {
        if (ticker.marketType === 'always-open')
            return true;

        if (ticker.marketType === 'us-session')
            return !this._isUsMarketWeekend();

        return true;
    }

    _isUsMarketWeekend() {
        const weekday = new Intl.DateTimeFormat('en-US', {
            timeZone: US_MARKET_TIME_ZONE,
            weekday: 'short',
        }).format(new Date());

        return weekday === 'Sat' || weekday === 'Sun';
    }

    _formatPrice(price, decimals) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(price);
    }

    _getArrow(percentChange) {
        if (percentChange > 0)
            return '\u25b2';

        if (percentChange < 0)
            return '\u25bc';

        return '\u25ba';
    }

    _getChangeColor(percentChange) {
        if (percentChange > 0)
            return POSITIVE_COLOR;

        if (percentChange < 0)
            return NEGATIVE_COLOR;

        return DEFAULT_TEXT_COLOR;
    }
}
