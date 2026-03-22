# Maintainability Refactor Plan

## Purpose

This document describes a focused cleanup pass for the current codebase based on a review of the runtime, prefs flow, provider layers, and test setup.

The goal is **not** to redesign the extension. The goal is to reduce the places that currently feel policy-heavy or harder to evolve, while preserving behavior.

## Current Assessment

The project does **not** look randomly duct-taped together overall.

What already looks healthy:

- `extension.js` is a clean GNOME lifecycle boundary.
- `services/quotes.js` acts as a central runtime orchestrator rather than mixing UI and provider code together.
- `services/quotes-coordinator.js` isolates timing/throttling concerns.
- `services/providers/live-websocket-provider.js` centralizes websocket lifecycle and reconnect behavior.
- `prefs.js` delegates the denser dialog state machine instead of containing everything inline.
- `./check.sh` and the current focused tests provide a lightweight regression net.

What still feels dense or at risk of becoming messy:

- `utils/settings.js` mixes settings I/O, defaults, config normalization, migration-style cleanup, provider-specific symbol normalization, and asset inference.
- `utils/prefs/ticker-dialog-controller.js` owns a large GTK + async + validation + verification + suggestion-rendering state machine.
- Some compatibility and normalization policy is spread across settings, prefs, and provider-adjacent helpers.

## Refactor Goals

1. Shrink `utils/settings.js` into a thinner settings boundary.
2. Make ticker config normalization more explicit and independently testable.
3. Reduce the amount of business logic inside `utils/prefs/ticker-dialog-controller.js`.
4. Keep runtime behavior and user-facing behavior unchanged.
5. Expand tests around extracted pure logic before further feature growth.

---

## Proposed Work

## 1) Extract ticker config normalization out of `utils/settings.js`

### Why

`utils/settings.js` currently does too many things:

- settings key definitions
- default ticker definitions
- settings load/save/reset
- config parsing and serialization
- asset-category inference
- crypto provider normalization
- symbol normalization per provider
- support fallback logic for live symbols

This is the clearest hotspot in the codebase.

### Target outcome

Keep `utils/settings.js` responsible for:

- settings constants
- defaults
- load/save/reset public API
- display and refresh helpers

Move ticker normalization and serialization policy into a dedicated module.

### Files to add

- `utils/ticker-config.js`

### Files to edit

- `utils/settings.js`
- tests: add focused tests for extracted helpers

### Suggested responsibilities for new file

`utils/ticker-config.js` should own:

- `normalizeTickerConfig(rawTicker)`
- `serializeTickerConfig(ticker)`
- `cloneTicker(ticker)`
- `inferAssetCategory(ticker)`
- provider-aware live symbol / saved symbol normalization helpers

### Git diff sketch

```diff
diff --git a/utils/settings.js b/utils/settings.js
--- a/utils/settings.js
+++ b/utils/settings.js
@@
 import {
     ASSET_CATEGORIES,
     CRYPTO_PROVIDERS,
     MARKET_TYPES,
     getAssetCategoryDefaultMarketType,
     getAssetCategoryOptions,
     getCryptoProviderOptions,
     getDefaultCryptoProvider,
 } from './asset-categories.js';
 import {
     DEFAULT_DISPLAY_SETTINGS,
     DEFAULT_REFRESH_INTERVAL_SECONDS,
     FORMAT_PRESETS,
     SEPARATOR_STYLES,
 } from './display-settings.js';
-import {
-    normalizeHyperliquidLiveSymbol,
-    normalizeHyperliquidTickerSymbol,
-} from './hyperliquid.js';
-import {
-    normalizeKrakenLiveSymbol,
-    normalizeKrakenTickerSymbol,
-} from './kraken.js';
+import {
+    cloneTicker,
+    normalizeTickerConfig,
+    serializeTickerConfig,
+} from './ticker-config.js';
@@
-const SUPPORTED_LIVE_TICKERS = [
-    {
-        label: 'BTC',
-        symbol: 'btcusd',
-        marketType: MARKET_TYPES.ALWAYS_OPEN,
-        assetCategory: ASSET_CATEGORIES.CRYPTO,
-        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
-        liveSymbol: 'BTC/USD',
-    },
-    {
-        label: 'ETH',
-        symbol: 'ethusd',
-        marketType: MARKET_TYPES.ALWAYS_OPEN,
-        assetCategory: ASSET_CATEGORIES.CRYPTO,
-        cryptoProvider: CRYPTO_PROVIDERS.KRAKEN,
-        liveSymbol: 'ETH/USD',
-    },
-];
@@
 export function loadTickerConfigs(settings) {
     const serialized = settings?.get_string(SETTINGS_KEYS.TICKERS_JSON) ?? '';
     if (serialized.trim() === '')
         return cloneTickers(DEFAULT_TICKERS);
@@
 export function cloneTicker(ticker) {
-    return JSON.parse(JSON.stringify(ticker));
+    return cloneTicker(ticker);
 }
@@
-function normalizeTickerConfig(rawTicker) {
-    ...
-}
-
-function serializeTickerConfig(ticker) {
-    ...
-}
-
-function inferAssetCategory(ticker) {
-    ...
-}
```

```diff
diff --git a/utils/ticker-config.js b/utils/ticker-config.js
new file mode 100644
--- /dev/null
+++ b/utils/ticker-config.js
@@
+import {
+    ASSET_CATEGORIES,
+    CRYPTO_PROVIDERS,
+    MARKET_TYPES,
+    getAssetCategoryDefaultMarketType,
+    getDefaultCryptoProvider,
+} from './asset-categories.js';
+import {
+    normalizeHyperliquidLiveSymbol,
+    normalizeHyperliquidTickerSymbol,
+} from './hyperliquid.js';
+import {
+    normalizeKrakenLiveSymbol,
+    normalizeKrakenTickerSymbol,
+} from './kraken.js';
+
+export function cloneTicker(ticker) {
+    return JSON.parse(JSON.stringify(ticker));
+}
+
+export function normalizeTickerConfig(rawTicker) {
+    // extracted from settings.js
+}
+
+export function serializeTickerConfig(ticker) {
+    // extracted from settings.js
+}
```

### Notes

- This is mostly a move/extract refactor.
- Avoid changing settings format unless necessary.
- If live-ticker compatibility logic is still needed, keep it in the new file, but isolate it behind clearly named helpers.

---

## 2) Split pure ticker-config policy tests away from runtime tests

### Why

After extraction, the normalization logic becomes one of the most important pure policy layers in the repo. It should have direct tests rather than being covered only indirectly.

### Files to add

- `tests/ticker-config.test.js`

### Files to edit

- `tests/run.js`

### Test focus

- empty/invalid config fallback behavior
- asset-category inference rules
- crypto provider normalization
- Kraken live symbol normalization
- Hyperliquid live symbol normalization
- serialization round-trip expectations
- backward-compatible saved config shapes

### Git diff sketch

```diff
diff --git a/tests/run.js b/tests/run.js
--- a/tests/run.js
+++ b/tests/run.js
@@
 import {runTests as runEntryModelTests} from './entry-model.test.js';
 import {runTests as runMarketScheduleTests} from './market-schedule.test.js';
 import {runTests as runQuotesCoordinatorTests} from './quotes-coordinator.test.js';
 import {runTests as runTickerDialogStateTests} from './ticker-dialog-state.test.js';
+import {runTests as runTickerConfigTests} from './ticker-config.test.js';
@@
 const suites = [
     ['market-schedule', runMarketScheduleTests],
     ['entry-model', runEntryModelTests],
     ['quotes-coordinator', runQuotesCoordinatorTests],
     ['ticker-dialog-state', runTickerDialogStateTests],
+    ['ticker-config', runTickerConfigTests],
 ];
```

```diff
diff --git a/tests/ticker-config.test.js b/tests/ticker-config.test.js
new file mode 100644
--- /dev/null
+++ b/tests/ticker-config.test.js
@@
+import {assertEqual, assertDeepEqual} from './support/assert.js';
+import {
+    normalizeTickerConfig,
+    serializeTickerConfig,
+} from '../utils/ticker-config.js';
+
+export async function runTests() {
+    // add focused pure-policy tests here
+}
```

---

## 3) Extract non-GTK dialog state transitions out of `ticker-dialog-controller.js`

### Why

`utils/prefs/ticker-dialog-controller.js` is already better than keeping everything in `prefs.js`, but it still mixes:

- GTK widget creation
- async catalog loading
- verification flows
- suggestion rendering
- dialog state transitions
- save sensitivity decisions

That makes it harder to change without fear.

### Target outcome

Keep the controller focused on GTK wiring.

Move non-widget state transition policy into a pure helper module.

### Files to add

- `utils/prefs/ticker-dialog-session.js`

### Files to edit

- `utils/prefs/ticker-dialog-controller.js`
- possibly `utils/prefs/ticker-dialog-state.js`
- tests: add pure tests for session/state transitions if extracted enough

### Suggested extracted responsibilities

`utils/prefs/ticker-dialog-session.js` can own helpers such as:

- initial dialog session state creation
- resetting verification state
- resetting crypto catalog state
- deriving whether verify/save should be enabled
- request-id bump helpers
- decision helpers for provider/category changes

### Git diff sketch

```diff
diff --git a/utils/prefs/ticker-dialog-controller.js b/utils/prefs/ticker-dialog-controller.js
--- a/utils/prefs/ticker-dialog-controller.js
+++ b/utils/prefs/ticker-dialog-controller.js
 @@
 import {
     buildCatalogSuggestionRows,
     loadCryptoCatalog,
 } from './catalog-suggestions.js';
+import {
+    createTickerDialogSession,
+    resetCryptoCatalogState,
+    clearVerificationState,
+    shouldEnableVerifyButton,
+} from './ticker-dialog-session.js';
@@
-    let cryptoCatalog = null;
-    let cryptoCatalogProvider = '';
-    let cryptoCatalogError = '';
-    let cryptoCatalogLoading = false;
-    let cryptoCatalogRequestId = 0;
-    let isDialogDestroyed = false;
-    let autoFilledCryptoLabel = initialTicker.label ?? '';
-    let verifyInProgress = false;
-    let lastVerifiedSymbol = '';
-    let verificationRequestId = 0;
+    const sessionState = createTickerDialogSession(initialTicker);
@@
-    const clearVerificationState = () => {
-        lastVerifiedSymbol = '';
-        setVerificationMessage('');
-    };
```

```diff
diff --git a/utils/prefs/ticker-dialog-session.js b/utils/prefs/ticker-dialog-session.js
new file mode 100644
--- /dev/null
+++ b/utils/prefs/ticker-dialog-session.js
 @@
+export function createTickerDialogSession(initialTicker) {
+    return {
+        cryptoCatalog: null,
+        cryptoCatalogProvider: '',
+        cryptoCatalogError: '',
+        cryptoCatalogLoading: false,
+        cryptoCatalogRequestId: 0,
+        isDialogDestroyed: false,
+        autoFilledCryptoLabel: initialTicker.label ?? '',
+        verifyInProgress: false,
+        lastVerifiedSymbol: '',
+        verificationRequestId: 0,
+    };
+}
+
+export function resetCryptoCatalogState(state) {
+    state.cryptoCatalog = null;
+    state.cryptoCatalogProvider = '';
+    state.cryptoCatalogError = '';
+    state.cryptoCatalogLoading = false;
+    state.cryptoCatalogRequestId += 1;
+}
```

### Notes

- Do not over-abstract GTK widget access into a generic framework.
- Keep extraction small and practical.
- The goal is to make the controller less crowded, not “clever.”

---

## 4) Add explicit compatibility comments around legacy/default live-symbol behavior

### Why

Some of the current code appears to preserve behavior from earlier narrower crypto support assumptions.

That is fine, but future cleanup will be safer if that compatibility behavior is documented where it lives.

### Files to edit

- `utils/settings.js` or `utils/ticker-config.js` after extraction

### Example comment targets

- fallback live symbol support for old configs
- symbol rewrites for older Kraken shapes
- inferred asset category behavior when old settings lack fields

### Git diff sketch

```diff
diff --git a/utils/ticker-config.js b/utils/ticker-config.js
--- a/utils/ticker-config.js
+++ b/utils/ticker-config.js
 @@
 function getSupportedLiveSymbol(ticker, rawLiveSymbol) {
+    /*
+     * This preserves backward compatibility for previously-saved crypto ticker
+     * shapes that predate the broader runtime catalog flow. Keep this isolated
+     * here so settings callers do not need to know about legacy save formats.
+     */
     const explicitLiveSymbol = normalizeCryptoLiveSymbol(rawLiveSymbol, ticker.cryptoProvider);
```

---

## 5) Optional later cleanup: split `settings.js` into public settings API vs constants/defaults

### Why

This is a lower-priority cleanup than the normalization extraction above.

After step 1, `settings.js` may already be small enough. If not, a second pass can split:

- constants/defaults into one file
- public settings load/save helpers into another

### Candidate files

- `utils/settings-constants.js`
- `utils/settings.js`

### Recommendation

Do this only if `settings.js` still feels crowded after extracting ticker config policy.

---

## Suggested Implementation Order

1. Extract `utils/ticker-config.js`.
2. Add `tests/ticker-config.test.js` and update `tests/run.js`.
3. Run `./check.sh` and fix any import/test regressions.
4. Extract small pure session helpers from `utils/prefs/ticker-dialog-controller.js`.
5. Add/update tests only if the extraction yields enough pure logic to justify them.
6. Add compatibility comments where legacy behavior is intentionally preserved.

---

## Out of Scope

These changes are **not** intended to:

- alter GNOME panel behavior
- change quote refresh policy
- redesign the prefs UX
- replace current providers
- change settings schema keys
- rewrite the extension into a different architecture

---

## Practical Review Checklist

After implementing the plan:

- `./check.sh` passes
- imports still load cleanly
- saved ticker configs still load correctly
- editing/adding/removing tickers behaves the same
- Kraken and Hyperliquid search/verification still behave the same
- no change in panel-side placement behavior
- no change in refresh timing behavior

---

## Summary

The repo is already reasonably structured. The main issue is not “everything is duct tape”; it is that a few files have accumulated too much policy.

The best cleanup path is:

- extract ticker config normalization out of `utils/settings.js`
- add direct tests for that policy
- lighten `ticker-dialog-controller.js` by moving pure session/state helpers out

This gives you the biggest maintainability gain with the lowest behavioral risk.