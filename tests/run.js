import {runTests as runEntryModelTests} from './entry-model.test.js';
import {runTests as runDisplaySettingsTests} from './display-settings.test.js';
import {runTests as runHyperliquidAdapterTests} from './hyperliquid-adapter.test.js';
import {runTests as runIndicatorDensityTests} from './indicator-density.test.js';
import {runTests as runKrakenAdapterTests} from './kraken-adapter.test.js';
import {runTests as runLiveWebsocketProviderTests} from './live-websocket-provider.test.js';
import {runTests as runLiveProvidersTests} from './live-providers.test.js';
import {runTests as runMarketScheduleTests} from './market-schedule.test.js';
import {runTests as runQuotesTests} from './quotes.test.js';
import {runTests as runQuotesCoordinatorTests} from './quotes-coordinator.test.js';
import {runTests as runCnbcTests} from './cnbc.test.js';
import {runTests as runRestQuotesTests} from './rest-quotes.test.js';
import {runTests as runTickerConfigTests} from './ticker-config.test.js';
import {runTests as runTickerDialogStateTests} from './ticker-dialog-state.test.js';

const suites = [
    ['market-schedule', runMarketScheduleTests],
    ['display-settings', runDisplaySettingsTests],
    ['indicator-density', runIndicatorDensityTests],
    ['entry-model', runEntryModelTests],
    ['live-websocket-provider', runLiveWebsocketProviderTests],
    ['live-providers', runLiveProvidersTests],
    ['kraken-adapter', runKrakenAdapterTests],
    ['hyperliquid-adapter', runHyperliquidAdapterTests],
    ['cnbc', runCnbcTests],
    ['rest-quotes', runRestQuotesTests],
    ['quotes', runQuotesTests],
    ['quotes-coordinator', runQuotesCoordinatorTests],
    ['ticker-config', runTickerConfigTests],
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
