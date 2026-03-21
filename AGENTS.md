# AGENTS.md

## Repo Purpose

This repository contains a GNOME Shell extension that shows market tickers in the top bar.
The current ticker list is defined in `extension.js`.

## Key Files

- `extension.js`: main extension logic, ticker definitions, API fetches, caching, formatting, panel rendering
- `metadata.json`: GNOME Shell extension metadata and compatibility
- `install.sh`: copy-based local install
- `install-dev.sh`: symlink-based development install
- `remove.sh`: remove installed extension
- `DEBUGGING_GUIDE.md`: debugging notes for extension behavior and API parsing

## Maintenance Rule

If a key repo file is created, renamed, or deleted, update this `AGENTS.md` file in the same change so the file map stays accurate.

## Data And API Conventions

- Market data is fetched from Stooq.
- Prefer the batched quote endpoint for current prices.
- Previous close should be cached per symbol and invalidated based on the provider quote date, not the user's local timezone.
- Do not hard-code market open, pre-market, or rollover times using the local system clock.
- Treat crypto and index session boundaries according to the provider's returned date.
- Do an initial fetch for all tickers on startup so the panel can render immediately.
- Ongoing polling may skip US-session tickers on weekends using `America/New_York`, but always-open tickers like crypto should continue refreshing.
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
