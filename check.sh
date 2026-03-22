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
gjs -m services/providers/stooq.js
gjs -m services/entry-model.js
gjs -m services/quote-store.js
gjs -m utils/display-settings.js
gjs -m utils/market-schedule.js
gjs -m utils/settings.js
gjs -m utils/prefs/catalog-suggestions.js
gjs -m utils/prefs/ticker-dialog-state.js

printf '\nAll local checks passed.\n'
