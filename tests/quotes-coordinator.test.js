import GLib from 'gi://GLib';

import {QuotesCoordinator} from '../services/quotes-coordinator.js';
import {STALE_TEXT_COLOR} from '../utils/format.js';
import {assertDeepEqual, assertEqual} from './support/assert.js';

export async function runTests() {
    await testEntryAndFlashTiming();
    await testDirectRestRetryBackoffAndReset();
    await testRefreshSingleFlightMergesForcedScope();
    await testNetworkRecoveryRequestsForcedRefresh();
    await testRoutineNetworkChangeDoesNotTriggerRecovery();
    testStopClearsTimersAndNetworkSubscription();
    await testStopDuringRefreshPreventsQueuedWorkAndLateRetry();
}

async function testEntryAndFlashTiming() {
    let refreshCalls = 0;
    let rebuildCalls = 0;
    let flashResetCalls = 0;

    const coordinator = new QuotesCoordinator({
        onRefresh: async () => {
            refreshCalls += 1;
        },
        onRebuildEntries: async () => {
            rebuildCalls += 1;
        },
        onResetPriceFlash: () => {
            flashResetCalls += 1;
        },
    });

    coordinator.requestEntriesUpdate(true);
    await waitFor(5);
    assertEqual(rebuildCalls, 1, 'Immediate entry updates should rebuild once');

    coordinator.schedulePriceFlashReset([{
        label: 'BTC',
        priceColor: '#3FB950',
        priceFlash: true,
    }]);
    await waitFor(800);
    assertEqual(flashResetCalls, 1, 'Price flash reset should fire once after the timeout');

    coordinator.schedulePriceFlashReset([{
        label: 'SPX',
        priceColor: STALE_TEXT_COLOR,
        priceFlash: false,
    }]);
    await waitFor(800);
    assertEqual(flashResetCalls, 1, 'Stale quote color should not be treated as a price flash');

    coordinator.stop();
    assertEqual(refreshCalls, 0, 'Coordinator should not trigger refresh without a scheduled timer');
}

async function testDirectRestRetryBackoffAndReset() {
    const outcomes = [false, false, true];
    const coordinator = new QuotesCoordinator({
        onRefresh: async () => outcomes.shift(),
        networkMonitor: new FakeNetworkMonitor(),
    });
    coordinator.scheduleRefreshTimer(10);

    coordinator.requestRefresh(false);
    await waitFor(5);
    assertEqual(coordinator._restRetryAttempt, 1,
        'A rejected direct REST pass should arm the first retry rung');
    assertEqual(coordinator._restRetryTimeoutId !== 0, true,
        'A rejected direct REST pass should leave a live retry source');

    GLib.Source.remove(coordinator._restRetryTimeoutId);
    coordinator._restRetryTimeoutId = 0;
    coordinator.requestRefresh(true);
    await waitFor(5);
    assertEqual(coordinator._restRetryAttempt, 1,
        'The second exponential rung should stop at the configured base cadence');
    assertEqual(coordinator._restRetryTimeoutId, 0,
        'A retry equal to base cadence should not arm a redundant fast source');

    coordinator.requestRefresh(true);
    await waitFor(5);
    assertEqual(coordinator._restRetryAttempt, 0,
        'A fulfilled direct REST pass should reset retry backoff');
    assertEqual(coordinator._restRetryTimeoutId, 0,
        'A fulfilled direct REST pass should leave no fast retry source');
    coordinator.stop();
}

async function testRefreshSingleFlightMergesForcedScope() {
    const refreshScopes = [];
    let finishFirstRefresh = null;
    const firstRefresh = new Promise(resolve => {
        finishFirstRefresh = resolve;
    });
    const coordinator = new QuotesCoordinator({
        onRefresh: async forced => {
            refreshScopes.push(forced);
            if (refreshScopes.length === 1)
                await firstRefresh;
            return true;
        },
        networkMonitor: new FakeNetworkMonitor(),
    });
    coordinator.scheduleRefreshTimer(60);

    coordinator.requestRefresh(false);
    coordinator.requestRefresh(false);
    coordinator.requestRefresh(true);
    assertEqual(refreshScopes.length, 1,
        'Refresh requests should not overlap an in-flight pass');

    finishFirstRefresh();
    await waitFor(5);
    assertDeepEqual(refreshScopes, [false, true],
        'Queued refresh requests should coalesce once with forced scope winning');
    coordinator.stop();
}

async function testNetworkRecoveryRequestsForcedRefresh() {
    const networkMonitor = new FakeNetworkMonitor();
    const refreshScopes = [];
    let reconnectCalls = 0;
    const coordinator = new QuotesCoordinator({
        onRefresh: async forced => {
            refreshScopes.push(forced);
            return null;
        },
        onReconnectLiveProviders: () => {
            reconnectCalls += 1;
        },
        networkMonitor,
    });
    coordinator.scheduleRefreshTimer(60);
    coordinator._scheduleRestRetry();
    const retryAttempt = coordinator._restRetryAttempt;
    const retryTimeoutId = coordinator._restRetryTimeoutId;

    networkMonitor.emit(false);
    assertEqual(refreshScopes.length, 0,
        'Unavailable network state should not suppress or invent refresh work');
    assertEqual(coordinator._restRetryAttempt, retryAttempt,
        'Unavailable network state should preserve the current retry rung');
    assertEqual(coordinator._restRetryTimeoutId, retryTimeoutId,
        'Unavailable network state should preserve an already-armed retry source');

    networkMonitor.emit(true);
    await waitFor(5);
    assertEqual(coordinator._restRetryAttempt, 0,
        'Restored network availability should reset REST backoff');
    assertEqual(reconnectCalls, 1,
        'Restored network availability should ask live providers to reconnect once');
    assertDeepEqual(refreshScopes, [true],
        'Restored network availability should request one forced refresh');
    coordinator.stop();
}

/* Route and VPN changes emit network-changed while already available; only an outage edge is recovery. */
async function testRoutineNetworkChangeDoesNotTriggerRecovery() {
    const networkMonitor = new FakeNetworkMonitor(true);
    const refreshScopes = [];
    let reconnectCalls = 0;
    const coordinator = new QuotesCoordinator({
        onRefresh: async forced => {
            refreshScopes.push(forced);
            return null;
        },
        onReconnectLiveProviders: () => {
            reconnectCalls += 1;
        },
        networkMonitor,
    });
    coordinator.scheduleRefreshTimer(60);
    coordinator._scheduleRestRetry();
    const retryAttempt = coordinator._restRetryAttempt;

    networkMonitor.emit(true);
    networkMonitor.emit(true);
    await waitFor(5);

    assertEqual(reconnectCalls, 0,
        'Reconfiguration while already available should not tear down healthy sockets');
    assertEqual(refreshScopes.length, 0,
        'Reconfiguration while already available should not force a refresh');
    assertEqual(coordinator._restRetryAttempt, retryAttempt,
        'Reconfiguration while already available should preserve the retry rung');
    coordinator.stop();
}

function testStopClearsTimersAndNetworkSubscription() {
    const networkMonitor = new FakeNetworkMonitor();
    const coordinator = new QuotesCoordinator({
        onRefresh: async () => false,
        networkMonitor,
    });
    coordinator.scheduleRefreshTimer(60);
    coordinator.scheduleRefreshTimer(60);
    coordinator._scheduleRestRetry();
    coordinator._lastEntriesUpdateUsec = GLib.get_monotonic_time();
    coordinator.requestEntriesUpdate(false);
    coordinator.schedulePriceFlashReset([{priceFlash: true}]);

    coordinator.stop();

    assertEqual(coordinator._active, false,
        'Coordinator stop should mark recovery callbacks inactive');
    assertEqual(coordinator._refreshTimeoutId, 0,
        'Coordinator stop should remove the base refresh source');
    assertEqual(coordinator._restRetryTimeoutId, 0,
        'Coordinator stop should remove the REST retry source');
    assertEqual(coordinator._entriesUpdateTimeoutId, 0,
        'Coordinator stop should remove throttled entry-update sources');
    assertEqual(coordinator._priceFlashTimeoutId, 0,
        'Coordinator stop should remove price-flash sources');
    assertEqual(networkMonitor.disconnectCalls, 1,
        'Coordinator stop should disconnect its network monitor subscription');
    assertEqual(networkMonitor.connectCalls, 1,
        'Rescheduling the base timer should keep one network monitor subscription');
}

async function testStopDuringRefreshPreventsQueuedWorkAndLateRetry() {
    const networkMonitor = new FakeNetworkMonitor();
    let refreshCalls = 0;
    let finishRefresh = null;
    const refreshOutcome = new Promise(resolve => {
        finishRefresh = resolve;
    });
    const coordinator = new QuotesCoordinator({
        onRefresh: () => {
            refreshCalls += 1;
            return refreshOutcome;
        },
        networkMonitor,
    });
    coordinator.scheduleRefreshTimer(60);
    coordinator.requestRefresh(false);
    coordinator.requestRefresh(true);

    coordinator.stop();
    finishRefresh(false);
    await waitFor(5);

    assertEqual(refreshCalls, 1,
        'Stopping an in-flight refresh should discard its queued forced follow-up');
    assertEqual(coordinator._restRetryTimeoutId, 0,
        'A rejection completing after stop should not resurrect the retry timer');
    assertEqual(coordinator._networkMonitorSignalId, 0,
        'A refresh completing after stop should leave the monitor disconnected');
}

class FakeNetworkMonitor {
    constructor(available = true) {
        this.handler = null;
        this.available = available;
        this.connectCalls = 0;
        this.disconnectCalls = 0;
    }

    get_network_available() {
        return this.available;
    }

    connect(_signal, handler) {
        this.connectCalls += 1;
        this.handler = handler;
        return 1;
    }

    disconnect(signalId) {
        if (signalId === 1)
            this.disconnectCalls += 1;
        this.handler = null;
    }

    emit(available) {
        this.handler?.(this, available);
    }
}

function waitFor(milliseconds) {
    return new Promise(resolve => {
        GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            milliseconds,
            () => {
                resolve();
                return GLib.SOURCE_REMOVE;
            }
        );
    });
}
