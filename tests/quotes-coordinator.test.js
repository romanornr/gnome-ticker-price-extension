import GLib from 'gi://GLib';

import {QuotesCoordinator} from '../services/quotes-coordinator.js';
import {assertEqual} from './support/assert.js';

export async function runTests() {
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
    }]);
    await waitFor(800);
    assertEqual(flashResetCalls, 1, 'Price flash reset should fire once after the timeout');

    coordinator.stop();
    assertEqual(refreshCalls, 0, 'Coordinator should not trigger refresh without a scheduled timer');
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
