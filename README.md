# Ticker Price Extension

GNOME Shell extension that shows market tickers in the top bar, with curated suggestions for common equities, ETFs, commodities, FX pairs, and crypto.

## Adding Tickers

You can add tickers in two ways:

1. Open the extension preferences and use `+ Add ticker`.
2. Search the built-in catalog by label, symbol, or broad category terms such as `energy`, `metals`, `forex`, or `crypto`.
3. If your symbol is not in the catalog, enter any Stooq symbol manually and use `Verify` before saving.

Examples: `QQQ`, `Gold`, `EUR/USD`, `BTC`, `USO`.

## Editing The Curated Catalog

The curated catalog is split by market so it is easier to maintain:

- [utils/catalog/us-equity.js](utils/catalog/us-equity.js)
- [utils/catalog/us-etf.js](utils/catalog/us-etf.js)
- [utils/catalog/commodity.js](utils/catalog/commodity.js)
- [utils/catalog/fx.js](utils/catalog/fx.js)
- [utils/catalog/crypto.js](utils/catalog/crypto.js)

Shared category labels, descriptions, default market sessions, and category search terms live in [utils/asset-categories.js](utils/asset-categories.js).

When adding a curated ticker:

- put it in the file for its asset category
- keep `assetCategory`, `marketType`, and `priceDecimals` aligned with similar entries
- add a few helpful `keywords` so catalog search is forgiving
- verify the Stooq symbol first for non-crypto instruments

## Local Install

- `./install.sh` for a normal local install
- `./install-dev.sh` for a symlinked development install
- `./remove.sh` to uninstall
