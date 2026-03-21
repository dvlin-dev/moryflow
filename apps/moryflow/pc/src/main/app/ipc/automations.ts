import { automationJobSchema, type AutomationJob } from '@moryflow/automations-core';
import {
  automationCreateInputSchema,
  automationJobIdInputSchema,
  automationListRunsInputSchema,
  automationToggleInputSchema,
} from '../../../shared/ipc/automations.js';

type IpcMainLike = {
  handle: (
    channel: string,
    listener: (_event: unknown, payload?: unknown) => unknown | Promise<unknown>
  ) => void;
};

type AutomationsIpcService = {
  listAutomations: () => AutomationJob[];
  getAutomation: (jobId: string) => AutomationJob | null;
  createAutomation: (job: AutomationJob) => AutomationJob;
  updateAutomation: (job: AutomationJob) => AutomationJob;
  deleteAutomation: (jobId: string) => void | Promise<void>;
  toggleAutomation: (jobId: string, enabled: boolean) => AutomationJob;
  runAutomationNow: (jobId: string) => Promise<AutomationJob>;
  listRuns: (input?: { jobId?: string; limit?: number }) => Promise<unknown>;
  deleteAutomationContext: (contextId: string) => void;
  createAutomationContext: (input: { vaultPath: string; title?: string }) => {
    id: string;
    title: string;
  };
  getChatSessionSummary: (sessionId: string) => { id: string; title: string; vaultPath: string };
  ensureApprovedVaultPath: (vaultPath: string) => string;
  generateAutomationId: () => string;
};

const buildJobFromCreateInput = (
  service: AutomationsIpcService,
  payload: ReturnType<typeof automationCreateInputSchema.parse>,
  now: number
): { job: AutomationJob; createdContextId?: string } => {
  let createdContextId: string | undefined;
  const source =
    payload.source.kind === 'conversation-session'
      ? (() => {
          const session = service.getChatSessionSummary(payload.source.sessionId);
          const approvedVaultPath = service.ensureApprovedVaultPath(session.vaultPath);
          return {
            kind: 'conversation-session' as const,
            origin: 'conversation-entry' as const,
            sessionId: session.id,
            vaultPath: approvedVaultPath,
            displayTitle: session.title,
          };
        })()
      : (() => {
          const approvedVaultPath = service.ensureApprovedVaultPath(payload.source.vaultPath);
          const context = service.createAutomationContext({
            vaultPath: approvedVaultPath,
            title: payload.source.displayTitle,
          });
          createdContextId = context.id;
          return {
            kind: 'automation-context' as const,
            origin: 'automations-module' as const,
            contextId: context.id,
            vaultPath: approvedVaultPath,
            displayTitle: context.title,
          };
        })();

  return {
    job: automationJobSchema.parse({
      id: service.generateAutomationId(),
      name: payload.name,
      enabled: payload.enabled,
      source,
      schedule: payload.schedule,
      payload: payload.payload,
      delivery: payload.delivery,
      executionPolicy: payload.executionPolicy,
      state: {},
      createdAt: now,
      updatedAt: now,
    }),
    createdContextId,
  };
};

export const listAutomationsIpc = (service: AutomationsIpcService) => service.listAutomations();

export const getAutomationIpc = (service: AutomationsIpcService, payload?: unknown) => {
  const input = automationJobIdInputSchema.parse(payload ?? {});
  return service.getAutomation(input.jobId);
};

export const createAutomationIpc = (
  service: AutomationsIpcService,
  payload?: unknown,
  now: number = Date.now()
) => {
  const input = automationCreateInputSchema.parse(payload ?? {});
  const built = buildJobFromCreateInput(service, input, now);
  try {
    return service.createAutomation(built.job);
  } catch (error) {
    if (built.createdContextId) {
      service.deleteAutomationContext(built.createdContextId);
    }
    throw error;
  }
};

export const updateAutomationIpc = (service: AutomationsIpcService, payload?: unknown) => {
  const job = automationJobSchema.parse(payload ?? {});
  return service.updateAutomation(job);
};

export const deleteAutomationIpc = (service: AutomationsIpcService, payload?: unknown) => {
  const input = automationJobIdInputSchema.parse(payload ?? {});
  return Promise.resolve(service.deleteAutomation(input.jobId)).then(() => ({ ok: true }));
};

export const toggleAutomationIpc = (service: AutomationsIpcService, payload?: unknown) => {
  const input = automationToggleInputSchema.parse(payload ?? {});
  return service.toggleAutomation(input.jobId, input.enabled);
};

export const runAutomationNowIpc = (service: AutomationsIpcService, payload?: unknown) => {
  const input = automationJobIdInputSchema.parse(payload ?? {});
  return service.runAutomationNow(input.jobId);
};

export const listAutomationRunsIpc = (service: AutomationsIpcService, payload?: unknown) => {
  const input = automationListRunsInputSchema.parse(payload ?? {});
  return service.listRuns(input);
};

export const registerAutomationsIpcHandlers = (
  ipcMain: IpcMainLike,
  service: AutomationsIpcService
) => {
  ipcMain.handle('automations:list', () => listAutomationsIpc(service));
  ipcMain.handle('automations:get', (_event, payload) => getAutomationIpc(service, payload));
  ipcMain.handle('automations:create', (_event, payload) => createAutomationIpc(service, payload));
  ipcMain.handle('automations:update', (_event, payload) => updateAutomationIpc(service, payload));
  ipcMain.handle('automations:delete', (_event, payload) => deleteAutomationIpc(service, payload));
  ipcMain.handle('automations:toggle', (_event, payload) => toggleAutomationIpc(service, payload));
  ipcMain.handle('automations:runNow', (_event, payload) => runAutomationNowIpc(service, payload));
  ipcMain.handle('automations:listRuns', (_event, payload) =>
    listAutomationRunsIpc(service, payload)
  );
};
