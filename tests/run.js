import {runTests as runEntryModelTests} from './entry-model.test.js';
import {runTests as runDisplaySettingsTests} from './display-settings.test.js';
import {runTests as runHyperliquidAdapterTests} from './hyperliquid-adapter.test.js';
import {runTests as runKrakenAdapterTests} from './kraken-adapter.test.js';
import {runTests as runLiveQuoteProviderTests} from './live-quote-provider.test.js';
import {runTests as runLiveWebsocketProviderTests} from './live-websocket-provider.test.js';
import {runTests as runLiveProvidersTests} from './live-providers.test.js';
import {runTests as runMarketScheduleTests} from './market-schedule.test.js';
import {runTests as runQuotesTests} from './quotes.test.js';
import {runTests as runQuotesCoordinatorTests} from './quotes-coordinator.test.js';
import {runTests as runRuntimeProviderRegistryTests} from './runtime-provider-registry.test.js';
import {runTests as runStooqTests} from './stooq.test.js';
import {runTests as runTickerConfigTests} from './ticker-config.test.js';
import {runTests as runTickerDialogStateTests} from './ticker-dialog-state.test.js';

const suites = [
    ['market-schedule', runMarketScheduleTests],
    ['display-settings', runDisplaySettingsTests],
    ['entry-model', runEntryModelTests],
    ['live-quote-provider', runLiveQuoteProviderTests],
    ['live-websocket-provider', runLiveWebsocketProviderTests],
    ['live-providers', runLiveProvidersTests],
    ['kraken-adapter', runKrakenAdapterTests],
    ['hyperliquid-adapter', runHyperliquidAdapterTests],
    ['runtime-provider-registry', runRuntimeProviderRegistryTests],
    ['stooq', runStooqTests],
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
