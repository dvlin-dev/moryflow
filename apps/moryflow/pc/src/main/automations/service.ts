import { app, powerMonitor } from 'electron';
import { getRuntime } from '../chat/runtime.js';
import { chatSessionStore } from '../chat-session-store/index.js';
import { getVaultByPath } from '../vault/store.js';
import { syncPersistedConversationUiState } from '../chat/persisted-session-sync.js';
import { telegramChannelService } from '../channels/telegram/index.js';
import { createAutomationContextStore } from './context-store.js';
import { createAutomationDelivery } from './delivery.js';
import { createAutomationEndpointsService } from './endpoints.js';
import { createAutomationRunLogStore } from './run-log.js';
import { createAutomationRunner } from './runner.js';
import { createAutomationScheduler } from './scheduler.js';
import { createAutomationService } from './service-core.js';
import { createAutomationStore } from './store.js';

const automationStore = createAutomationStore();
const automationContextStore = createAutomationContextStore();
const automationRunLogStore = createAutomationRunLogStore({
  getUserDataPath: () => app.getPath('userData'),
});

const runner = createAutomationRunner({
  runtime: getRuntime(),
  chatSessionStore,
  contextStore: automationContextStore,
});

const delivery = createAutomationDelivery({
  store: automationStore,
  chatSessionStore,
  syncConversationUiState: syncPersistedConversationUiState,
  telegram: telegramChannelService,
});

const endpointsService = createAutomationEndpointsService({
  store: automationStore,
  telegram: telegramChannelService,
});

export type { AutomationService } from './service-core.js';

export const automationService = createAutomationService({
  store: automationStore,
  contextStore: automationContextStore,
  runLogStore: automationRunLogStore,
  runner,
  delivery,
  endpointsService,
  createScheduler: (schedulerRunner) =>
    createAutomationScheduler({
      store: automationStore,
      runner: schedulerRunner,
      powerMonitor: powerMonitor as unknown as {
        on: (event: string, listener: () => void) => unknown;
        off: (event: string, listener: () => void) => unknown;
      },
    }),
  chatSessions: chatSessionStore,
  resolveApprovedVaultPath: (vaultPath) => getVaultByPath(vaultPath)?.path ?? null,
});
