#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "${ROOT_DIR}"

if command -v gnome-shell >/dev/null 2>&1; then
    GNOME_SHELL_MAJOR="$(gnome-shell --version | sed -nE 's/^GNOME Shell ([0-9]+).*/\1/p')"

    if [[ -n "${GNOME_SHELL_MAJOR}" ]] && ! grep -Eq "\"${GNOME_SHELL_MAJOR}\"" metadata.json; then
        printf 'metadata.json does not list installed GNOME Shell major version: %s\n' "${GNOME_SHELL_MAJOR}" >&2
        exit 1
    fi
fi

printf 'Running focused GJS test suites...\n'
gjs -m tests/run.js

printf '\nRunning import sanity checks...\n'
gjs -m services/quotes.js
gjs -m services/providers/kraken-live.js
gjs -m services/providers/hyperliquid-live.js
gjs -m services/providers/cnbc.js
gjs -m services/providers/nasdaq.js
gjs -m services/providers/open-er-api.js
gjs -m services/providers/rest-quotes.js
gjs -m services/entry-model.js
gjs -m services/quote-store.js
gjs -m utils/display-settings.js
gjs -m utils/display-density.js
gjs -m utils/market-schedule.js
gjs -m utils/http.js
gjs -m utils/settings.js
gjs -m utils/ticker-config.js
gjs -m utils/crypto-providers/kraken/catalog.js
gjs -m utils/crypto-providers/kraken/quotes.js
gjs -m utils/crypto-providers/kraken/symbols.js
gjs -m utils/crypto-providers/hyperliquid/catalog.js
gjs -m utils/crypto-providers/hyperliquid/quotes.js
gjs -m utils/crypto-providers/hyperliquid/symbols.js
gjs -m utils/prefs/catalog-suggestions.js
gjs -m utils/prefs/ticker-dialog-state.js

printf '\nAll local checks passed.\n'
