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
const TICKERS = [
    {label: 'SPX', symbol: '^spx', priceDecimals: 0},
    {label: 'ETH', symbol: 'eth.v', priceDecimals: 0},
    {label: 'BTC', symbol: 'btc.v', priceDecimals: 0},
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
        this._refreshTimeoutId = 0;
        this._session = new Soup.Session();
    }

    enable() {
        this._indicator = new TickerIndicator();

        // Insert at the start of the right box so the ticker stays on the right
        // side of the panel without displacing the user's existing status icons
        // from the far-right edge.
        Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'right');
        this._refreshPrices();

        this._refreshTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            REFRESH_INTERVAL_SECONDS,
            () => {
                this._refreshPrices();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    disable() {
        if (this._refreshTimeoutId !== 0) {
            GLib.Source.remove(this._refreshTimeoutId);
            this._refreshTimeoutId = 0;
        }

        this._indicator?.destroy();
        this._indicator = null;
    }

    async _refreshPrices() {
        let quotePricesBySymbol;

        try {
            const quoteCsv = await this._fetchText(this._buildBatchQuoteUrl());
            quotePricesBySymbol = this._parseBatchQuotePrices(quoteCsv);
        } catch (error) {
            logError(error, `${this.uuid}: failed to refresh batched quotes`);
            quotePricesBySymbol = new Map();
        }

        const entries = await Promise.all(
            TICKERS.map(async ticker => {
                try {
                    return await this._fetchTickerEntry(ticker, quotePricesBySymbol);
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

    async _fetchTickerEntry(ticker, quotePricesBySymbol) {
        const latestPrice = quotePricesBySymbol.get(ticker.symbol.toUpperCase());

        if (!Number.isFinite(latestPrice))
            throw new Error(`Missing batched quote for ${ticker.symbol}`);

        const historyCsv = await this._fetchText(this._buildHistoryUrl(ticker.symbol));
        const previousClose = this._parsePreviousClose(historyCsv);
        const percentChange = ((latestPrice - previousClose) / previousClose) * 100;

        return {
            label: ticker.label,
            priceText: this._formatPrice(latestPrice, ticker.priceDecimals),
            arrow: this._getArrow(percentChange),
            percentText: `${Math.abs(percentChange).toFixed(1)}%`,
            changeColor: this._getChangeColor(percentChange),
        };
    }

    async _fetchText(url) {
        const message = Soup.Message.new('GET', url);
        const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        return new TextDecoder().decode(bytes.get_data()).trim();
    }

    _buildBatchQuoteUrl() {
        const joinedSymbols = TICKERS
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

    _parseBatchQuotePrices(csv) {
        const pricesBySymbol = new Map();
        const rows = csv
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');

        rows.forEach(row => {
            const fields = row.split(',');
            const symbol = fields[0]?.trim().toUpperCase();
            const price = Number.parseFloat(fields[6]?.trim() ?? '');

            if (!symbol || !Number.isFinite(price))
                throw new Error(`Unexpected batched quote row: ${row}`);

            pricesBySymbol.set(symbol, price);
        });

        if (pricesBySymbol.size !== TICKERS.length)
            throw new Error(`Unexpected batched quote response: ${csv}`);

        return pricesBySymbol;
    }

    _parsePreviousClose(csv) {
        const rows = csv
            .split('\n')
            .slice(1)
            .filter(line => line.trim() !== '');

        if (rows.length < 2)
            throw new Error(`Not enough history rows: ${csv}`);

        const previousFields = rows.at(-2).split(',');
        const previousClose = Number.parseFloat(previousFields[4]?.trim() ?? '');

        if (!Number.isFinite(previousClose))
            throw new Error(`Unexpected history response: ${csv}`);

        return previousClose;
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
