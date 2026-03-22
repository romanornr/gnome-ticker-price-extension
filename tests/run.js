import {runTests as runEntryModelTests} from './entry-model.test.js';
import {runTests as runMarketScheduleTests} from './market-schedule.test.js';
import {runTests as runQuotesCoordinatorTests} from './quotes-coordinator.test.js';
import {runTests as runTickerDialogStateTests} from './ticker-dialog-state.test.js';

const suites = [
    ['market-schedule', runMarketScheduleTests],
    ['entry-model', runEntryModelTests],
    ['quotes-coordinator', runQuotesCoordinatorTests],
    ['ticker-dialog-state', runTickerDialogStateTests],
];

let failureCount = 0;

for (const [name, runTests] of suites) {
    try {
        await runTests();
        print(`PASS ${name}`);
    } catch (error) {
        failureCount += 1;
        printerr(`FAIL ${name}: ${error.message}`);
    }
}

if (failureCount > 0)
    throw new Error(`${failureCount} test suite(s) failed.`);

print(`PASS all ${suites.length} suites`);
