<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **gnome-ticker-price-extension** (802 symbols, 2256 relationships, 66 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/gnome-ticker-price-extension/context` | Codebase overview, check index freshness |
| `gitnexus://repo/gnome-ticker-price-extension/clusters` | All functional areas |
| `gitnexus://repo/gnome-ticker-price-extension/processes` | All execution flows |
| `gitnexus://repo/gnome-ticker-price-extension/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

# Project Notes

GNOME Shell extension (GJS/ESM, Shell 49–50) showing market tickers in the top bar.

## Commands

- Tests: `gjs -m tests/run.js`
- Full local checks (lint-ish import sanity + tests): `./check.sh`
- Dev install (symlinks repo into extensions dir): `./install-dev.sh`; on Wayland the live session picks up code changes only after logout/login
- Run new code without logging out: `dbus-run-session -- gnome-shell --devkit` (nested window) or `--headless --virtual-monitor 1600x900` (log-only)

## Architecture Canon

- Catalog and settings symbols stay in historical Stooq-style form (`aapl.us`, `700.hk`, `eurusd`); providers translate at their boundary. Never change saved-symbol format — user gsettings contain it.
- Non-crypto REST quotes come from CNBC's batch webservice (`services/providers/cnbc.js`); symbol grammar mapping lives in `services/providers/cnbc-symbols.js`. FX pairs are derived from the per-currency USD spot vector, never fetched per-pair.
- Crypto is live via Kraken/Hyperliquid websockets with REST fallbacks; provider ownership is wired in `services/providers/runtime-provider-registry.js`.
- Normalized quote shape everywhere past the provider boundary: `{price, quoteDate: 'YYYYMMDD', previousClose|null}` keyed by uppercase catalog symbol.
- `AGENTS.md` holds the file map and data/API conventions; update it in the same change when key files are added, renamed, or removed.
