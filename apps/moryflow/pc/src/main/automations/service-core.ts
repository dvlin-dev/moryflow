import { randomUUID } from 'node:crypto';
import {
  automationContextRecordSchema,
  automationJobSchema,
  type AutomationContextRecord,
  type AutomationJob,
} from '@moryflow/automations-core';
import type { AutomationContextStore } from './context-store.js';
import type { AutomationDelivery } from './delivery.js';
import { mapAutomationExecutionPolicyToRuntimeConfig } from './policy.js';
import type { AutomationRunLogStore } from './run-log.js';
import type { AutomationRunner } from './runner.js';
import type { AutomationScheduler } from './scheduler.js';
import type { AutomationStore } from './store.js';

type ChatSessionSummaryLookup = {
  getSummary: (sessionId: string) => { id: string };
};

export type CreateAutomationServiceInput = {
  store: AutomationStore;
  contextStore: AutomationContextStore;
  runLogStore: AutomationRunLogStore;
  runner: AutomationRunner;
  delivery: AutomationDelivery;
  createScheduler: (runner: Pick<AutomationRunner, 'runAutomationTurn'>) => AutomationScheduler;
  chatSessions: ChatSessionSummaryLookup;
  now?: () => number;
  generateAutomationId?: () => string;
};

const normalizeJobForSave = (job: AutomationJob, now: number): AutomationJob =>
  automationJobSchema.parse({
    ...job,
    updatedAt: now,
  });

export const createAutomationService = (input: CreateAutomationServiceInput) => {
  const now = input.now ?? (() => Date.now());
  const generateAutomationId = input.generateAutomationId ?? (() => randomUUID());

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

  const ensureExecutionPolicySupported = (job: AutomationJob) => {
    if (!job.enabled) {
      return;
    }
    mapAutomationExecutionPolicyToRuntimeConfig(job.executionPolicy);
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

    await input.runLogStore.append({
      ...runnerResult.runRecord,
      deliveryStatus: nextState.lastDeliveryStatus,
      deliveryError: nextState.lastDeliveryError,
    });
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

    subscribeStatusChange(listener: (event: { occurredAt: number }) => void): () => void {
      if (typeof input.store.subscribe !== 'function') {
        return () => {};
      }
      return input.store.subscribe(() => {
        listener({ occurredAt: now() });
      });
    },

    listAutomations(): AutomationJob[] {
      return input.store.listJobs();
    },

    getAutomation(jobId: string): AutomationJob | null {
      return input.store.getJob(jobId);
    },

    createAutomation(job: AutomationJob): AutomationJob {
      ensureSourceExists(job);
      ensureExecutionPolicySupported(job);
      const timestamp = now();
      const parsed = normalizeJobForSave(job, timestamp);
      if (input.store.getJob(parsed.id)) {
        throw new Error('Automation already exists.');
      }
      return input.store.saveJob(parsed);
    },

    updateAutomation(job: AutomationJob): AutomationJob {
      ensureSourceExists(job);
      ensureExecutionPolicySupported(job);
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
      ensureExecutionPolicySupported(next);
      return input.store.saveJob(next);
    },

    async runAutomationNow(jobId: string): Promise<AutomationJob> {
      const job = input.store.getJob(jobId);
      if (!job) {
        throw new Error('Automation not found.');
      }
      if (job.state.runningAt !== undefined) {
        throw new Error('Automation is already running.');
      }
      const ts = now();
      const runningJob = input.store.saveJob(
        normalizeJobForSave({ ...job, state: { ...job.state, runningAt: ts } }, ts)
      );
      try {
        const result = await runJobOnce(runningJob);
        const latest = input.store.getJob(jobId) ?? job;
        return input.store.saveJob(
          normalizeJobForSave(
            {
              ...latest,
              state: {
                ...latest.state,
                ...result.nextState,
                runningAt: undefined,
              },
            },
            now()
          )
        );
      } catch (error) {
        const latest = input.store.getJob(jobId);
        if (latest) {
          input.store.saveJob(
            normalizeJobForSave(
              { ...latest, state: { ...latest.state, runningAt: undefined } },
              now()
            )
          );
        }
        throw error;
      }
    },

    listRuns(inputValue?: { jobId?: string; limit?: number }) {
      return input.runLogStore.listRecent(inputValue ?? {});
    },

    createAutomationContext(inputValue: {
      vaultPath: string;
      title?: string;
    }): AutomationContextRecord {
      return input.contextStore.create({
        vaultPath: inputValue.vaultPath,
        title: inputValue.title?.trim() || 'New automation',
      });
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
        vaultPath: inputValue.vaultPath,
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
