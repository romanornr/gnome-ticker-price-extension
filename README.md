<img src="icon.png" alt="Ticker Tape" width="96" align="left">

# Ticker Tape

Stocks, ETFs, indices, forex, commodities and live crypto in your GNOME top bar.
Ten exchanges across the US, Europe and Asia, with market-aware refresh. No API key required.

<br clear="left">


## Compatibility

- Requires **GNOME Shell 49**, **49.5**, or **50**
- UUID: `ticker-tape@romanornr`

## Local Install

- `./install.sh` for a normal local install
- `./install-dev.sh` for a symlinked development install
- `./remove.sh` to uninstall the extension files when you still have this checkout available

The extension was renamed to Ticker Tape before its first release. GNOME treats a
different UUID as a different extension, so any earlier install stays on disk and
draws its own panel indicator. Remove the old copies once:

```bash
rm -rf ~/.local/share/gnome-shell/extensions/ticker-price-extension@romanornr
rm -rf ~/.local/share/gnome-shell/extensions/ticker-price-extension@romano
```

Saved tickers do not carry across, because the settings schema was renamed with it.

## Default Tickers

The extension ships with the following tickers out of the box:

| Label | Symbol | Category | Panel Side |
|---|---|---|---|
| SPX | `^spx` | US Equity | Right |
| NDX | `^ndq` | US Equity | Right |
| DXY | `dx.f` | FX | Left |
| EUR/USD | `eurusd` | FX | Left |
| Gold | `xauusd` | Commodity | Right |
| USO | `uso.us` | US ETF | Right |
| ETH | `ethusd` | Crypto (Kraken) | Right |
| BTC | `btcusd` | Crypto (Kraken) | Right |

DXY and EUR/USD default to the left panel side while all other tickers appear on the right. The default crypto entries use Kraken, but Hyperliquid is also available as a crypto provider and can be selected per-ticker through the `Crypto API` option in preferences. All defaults can be changed through the extension preferences.

## Adding Tickers

Open the extension preferences and use `+ Add ticker`. You can search the built-in catalog by label, symbol, or broad category terms such as `energy`, `metals`, `forex`, or `crypto`.

- Crypto tickers support both Kraken spot pairs and Hyperliquid spot/perp markets through the `Crypto API` selector in prefs.
- Kraken suggestions are loaded dynamically from Kraken WebSocket instrument metadata, so you can search pairs like `SOL`, `SOLUSD`, or `SOL/USD`.
- Hyperliquid suggestions are loaded dynamically from the official spot/perp metadata endpoints, so you can search perps like `BTC`.

For non-crypto matches, `Verify` checks whether the runtime REST quote chain currently returns data before saving. Crypto markets are validated against the selected provider's loaded live catalog as part of the Save path.

Examples: `QQQ`, `Gold`, `EUR/USD`, `SOL/USD`, `BTC/USD`, `USO`.

## Supported Markets

| Category | Description | Trading Session |
|---|---|---|
| **U.S. Equities** | Stocks and major U.S. equity indexes | U.S. session |
| **International Equities** | Mainland China, Germany, Hong Kong, Japan, Netherlands, and UK stocks | Local market session |
| **U.S. ETFs** | Exchange-traded funds | U.S. session |
| **Commodities** | Metals, energy markets, and exchange-listed funds | Weekday session, or U.S. session for U.S.-listed funds |
| **FX** | Forex pairs and currency products like DXY | Weekday session |
| **Crypto** | Spot and perpetual crypto markets | Always open |

Non-crypto tickers are polled on a configurable refresh interval with market-aware throttling. Crypto tickers use live WebSocket connections for real-time updates (see below).

## Crypto Exchange Support

| Feature | Kraken | Hyperliquid |
|---|---|---|
| **Markets** | Spot pairs | Perps + Spot pairs |
| **Live transport** | WebSocket v2 | WebSocket |
| **REST fallback** | Ticker endpoint | Market snapshots |
| **Catalog discovery** | Dynamic from instrument metadata | Dynamic from spot/perp metadata endpoints |
| **Search examples** | `SOL`, `SOLUSD`, `SOL/USD` | `BTC`, `ETH`, `ETH/USDC` |
| **Connection model** | Single socket, batch subscribe | Single socket, per-symbol subscribe |

Both providers maintain one persistent WebSocket connection for all saved crypto pairs rather than opening one socket per ticker. If either WebSocket disconnects, its provider falls back to REST polling on the normal refresh cadence while reconnecting conservatively.

## Display Settings

The extension preferences panel exposes several display options:

- **Format presets** — controls which parts of each entry are shown (e.g. symbol only, price only, full detail)
- **Show/hide** price, directional arrow, and percent change individually
- **Separator style** between ticker entries (default: dot)
- **Refresh interval** — how often quotes are polled (default: 5 minutes, with market-aware throttling that reduces frequency outside trading hours)

## Managing The Extension

After the extension is installed, open:

- `https://extensions.gnome.org/local/`

This page shows the extensions that GNOME Shell can currently see for your
session. From there you can:

- enable the extension
- disable the extension
- remove the installed extension from GNOME Shell

Use this page when you just want to manage the installed extension and do not
care where it originally came from. It is especially useful if you no longer
have this repository checked out locally, do not remember how you installed it,
or do not want to use `./remove.sh`.

This browser-based flow requires the GNOME Shell Integration browser
extension/add-on to be installed first. Without that browser integration, the
website cannot control local GNOME Shell extensions.

## Provider Layout

This section describes the internal provider architecture for developers and contributors.

The crypto provider code is split into two layers:

- `utils/crypto-providers/` for provider semantics such as symbol normalization, catalog loading, scoring, and quote normalization
- `services/providers/` for runtime transport, provider ownership, and refresh orchestration

`utils/crypto-providers/index.js` composes the shared adapter objects used by
prefs and runtime routing. Provider internals stay split by concern under:

- `utils/crypto-providers/kraken/`
- `utils/crypto-providers/hyperliquid/`

## Editing The Curated Catalog

The curated catalog is split by market so it is easier to maintain:

- [utils/catalog/us-equity.js](utils/catalog/us-equity.js)
- [utils/catalog/us-etf.js](utils/catalog/us-etf.js)
- [utils/catalog/commodity.js](utils/catalog/commodity.js)
- [utils/catalog/fx.js](utils/catalog/fx.js)
- [utils/catalog/crypto.js](utils/catalog/crypto.js)

The crypto catalog provides a minimal static seed for offline/fallback use; broader crypto discovery comes from the live providers (Kraken and Hyperliquid) at runtime.

Shared category labels, ticker-aware market-session policy, and category search terms live in [utils/asset-categories.js](utils/asset-categories.js).

When adding a curated ticker:

- put one compact source record in the file for its asset category and preserve the file's label order
- let the file-local mapper supply shared metadata; market sessions derive centrally from known listing suffixes and category fallbacks
- equity and ETF symbols normally derive from the lowercase label plus the file's market suffix; keep verified exceptions explicit, as `us-equity.js` does for `BRK.B`, `NDX`, and `SPX`
- keep commodity symbols explicit, and add `priceDecimals` only in files whose mapper supports a row-level override
- add a few helpful `keywords` so catalog search is forgiving
- verify the provider symbol first for non-crypto instruments
- crypto suggestions come from the selected live provider at runtime rather than a manually maintained static catalog

## Local Checks

Use one command for the current lightweight local safety net:

```bash
./check.sh
```

This runs:

- `gjs -m tests/run.js`
- focused `gjs -m` import checks for the runtime/provider/helper modules that should load outside the GNOME prefs host

The current test suite covers:

- market schedule policy
- entry-model rendering
- live-websocket lifecycle and direct provider routing
- provider adapters and REST fallback boundaries
- non-crypto quote parsing and live-provider payload handling
- QuotesService orchestration, coordinator scheduling, and lifecycle
- ticker config and prefs dialog state

The current suite count is expected to grow as provider refactors add more
focused seams. If `tests/run.js` reports more suites than this README lists,
prefer the code and update the document in the same change.

It intentionally does not import `prefs.js` directly, because the GNOME prefs resource path only exists when the real extension preferences host process launches it.

## Refactor Regression Workflow

After structural changes, run this end-to-end pass before starting more feature work:

1. Run `./check.sh`.
2. Install the current tree with `./install-dev.sh` for normal development or `./install.sh` for a copy-based install.
3. If the install script says GNOME Shell has not picked up the extension yet:
   on Wayland, log out and back in;
   on Xorg, reload GNOME Shell with `Alt+F2`, `r`, Enter.
4. Start a log tail in another terminal:

```bash
journalctl --user -f /usr/bin/gnome-shell
```

5. Open the extension preferences and walk through this regression checklist:
   enable and disable the extension without errors;
   confirm the indicator appears in the panel;
   confirm left-panel tickers still stay left and right-panel tickers stay right;
   confirm startup shows loading placeholders before live data arrives;
   confirm non-crypto `Verify` still works for selected catalog entries;
   confirm add, edit, remove, reorder, and reset-to-defaults still persist correctly;
   confirm switching `Crypto API` changes the searchable markets and Save validation;
   confirm Kraken and Hyperliquid crypto entries receive live updates;
   confirm price changes still flash briefly and then settle back to the default text color.
6. If a runtime issue appears, add targeted `log()` or `logError()` statements near the relevant provider, orchestrator, or prefs path before doing more refactoring.

If `gnome-extensions info ticker-tape@romanornr` or `gnome-extensions show ticker-tape@romanornr` returns no data, the extension is not currently installed or not visible to the active session. In that case, install it first and repeat the checklist in the real GNOME session.

## Developer Guides

- [DEBUGGING_GUIDE.md](DEBUGGING_GUIDE.md) — detailed debugging procedures for extension behavior and API parsing
- [CODE_STYLE_GUIDE.md](CODE_STYLE_GUIDE.md) — commenting and code style conventions
