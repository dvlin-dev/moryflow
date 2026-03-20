import { randomUUID } from 'node:crypto';
import {
  automationContextRecordSchema,
  automationJobSchema,
  type AutomationContextRecord,
  type AutomationEndpoint,
  type AutomationJob,
} from '@moryflow/automations-core';
import type { AutomationContextStore } from './context-store.js';
import type { AutomationDelivery } from './delivery.js';
import type { AutomationEndpointsService } from './endpoints.js';
import type { AutomationRunLogStore } from './run-log.js';
import type { AutomationRunner } from './runner.js';
import type { AutomationScheduler } from './scheduler.js';
import type { AutomationStore } from './store.js';

type ChatSessionSummaryLookup = {
  getSummary: (sessionId: string) => { id: string; vaultPath: string };
};

export type CreateAutomationServiceInput = {
  store: AutomationStore;
  contextStore: AutomationContextStore;
  runLogStore: AutomationRunLogStore;
  runner: AutomationRunner;
  delivery: AutomationDelivery;
  endpointsService: AutomationEndpointsService;
  createScheduler: (runner: Pick<AutomationRunner, 'runAutomationTurn'>) => AutomationScheduler;
  chatSessions: ChatSessionSummaryLookup;
  resolveApprovedVaultPath?: (vaultPath: string) => string | null;
  now?: () => number;
  generateAutomationId?: () => string;
};

const normalizeJobForSave = (job: AutomationJob, now: number): AutomationJob =>
  automationJobSchema.parse({
    ...job,
    updatedAt: now,
  });

const countEndpointReferences = (jobs: AutomationJob[], endpointId: string): number => {
  return jobs.filter((job) => {
    if (job.delivery.mode !== 'push') {
      return false;
    }
    return job.delivery.endpointId === endpointId || job.delivery.failureEndpointId === endpointId;
  }).length;
};

export const createAutomationService = (input: CreateAutomationServiceInput) => {
  const now = input.now ?? (() => Date.now());
  const generateAutomationId = input.generateAutomationId ?? (() => randomUUID());
  const resolveApprovedVaultPath = input.resolveApprovedVaultPath;

  const ensureApprovedVaultPath = (vaultPath: string): string => {
    const normalized = vaultPath.trim();
    if (!normalized) {
      throw new Error('No workspace selected.');
    }
    if (!resolveApprovedVaultPath) {
      return normalized;
    }
    const approved = resolveApprovedVaultPath(normalized);
    if (!approved) {
      throw new Error('Workspace is not approved.');
    }
    return approved;
  };

  const ensureEndpointReady = (job: AutomationJob) => {
    if (job.delivery.mode !== 'push') {
      return;
    }
    const endpoint = input.store.getEndpoint(job.delivery.endpointId);
    if (!endpoint) {
      throw new Error('Automation delivery endpoint not found.');
    }
    if (!endpoint.verifiedAt) {
      throw new Error('Automation delivery endpoint is not verified.');
    }
  };

  const ensureSourceExists = (job: AutomationJob) => {
    if (job.source.kind === 'conversation-session') {
      input.chatSessions.getSummary(job.source.sessionId);
      return;
    }
    const context = input.contextStore.get(job.source.contextId);
    if (!context) {
      throw new Error('Automation context not found.');
    }
  };

  const runJobOnce = async (job: AutomationJob) => {
    const runnerResult = await input.runner.runAutomationTurn(job);
    let nextState: AutomationJob['state'] = {
      ...runnerResult.nextState,
      lastDeliveryStatus: 'not-requested',
      lastDeliveryError: undefined,
    };

    if (job.delivery.mode === 'push') {
      try {
        const deliveryResult = await input.delivery.deliver(job, runnerResult.outputText);
        nextState = {
          ...nextState,
          lastDeliveryStatus: deliveryResult.deliveryStatus,
          lastDeliveryError: deliveryResult.localSyncError,
        };
      } catch (error) {
        nextState = {
          ...nextState,
          lastDeliveryStatus: 'not-delivered',
          lastDeliveryError: error instanceof Error ? error.message : String(error),
        };
      }
    }

    await input.runLogStore.append(runnerResult.runRecord);
    return {
      ...runnerResult,
      nextState,
    };
  };

  const scheduler = input.createScheduler({
    runAutomationTurn: runJobOnce,
  });

  let initialized = false;

  return {
    init(): void {
      if (initialized) {
        return;
      }
      scheduler.init();
      initialized = true;
    },

    shutdown(): void {
      scheduler.shutdown();
      initialized = false;
    },

    listAutomations(): AutomationJob[] {
      return input.store.listJobs();
    },

    getAutomation(jobId: string): AutomationJob | null {
      return input.store.getJob(jobId);
    },

    createAutomation(job: AutomationJob): AutomationJob {
      ensureSourceExists(job);
      ensureEndpointReady(job);
      const timestamp = now();
      const parsed = normalizeJobForSave(job, timestamp);
      if (input.store.getJob(parsed.id)) {
        throw new Error('Automation already exists.');
      }
      return input.store.saveJob(parsed);
    },

    updateAutomation(job: AutomationJob): AutomationJob {
      ensureSourceExists(job);
      ensureEndpointReady(job);
      if (!input.store.getJob(job.id)) {
        throw new Error('Automation not found.');
      }
      return input.store.saveJob(normalizeJobForSave(job, now()));
    },

    async deleteAutomation(jobId: string): Promise<void> {
      const job = input.store.getJob(jobId);
      await input.runLogStore.removeJobLogs(jobId);
      if (job?.source.kind === 'automation-context') {
        input.contextStore.remove(job.source.contextId);
      }
      input.store.removeJob(jobId);
    },

    toggleAutomation(jobId: string, enabled: boolean): AutomationJob {
      const job = input.store.getJob(jobId);
      if (!job) {
        throw new Error('Automation not found.');
      }
      const next = normalizeJobForSave(
        {
          ...job,
          enabled,
        },
        now()
      );
      return input.store.saveJob(next);
    },

    async runAutomationNow(jobId: string): Promise<AutomationJob> {
      const job = input.store.getJob(jobId);
      if (!job) {
        throw new Error('Automation not found.');
      }
      const result = await runJobOnce(job);
      return input.store.saveJob(
        normalizeJobForSave(
          {
            ...job,
            state: {
              ...job.state,
              ...result.nextState,
              runningAt: undefined,
            },
          },
          now()
        )
      );
    },

    listRuns(inputValue?: { jobId?: string; limit?: number }) {
      return input.runLogStore.listRecent(inputValue ?? {});
    },

    listEndpoints(): AutomationEndpoint[] {
      return input.endpointsService.listEndpoints();
    },

    getEndpoint(endpointId: string): AutomationEndpoint | null {
      return input.endpointsService.getEndpoint(endpointId);
    },

    bindEndpoint(inputValue: Parameters<typeof input.endpointsService.bindEndpoint>[0]) {
      return input.endpointsService.bindEndpoint(inputValue);
    },

    updateEndpoint(inputValue: Parameters<typeof input.endpointsService.updateEndpoint>[0]) {
      return input.endpointsService.updateEndpoint(inputValue);
    },

    removeEndpoint(endpointId: string): void {
      const references = countEndpointReferences(input.store.listJobs(), endpointId);
      if (references > 0) {
        const noun = references === 1 ? 'automation' : 'automations';
        throw new Error(`Automation endpoint is still used by ${references} ${noun}.`);
      }
      input.endpointsService.removeEndpoint(endpointId);
    },

    setDefaultEndpoint(endpointId?: string): void {
      input.endpointsService.setDefaultEndpoint(endpointId);
    },

    getDefaultEndpoint(): AutomationEndpoint | null {
      return input.store.getDefaultEndpoint();
    },

    createAutomationContext(inputValue: {
      vaultPath: string;
      title?: string;
    }): AutomationContextRecord {
      return input.contextStore.create({
        vaultPath: ensureApprovedVaultPath(inputValue.vaultPath),
        title: inputValue.title?.trim() || 'New automation',
      });
    },

    getChatSessionSummary(sessionId: string) {
      return input.chatSessions.getSummary(sessionId);
    },

    ensureApprovedVaultPath(vaultPath: string): string {
      return ensureApprovedVaultPath(vaultPath);
    },

    deleteAutomationContext(contextId: string): void {
      input.contextStore.remove(contextId);
    },

    getAutomationContext(contextId: string): AutomationContextRecord | null {
      return input.contextStore.get(contextId);
    },

    ensureAutomationContextRecord(inputValue: AutomationContextRecord): AutomationContextRecord {
      return automationContextRecordSchema.parse(inputValue);
    },

    buildModuleSource(inputValue: {
      vaultPath: string;
      displayTitle?: string;
    }): AutomationJob['source'] {
      const context = input.contextStore.create({
        vaultPath: ensureApprovedVaultPath(inputValue.vaultPath),
        title: inputValue.displayTitle?.trim() || 'New automation',
      });
      return {
        kind: 'automation-context',
        origin: 'automations-module',
        vaultPath: context.vaultPath,
        displayTitle: context.title,
        contextId: context.id,
      };
    },

    generateAutomationId(): string {
      return generateAutomationId();
    },
  };
};

export type AutomationService = ReturnType<typeof createAutomationService>;
