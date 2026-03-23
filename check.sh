#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "${ROOT_DIR}"

printf 'Running focused GJS test suites...\n'
gjs -m tests/run.js

printf '\nRunning import sanity checks...\n'
gjs -m services/quotes.js
gjs -m services/providers/live-quote-provider.js
gjs -m services/providers/kraken-live.js
gjs -m services/providers/hyperliquid-live.js
gjs -m services/providers/runtime-provider-registry.js
gjs -m services/providers/stooq.js
gjs -m services/entry-model.js
gjs -m services/quote-store.js
gjs -m utils/display-settings.js
gjs -m utils/market-schedule.js
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
