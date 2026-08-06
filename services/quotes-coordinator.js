import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {clearPriceFlash} from './entry-model.js';
const CRYPTO_UI_UPDATE_INTERVAL_SECONDS = 4;
const PRICE_FLASH_DURATION_MS = 700;
const REST_RETRY_INITIAL_SECONDS = 5;

/*
 * QuotesCoordinator owns timing and pacing for the quote pipeline.
 *
 * It coalesces refresh and entry-update work, owns retry and display timers,
 * and translates restored network availability into one recovery attempt.
 */
export class QuotesCoordinator {
    /* The coordinator is created with callbacks so QuotesService can supply policy without re-owning timers. */
    constructor({
        onRefresh,
        onReconnectLiveProviders,
        onRebuildEntries,
        onResetPriceFlash,
        networkMonitor = Gio.NetworkMonitor.get_default(),
    }) {
        this._onRefresh = onRefresh;
        this._onReconnectLiveProviders = onReconnectLiveProviders;
        this._onRebuildEntries = onRebuildEntries;
        this._onResetPriceFlash = onResetPriceFlash;
        this._networkMonitor = networkMonitor;
        this._networkMonitorSignalId = 0;
        this._networkAvailable = false;
        this._active = false;
        this._refreshTimeoutId = 0;
        this._refreshInProgress = false;
        this._refreshQueued = null;
        this._refreshIntervalSeconds = 0;
        this._restRetryTimeoutId = 0;
        this._restRetryAttempt = 0;
        this._entriesUpdateTimeoutId = 0;
        this._entriesUpdateInProgress = false;
        this._entriesUpdateQueued = false;
        this._lastEntriesUpdateUsec = 0;
        this._priceFlashTimeoutId = 0;
    }

    /* stop() is the single timer cleanup point for the entire timing subsystem. */
    stop() {
        this._active = false;
        this._refreshTimeoutId = removeTimeout(this._refreshTimeoutId);
        this._restRetryTimeoutId = removeTimeout(this._restRetryTimeoutId);
        this._entriesUpdateTimeoutId = removeTimeout(this._entriesUpdateTimeoutId);
        this._priceFlashTimeoutId = removeTimeout(this._priceFlashTimeoutId);
        if (this._networkMonitorSignalId !== 0)
            this._networkMonitor.disconnect(this._networkMonitorSignalId);
        this._networkMonitorSignalId = 0;
        this._refreshInProgress = false;
        this._refreshQueued = null;
        this._restRetryAttempt = 0;
        this._entriesUpdateInProgress = false;
        this._entriesUpdateQueued = false;
        this._lastEntriesUpdateUsec = 0;
    }

    /*
     * The base refresh timer drives the normal polling cadence independently from UI rebuild throttling.
     * This is also what activates the coordinator: refresh requests and network recovery no-op until it runs.
     */
    scheduleRefreshTimer(refreshIntervalSeconds) {
        this._active = true;
        this._refreshIntervalSeconds = refreshIntervalSeconds;
        if (this._networkMonitorSignalId === 0) {
            this._networkAvailable = this._networkMonitor.get_network_available();
            this._networkMonitorSignalId = this._networkMonitor.connect(
                'network-changed',
                (_monitor, available) => this._handleNetworkChanged(available)
            );
        }
        this._refreshTimeoutId = removeTimeout(this._refreshTimeoutId);
        this._refreshTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            refreshIntervalSeconds,
            () => {
                this.requestRefresh(false);
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    /* Refresh requests share the entry-update single-flight shape; a queued forced pass wins on merge. */
    requestRefresh(forced = false) {
        if (!this._active)
            return;

        if (this._refreshInProgress) {
            this._refreshQueued = this._refreshQueued === true || forced;
            return;
        }

        void this._runRefresh(forced);
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

    async _runRefresh(forced) {
        if (this._refreshInProgress)
            return;

        this._refreshInProgress = true;

        try {
            const directRestOutcome = await this._onRefresh?.(forced);
            if (this._active && directRestOutcome === true)
                this._resetRestRetry();
            else if (this._active && directRestOutcome === false)
                this._scheduleRestRetry();
        } catch (error) {
            logError(error, 'Ticker Tape: refresh pass failed');
        } finally {
            this._refreshInProgress = false;
        }

        if (!this._active || this._refreshQueued === null)
            return;

        const queuedForced = this._refreshQueued;
        this._refreshQueued = null;
        this.requestRefresh(queuedForced);
    }

    /* Only a rejected direct REST poll advances the bounded fast-retry ladder. */
    _scheduleRestRetry() {
        if (!this._active || this._restRetryTimeoutId !== 0)
            return;

        const delaySeconds = REST_RETRY_INITIAL_SECONDS * 2 ** this._restRetryAttempt;
        if (delaySeconds >= this._refreshIntervalSeconds)
            return;

        this._restRetryAttempt += 1;
        this._restRetryTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            delaySeconds,
            () => {
                this._restRetryTimeoutId = 0;
                this.requestRefresh(true);
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    _resetRestRetry() {
        this._restRetryTimeoutId = removeTimeout(this._restRetryTimeoutId);
        this._restRetryAttempt = 0;
    }

    /*
     * Link restoration permits one immediate recovery attempt without declaring the providers healthy.
     * network-changed also fires for routine reconfiguration, so only a false-to-true edge is recovery;
     * reacting to every available event would tear down healthy sockets whenever a route or VPN changed.
     */
    _handleNetworkChanged(available) {
        const restored = available && !this._networkAvailable;
        this._networkAvailable = available;
        if (!this._active || !restored)
            return;

        this._resetRestRetry();
        this._onReconnectLiveProviders?.();
        this.requestRefresh(true);
    }
}

/* Timeout removal is centralized so all coordinator timers share the same cleanup semantics. */
function removeTimeout(sourceId) {
    if (sourceId === 0)
        return 0;

    GLib.Source.remove(sourceId);
    return 0;
}
