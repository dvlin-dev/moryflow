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
  getSummary: (sessionId: string) => { id: string; title: string; vaultPath: string };
};

export type CreateAutomationServiceInput = {
  store: AutomationStore;
  contextStore: AutomationContextStore;
  runLogStore: AutomationRunLogStore;
  runner: AutomationRunner;
  delivery: AutomationDelivery;
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

  const canonicalizeSource = (source: AutomationJob['source']): AutomationJob['source'] => {
    if (source.kind === 'conversation-session') {
      const session = input.chatSessions.getSummary(source.sessionId);
      return {
        kind: 'conversation-session',
        origin: 'conversation-entry',
        sessionId: session.id,
        vaultPath: ensureApprovedVaultPath(session.vaultPath),
        displayTitle: session.title.trim() || source.displayTitle,
      };
    }

    const context = input.contextStore.get(source.contextId);
    if (!context) {
      throw new Error('Automation context not found.');
    }
    return {
      kind: 'automation-context',
      origin: 'automations-module',
      contextId: context.id,
      vaultPath: ensureApprovedVaultPath(context.vaultPath),
      displayTitle: context.title.trim() || source.displayTitle,
    };
  };

  const canonicalizeJobForSave = (job: AutomationJob, timestamp: number): AutomationJob => {
    return normalizeJobForSave(
      {
        ...job,
        source: canonicalizeSource(job.source),
      },
      timestamp
    );
  };

  const isSameSource = (
    left: AutomationJob['source'],
    right: AutomationJob['source']
  ): boolean => {
    if (
      left.kind !== right.kind ||
      left.origin !== right.origin ||
      left.vaultPath !== right.vaultPath ||
      left.displayTitle !== right.displayTitle
    ) {
      return false;
    }
    return left.kind === 'conversation-session'
      ? right.kind === 'conversation-session' && left.sessionId === right.sessionId
      : right.kind === 'automation-context' && left.contextId === right.contextId;
  };

  const isMissingSourceError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }
    return (
      error.message === 'Automation context not found.' ||
      error.message === '未找到对应的对话，请新建后再试'
    );
  };

  const buildSafeJobForMissingSourceRun = (job: AutomationJob): AutomationJob => ({
    ...job,
    source: {
      ...job.source,
      vaultPath: ensureApprovedVaultPath(job.source.vaultPath),
    },
  });

  const persistCanonicalSourceIfNeeded = (job: AutomationJob): AutomationJob => {
    const canonicalSource = canonicalizeSource(job.source);
    if (isSameSource(job.source, canonicalSource)) {
      return {
        ...job,
        source: canonicalSource,
      };
    }
    const canonicalJob = normalizeJobForSave(
      {
        ...job,
        source: canonicalSource,
      },
      now()
    );
    input.store.saveJob(canonicalJob);
    return canonicalJob;
  };

  const ensureExecutionPolicySupported = (job: AutomationJob) => {
    if (!job.enabled) {
      return;
    }
    mapAutomationExecutionPolicyToRuntimeConfig(job.executionPolicy);
  };

  const runJobOnce = async (job: AutomationJob) => {
    let jobToRun = job;
    try {
      jobToRun = persistCanonicalSourceIfNeeded(job);
    } catch (error) {
      if (!isMissingSourceError(error)) {
        throw error;
      }
      jobToRun = buildSafeJobForMissingSourceRun(job);
    }

    const runnerResult = await input.runner.runAutomationTurn(jobToRun);
    let nextState: AutomationJob['state'] = {
      ...runnerResult.nextState,
      lastDeliveryStatus: 'not-requested',
      lastDeliveryError: undefined,
    };

    if (jobToRun.delivery.mode === 'push') {
      try {
        const deliveryResult = await input.delivery.deliver(jobToRun, runnerResult.outputText);
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
      const timestamp = now();
      const parsed = canonicalizeJobForSave(job, timestamp);
      ensureExecutionPolicySupported(parsed);
      if (input.store.getJob(parsed.id)) {
        throw new Error('Automation already exists.');
      }
      return input.store.saveJob(parsed);
    },

    updateAutomation(job: AutomationJob): AutomationJob {
      if (!input.store.getJob(job.id)) {
        throw new Error('Automation not found.');
      }
      const parsed = canonicalizeJobForSave(job, now());
      ensureExecutionPolicySupported(parsed);
      return input.store.saveJob(parsed);
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
