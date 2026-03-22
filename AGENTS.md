# AGENTS.md

## Repo Purpose

This repository contains a GNOME Shell extension that shows market tickers in the top bar.
The current ticker list is defined in `extension.js`.

## Key Files

- `extension.js`: extension lifecycle orchestration, panel registration, service startup/shutdown
- `prefs.js`: GNOME preferences window for ticker configuration, refresh cadence, and display options
- `ui/indicator.js`: panel indicator rendering
- `services/quotes.js`: quote fetching, Kraken WebSocket lifecycle, cache management, update scheduling
- `utils/format.js`: display-entry formatting and color helpers
- `utils/settings.js`: shared settings defaults, validation, and settings-backed ticker/display loading
- `schemas/org.gnome.shell.extensions.ticker-price-extension.gschema.xml`: extension settings schema
- `metadata.json`: GNOME Shell extension metadata and compatibility
- `install.sh`: copy-based local install, including runtime module directories
- `install-dev.sh`: symlink-based development install
- `remove.sh`: remove installed extension
- `DEBUGGING_GUIDE.md`: debugging notes for extension behavior and API parsing

## Maintenance Rule

If a key repo file is created, renamed, or deleted, update this `AGENTS.md` file in the same change so the file map stays accurate.

## Data And API Conventions

- Market data is fetched from Stooq, with Kraken WebSocket v2 used for live BTC/USD and ETH/USD updates.
- The current supported non-crypto tickers are SPX, NDX, DXY, EUR/USD, Gold, and USO; verify Stooq symbol availability with `curl` before adding more.
- Tickers may be split across GNOME panel sides via per-ticker `panelSide` metadata; when adding indicators to the left panel, append them after existing left-side items so other extensions are not shifted unexpectedly.
- Prefer the batched quote endpoint for current prices.
- Maintain one persistent Kraken public WebSocket connection for BTC/USD and ETH/USD rather than opening one socket per ticker.
- Keep REST fallback behavior on the normal polling cadence if the crypto socket disconnects; do not increase REST frequency because the socket is down.
- Throttle crypto-driven UI updates so the top bar is not repainted on every trade.
- Reconnect the Kraken socket conservatively and avoid aggressive retry loops.
- Previous close should be cached per symbol and invalidated based on the provider quote date, not the user's local timezone.
- Do not hard-code market open, pre-market, or rollover times using the local system clock.
- Treat crypto and index session boundaries according to the provider's returned date.
- Do an initial fetch for all tickers on startup so the panel can render immediately.
- Ongoing polling may skip US-session tickers on weekends using `America/New_York`, but always-open tickers like crypto should continue refreshing.
- Weekday-session tickers such as DXY, EUR/USD, and Gold should refresh on weekdays and skip weekend polling.
- On weekday overnights outside the U.S. extended-hours window, US-session tickers may refresh less frequently than the normal polling cadence, using `America/New_York` rather than the local system clock.
- When polling is skipped for a ticker, preserve and render its last known quote from in-memory cache.

## Editing Rules

- Preserve existing user changes unless explicitly asked to revert them.
- Prefer `rg` for file and text search.
- Use `apply_patch` for manual file edits.
- Keep code changes minimal and consistent with the current extension structure.
- Avoid destructive git commands unless explicitly requested.

## Verification Notes

- GNOME Shell extension behavior is primarily driven by `extension.js`.
- After changing extension code, verify by reinstalling or reloading the extension in GNOME Shell as appropriate for the session type.
- Be careful with changes that affect API parsing, panel placement, refresh timing, or cache invalidation.
