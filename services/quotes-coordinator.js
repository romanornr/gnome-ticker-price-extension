import GLib from 'gi://GLib';

import {clearPriceFlash} from './entry-model.js';
const CRYPTO_UI_UPDATE_INTERVAL_SECONDS = 4;
const PRICE_FLASH_DURATION_MS = 700;

/*
 * QuotesCoordinator owns timing and pacing for the quote pipeline.
 *
 * QuotesService decides what the system should do; this coordinator decides
 * when it should happen:
 * - base refresh timer cadence
 * - throttled entry rebuilds for live crypto updates
 * - delayed reset of the temporary price-flash highlight
 *
 * Keeping these timers here prevents timing concerns from being mixed into the
 * higher-level orchestration and provider logic.
 */
export class QuotesCoordinator {
    /* The coordinator is created with callbacks so QuotesService can supply policy without re-owning timers. */
    constructor({onRefresh, onRebuildEntries, onResetPriceFlash}) {
        this._onRefresh = onRefresh;
        this._onRebuildEntries = onRebuildEntries;
        this._onResetPriceFlash = onResetPriceFlash;
        this._refreshTimeoutId = 0;
        this._entriesUpdateTimeoutId = 0;
        this._entriesUpdateInProgress = false;
        this._entriesUpdateQueued = false;
        this._lastEntriesUpdateUsec = 0;
        this._priceFlashTimeoutId = 0;
    }

    /* stop() is the single timer cleanup point for the entire timing subsystem. */
    stop() {
        this._refreshTimeoutId = removeTimeout(this._refreshTimeoutId);
        this._entriesUpdateTimeoutId = removeTimeout(this._entriesUpdateTimeoutId);
        this._priceFlashTimeoutId = removeTimeout(this._priceFlashTimeoutId);
        this._entriesUpdateInProgress = false;
        this._entriesUpdateQueued = false;
        this._lastEntriesUpdateUsec = 0;
    }

    /* The base refresh timer drives the normal polling cadence independently from UI rebuild throttling. */
    scheduleRefreshTimer(refreshIntervalSeconds) {
        this._refreshTimeoutId = removeTimeout(this._refreshTimeoutId);
        this._refreshTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            refreshIntervalSeconds,
            () => {
                void this._onRefresh?.();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    /* Live updates may arrive faster than the panel should redraw, so rebuild requests are coalesced here. */
    requestEntriesUpdate(immediate = false) {
        if (this._entriesUpdateInProgress) {
            this._entriesUpdateQueued = true;
            return;
        }

        if (immediate) {
            this._entriesUpdateTimeoutId = removeTimeout(this._entriesUpdateTimeoutId);
            void this._runEntriesUpdate();
            return;
        }

        const elapsedSeconds = (GLib.get_monotonic_time() - this._lastEntriesUpdateUsec) / 1_000_000;
        if (this._lastEntriesUpdateUsec === 0 || elapsedSeconds >= CRYPTO_UI_UPDATE_INTERVAL_SECONDS) {
            void this._runEntriesUpdate();
            return;
        }

        if (this._entriesUpdateTimeoutId !== 0)
            return;

        const remainingMs = Math.max(1, Math.round((CRYPTO_UI_UPDATE_INTERVAL_SECONDS - elapsedSeconds) * 1000));

        this._entriesUpdateTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            remainingMs,
            () => {
                this._entriesUpdateTimeoutId = 0;
                void this._runEntriesUpdate();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    /* Price flash reset is managed separately so rebuild timing and flash timing do not interfere. */
    schedulePriceFlashReset(entries) {
        this._priceFlashTimeoutId = removeTimeout(this._priceFlashTimeoutId);

        if (!entries.some(entry => entry.priceFlash))
            return;

        this._priceFlashTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            PRICE_FLASH_DURATION_MS,
            () => {
                this._priceFlashTimeoutId = 0;
                this._onResetPriceFlash?.(clearPriceFlash(entries));
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    /* The queued/in-progress bookkeeping ensures bursty live updates collapse into a stable rebuild sequence. */
    async _runEntriesUpdate() {
        if (this._entriesUpdateInProgress)
            return;

        this._entriesUpdateInProgress = true;

        try {
            await this._onRebuildEntries?.();
            this._lastEntriesUpdateUsec = GLib.get_monotonic_time();
        } finally {
            this._entriesUpdateInProgress = false;

            if (!this._entriesUpdateQueued)
                return;

            this._entriesUpdateQueued = false;
            this.requestEntriesUpdate(false);
        }
    }
}

/* Timeout removal is centralized so all coordinator timers share the same cleanup semantics. */
function removeTimeout(sourceId) {
    if (sourceId === 0)
        return 0;

    GLib.Source.remove(sourceId);
    return 0;
}
