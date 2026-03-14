/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import type { AutomationJob } from '@moryflow/automations-core';

const createJob = (overrides: Partial<AutomationJob> = {}): AutomationJob => ({
  id: 'job-1',
  name: 'Daily summary',
  enabled: true,
  source: {
    kind: 'automation-context',
    origin: 'automations-module',
    vaultPath: '/vaults/main',
    displayTitle: 'Daily summary',
    contextId: 'context-1',
  },
  schedule: {
    kind: 'every',
    intervalMs: 60_000,
  },
  payload: {
    kind: 'agent-turn',
    message: 'Summarize updates',
    contextDepth: 6,
  },
  delivery: {
    mode: 'push',
    target: {
      channel: 'telegram',
      accountId: 'default',
      chatId: 'chat-1',
      label: 'Telegram chat-1',
    },
  },
  executionPolicy: {
    approvalMode: 'unattended',
    toolPolicy: { allow: [{ tool: 'Read' }] },
    networkPolicy: { mode: 'deny' },
    fileSystemPolicy: { mode: 'vault_only' },
    requiresExplicitConfirmation: true,
  },
  state: {},
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('automation service', () => {
  it('wires scheduler to the full run pipeline instead of the raw runner', async () => {
    const { createAutomationService } = await import('./service-core.js');
    const append = vi.fn();
    const deliver = vi.fn(async () => ({
      deliveryStatus: 'delivered' as const,
    }));
    const rawRunner = vi.fn(async () => ({
      outputText: 'done',
      runRecord: {
        id: 'run-1',
        jobId: 'job-1',
        startedAt: 10,
        finishedAt: 20,
        status: 'ok' as const,
        outputText: 'done',
      },
      nextState: {
        lastRunAt: 20,
        lastRunStatus: 'ok' as const,
      },
    }));
    let schedulerRunner:
      | {
          runAutomationTurn: (job: AutomationJob) => Promise<{
            outputText: string;
            runRecord: {
              id: string;
              jobId: string;
              startedAt: number;
              finishedAt: number;
              status: 'ok';
              outputText: string;
            };
            nextState: AutomationJob['state'];
          }>;
        }
      | undefined;

    createAutomationService({
      store: {
        listJobs: () => [createJob()],
        saveJob: vi.fn((job: AutomationJob) => job),
        getJob: vi.fn((jobId: string) => (jobId === 'job-1' ? createJob() : null)),
        removeJob: vi.fn(),
      } as never,
      contextStore: {
        create: vi.fn(),
        get: vi.fn(() => null),
        remove: vi.fn(),
      } as never,
      runLogStore: {
        append,
        listRecent: vi.fn(async () => []),
      } as never,
      runner: {
        runAutomationTurn: rawRunner,
      } as never,
      delivery: {
        deliver,
      } as never,
      createScheduler: (runner) => {
        schedulerRunner = runner;
        return {
          init: vi.fn(),
          shutdown: vi.fn(),
        } as never;
      },
      chatSessions: {
        getSummary: vi.fn(() => ({ id: 'session-1' })),
      } as never,
      now: () => 20,
      generateAutomationId: () => 'job-1',
    });

    const result = await schedulerRunner!.runAutomationTurn(createJob());

    expect(rawRunner).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1' }), 'done');
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'run-1',
        jobId: 'job-1',
        deliveryStatus: 'delivered',
      })
    );
    expect(result.nextState.lastDeliveryStatus).toBe('delivered');
  });

  it('keeps delivery status as delivered when delivery reports a post-send local sync error', async () => {
    const { createAutomationService } = await import('./service-core.js');
    let schedulerRunner:
      | {
          runAutomationTurn: (job: AutomationJob) => Promise<{
            outputText: string;
            runRecord: {
              id: string;
              jobId: string;
              startedAt: number;
              finishedAt: number;
              status: 'ok';
              outputText: string;
            };
            nextState: AutomationJob['state'];
          }>;
        }
      | undefined;

    createAutomationService({
      store: {
        listJobs: () => [createJob()],
        saveJob: vi.fn((job: AutomationJob) => job),
        getJob: vi.fn((jobId: string) => (jobId === 'job-1' ? createJob() : null)),
        removeJob: vi.fn(),
      } as never,
      contextStore: {
        create: vi.fn(),
        get: vi.fn(() => null),
        remove: vi.fn(),
      } as never,
      runLogStore: {
        append: vi.fn(),
        listRecent: vi.fn(async () => []),
      } as never,
      runner: {
        runAutomationTurn: vi.fn(async () => ({
          outputText: 'done',
          runRecord: {
            id: 'run-1',
            jobId: 'job-1',
            startedAt: 10,
            finishedAt: 20,
            status: 'ok' as const,
            outputText: 'done',
          },
          nextState: {
            lastRunAt: 20,
            lastRunStatus: 'ok' as const,
          },
        })),
      } as never,
      delivery: {
        deliver: vi.fn(async () => ({
          deliveryStatus: 'delivered' as const,
          localSyncError:
            'Automation delivery succeeded, but the local reply conversation did not sync: append failed',
        })),
      } as never,
      createScheduler: (runner) => {
        schedulerRunner = runner;
        return {
          init: vi.fn(),
          shutdown: vi.fn(),
        } as never;
      },
      chatSessions: {
        getSummary: vi.fn(() => ({ id: 'session-1' })),
      } as never,
      now: () => 20,
      generateAutomationId: () => 'job-1',
    });

    const result = await schedulerRunner!.runAutomationTurn(createJob());

    expect(result.nextState.lastDeliveryStatus).toBe('delivered');
    expect(result.nextState.lastDeliveryError).toContain('local reply conversation did not sync');
  });

  it('clears run logs when deleting an automation', async () => {
    const { createAutomationService } = await import('./service-core.js');
    const removeJobLogs = vi.fn(async () => undefined);
    const removeContext = vi.fn();
    const removeJob = vi.fn();
    const service = createAutomationService({
      store: {
        listJobs: () => [createJob()],
        saveJob: vi.fn((job: AutomationJob) => job),
        getJob: vi.fn((jobId: string) => (jobId === 'job-1' ? createJob() : null)),
        removeJob,
      } as never,
      contextStore: {
        create: vi.fn(),
        get: vi.fn(() => null),
        remove: removeContext,
      } as never,
      runLogStore: {
        append: vi.fn(),
        listRecent: vi.fn(async () => []),
        removeJobLogs,
      } as never,
      runner: {
        runAutomationTurn: vi.fn(),
      } as never,
      delivery: {
        deliver: vi.fn(),
      } as never,
      createScheduler: () =>
        ({
          init: vi.fn(),
          shutdown: vi.fn(),
        }) as never,
      chatSessions: {
        getSummary: vi.fn(() => ({ id: 'session-1' })),
      } as never,
      now: () => 1,
      generateAutomationId: () => 'job-1',
    });

    await service.deleteAutomation('job-1');

    expect(removeContext).toHaveBeenCalledWith('context-1');
    expect(removeJobLogs).toHaveBeenCalledWith('job-1');
    expect(removeJob).toHaveBeenCalledWith('job-1');
  });

  it('rejects runAutomationNow when the job is already running', async () => {
    const { createAutomationService } = await import('./service-core.js');
    const service = createAutomationService({
      store: {
        listJobs: () => [],
        saveJob: vi.fn((job: AutomationJob) => job),
        getJob: vi.fn(() => createJob({ state: { runningAt: 100 } })),
        removeJob: vi.fn(),
      } as never,
      contextStore: { create: vi.fn(), get: vi.fn(() => null), remove: vi.fn() } as never,
      runLogStore: { append: vi.fn(), listRecent: vi.fn(async () => []) } as never,
      runner: { runAutomationTurn: vi.fn() } as never,
      delivery: { deliver: vi.fn() } as never,
      createScheduler: () => ({ init: vi.fn(), shutdown: vi.fn() }) as never,
      chatSessions: { getSummary: vi.fn(() => ({ id: 'session-1' })) } as never,
      now: () => 100,
    });

    await expect(service.runAutomationNow('job-1')).rejects.toThrow(
      'Automation is already running.'
    );
  });

  it('sets runningAt before executing runAutomationNow and clears it after', async () => {
    const { createAutomationService } = await import('./service-core.js');
    const saveJob = vi.fn((job: AutomationJob) => job);
    const service = createAutomationService({
      store: {
        listJobs: () => [createJob()],
        saveJob,
        getJob: vi.fn(() => createJob()),
        removeJob: vi.fn(),
      } as never,
      contextStore: { create: vi.fn(), get: vi.fn(() => null), remove: vi.fn() } as never,
      runLogStore: { append: vi.fn(), listRecent: vi.fn(async () => []) } as never,
      runner: {
        runAutomationTurn: vi.fn(async () => ({
          outputText: 'done',
          runRecord: {
            id: 'run-1',
            jobId: 'job-1',
            startedAt: 10,
            finishedAt: 20,
            status: 'ok' as const,
            outputText: 'done',
          },
          nextState: {
            lastRunAt: 20,
            lastRunStatus: 'ok' as const,
          },
        })),
      } as never,
      delivery: {
        deliver: vi.fn(async () => ({ deliveryStatus: 'delivered' as const })),
      } as never,
      createScheduler: () => ({ init: vi.fn(), shutdown: vi.fn() }) as never,
      chatSessions: { getSummary: vi.fn(() => ({ id: 'session-1' })) } as never,
      now: () => 20,
    });

    await service.runAutomationNow('job-1');

    expect(saveJob.mock.calls[0]?.[0].state.runningAt).toBe(20);
    expect(saveJob.mock.calls.at(-1)?.[0].state.runningAt).toBeUndefined();
  });

  it('rejects enabling an automation when its execution policy cannot be mapped', async () => {
    const { createAutomationService } = await import('./service-core.js');
    const saveJob = vi.fn((job: AutomationJob) => job);
    const service = createAutomationService({
      store: {
        listJobs: () => [],
        saveJob,
        getJob: vi.fn((jobId: string) =>
          jobId === 'job-1'
            ? createJob({
                enabled: false,
                executionPolicy: {
                  approvalMode: 'unattended',
                  toolPolicy: { allow: [{ tool: 'Read' }] },
                  networkPolicy: { mode: 'allowlist', allowHosts: ['bad/host'] },
                  fileSystemPolicy: { mode: 'vault_only' },
                  requiresExplicitConfirmation: true,
                },
              })
            : null
        ),
        removeJob: vi.fn(),
        subscribe: vi.fn(() => () => undefined),
      } as never,
      contextStore: {
        create: vi.fn(),
        get: vi.fn(() => ({ id: 'context-1' })),
        remove: vi.fn(),
      } as never,
      runLogStore: {
        append: vi.fn(),
        listRecent: vi.fn(async () => []),
      } as never,
      runner: {
        runAutomationTurn: vi.fn(),
      } as never,
      delivery: {
        deliver: vi.fn(),
      } as never,
      createScheduler: () =>
        ({
          init: vi.fn(),
          shutdown: vi.fn(),
        }) as never,
      chatSessions: {
        getSummary: vi.fn(() => ({ id: 'session-1' })),
      } as never,
      now: () => 1,
      generateAutomationId: () => 'job-1',
    });

    expect(() => service.toggleAutomation('job-1', true)).toThrow(
      'Automation network allowlist host is invalid: bad/host'
    );
    expect(saveJob).not.toHaveBeenCalled();
  });

  it('proxies status change subscriptions to the automation store', async () => {
    const { createAutomationService } = await import('./service-core.js');
    let storeListener: (() => void) | null = null;
    const dispose = vi.fn();
    const service = createAutomationService({
      store: {
        listJobs: () => [],
        saveJob: vi.fn((job: AutomationJob) => job),
        getJob: vi.fn(() => null),
        removeJob: vi.fn(),
        subscribe: vi.fn((listener: () => void) => {
          storeListener = listener;
          return dispose;
        }),
      } as never,
      contextStore: {
        create: vi.fn(),
        get: vi.fn(() => null),
        remove: vi.fn(),
      } as never,
      runLogStore: {
        append: vi.fn(),
        listRecent: vi.fn(async () => []),
      } as never,
      runner: {
        runAutomationTurn: vi.fn(),
      } as never,
      delivery: {
        deliver: vi.fn(),
      } as never,
      createScheduler: () =>
        ({
          init: vi.fn(),
          shutdown: vi.fn(),
        }) as never,
      chatSessions: {
        getSummary: vi.fn(() => ({ id: 'session-1' })),
      } as never,
    });
    const listener = vi.fn();

    const unsubscribe = service.subscribeStatusChange(listener);
    storeListener?.();

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
