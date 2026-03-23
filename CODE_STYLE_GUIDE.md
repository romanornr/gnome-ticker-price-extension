# Code Style Guide

This repository uses JavaScript comments to explain the extension as a system, not just as a set of isolated functions.

The goal is that a new contributor, or any coding agent such as Codex, Claude, or Gemini, can open a file and quickly understand:

- why the file exists
- what responsibility boundary it owns
- how it relates to the rest of the extension
- what data comes in and what leaves the module
- what the code must not be responsible for

## Commenting Standard

Comments should be added at the system boundary level, not for trivial syntax.

Every meaningful source file should have:

- a file-level comment near the top describing the module's system role
- comments above important exported classes and exported functions
- comments above non-exported helper functions when the helper represents an important architectural step, policy, or transformation

Examples of files that should follow this rule:

- runtime orchestration modules
- provider adapters
- prefs controllers and state helpers
- formatting and scheduling helpers
- catalog/search helpers
- curated data modules
- UI composition files

Examples that may remain lighter:

- schema files
- simple constants-only files where the role is already obvious
- generated or purely mechanical files

## What Good Comments Must Explain

A good comment in this repo should answer at least one of these:

- What role does this file/class/function play in the end-to-end quote or prefs pipeline?
- Why does this module exist separately from neighboring modules?
- What other module calls this one, or what downstream layer depends on it?
- What invariant or boundary is being preserved here?
- How does provider-specific behavior get normalized for the rest of the system?
- How does UI-facing state relate back to runtime data or settings?

## What To Avoid

Do not add comments that only restate obvious syntax or local mechanics.

Avoid comments like:

- "Set the variable to true"
- "Loop through the array"
- "Return the result"
- "Create a button"

These make the code noisier without improving understanding.

## Formatting Short Object Literals

Short object literals may be written on one line when the whole expression is
still easy to scan.

Prefer compact one-line objects for:

- constructor and function call arguments
- short `return {}` values
- short standalone assignments

Keep object literals multiline when they contain nested objects or arrays,
multiline callbacks, ternaries that become hard to scan, or otherwise feel
visually dense in context.

Examples:

```js
const provider = new KrakenLiveProvider({uuid, onQuotes});
return {price, quoteDate, previousClose};

return {
    channel: 'ticker',
    data: [{
        symbol: 'BTC/USD',
        last: '104321.50',
    }],
};
```

## Formatting Short Guard Clauses

Short guard clauses may be written on one line when the condition and return
value are still easy to scan.

Prefer compact one-line guards for simple early returns such as:

- `if (!lastRefreshUsec) return true;`
- `if (symbol.trim() === '') return 'Symbol is required.';`
- `if (!quote) return null;`
- `if (left.base === right.base && priorityDifference !== 0) return priorityDifference;`
- `if (liveSymbol === '' || market?.isCanonical !== true || !isHyperliquidSpotSymbol(liveSymbol)) return null;`

Keep guard clauses multiline when the condition is long enough to feel crowded,
when the returned expression is visually dense, or when stacking multiple
one-line guards would make the flow harder to read.

## Formatting Short Function Calls

Short function or method calls may be written on one line when the full call is
still easy to scan, even if they take several simple arguments.

Prefer compact one-line calls for simple argument lists such as:

- `const hour = Number.parseInt(value ?? '', 10);`
- `session.abort();`
- `session.websocket_connect_async(message, null, [], GLib.PRIORITY_DEFAULT, null, callback);`

Keep calls multiline when any argument is structurally dense, when a callback
body is large enough to hide the call shape, or when the compact form makes the
call harder to skim than the expanded version.

## Recommended Comment Shapes

### File-level module comment

Use this for nearly every meaningful JS source file:

```js
/*
 * This module owns ...
 *
 * It sits between ...
 * It is responsible for ...
 * It deliberately does not ...
 */
```

### Exported class comment

Use this for service classes, providers, controllers, and UI classes:

```js
/*
 * This class is the ...
 *
 * It coordinates ...
 * It receives ...
 * It emits/returns ...
 */
```

### Important helper comment

Use this for helpers that represent a policy or system seam:

```js
/* This is where provider data becomes normalized quote state for the rest of the system. */
```

## Repository-Specific Expectation

For this extension, comments should help a reader follow these end-to-end flows:

1. settings/config -> runtime orchestration -> provider fetch/live updates -> quote store -> entry model -> panel indicator
2. prefs page -> ticker dialog controller -> provider-backed search/verification -> saved ticker config

If a file participates in one of those flows, its comments should make that participation explicit.

## When Editing Existing Code

When changing an existing file:

- preserve useful architecture comments already present
- improve weak comments if the file's responsibility becomes clearer
- add missing comments when touching a file that still lacks module/class/function context

Do not treat commenting as optional cleanup. In this repo, architecture comments are part of maintainability.
