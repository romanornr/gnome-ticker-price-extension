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
const DEFAULT_TEXT_COLOR = '#ffffff';
const POSITIVE_COLOR = '#3FB950';
const NEGATIVE_COLOR = '#F85149';
const US_MARKET_TIME_ZONE = 'America/New_York';
const TICKERS = [
    {label: 'SPX', symbol: '^spx', priceDecimals: 0, marketType: 'us-session'},
    {label: 'ETH', symbol: 'eth.v', priceDecimals: 0, marketType: 'always-open'},
    {label: 'BTC', symbol: 'btc.v', priceDecimals: 0, marketType: 'always-open'},
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
        this._session = new Soup.Session();
    }

    enable() {
        this._indicator = new TickerIndicator();

        // Insert at the start of the right box so the ticker stays on the right
        // side of the panel without displacing the user's existing status icons
        // from the far-right edge.
        Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'right');
        this._refreshPrices(true);

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

        this._latestQuotesBySymbol.clear();
        this._previousCloseCache.clear();
        this._indicator?.destroy();
        this._indicator = null;
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

        if (!this._indicator)
            return;

        this._indicator.setEntries(entries);
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
