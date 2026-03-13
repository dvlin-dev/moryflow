/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import type { AutomationEndpoint, AutomationJob } from '@moryflow/automations-core';

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
    endpointId: 'endpoint-1',
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

const createEndpoint = (overrides: Partial<AutomationEndpoint> = {}): AutomationEndpoint => ({
  id: 'endpoint-1',
  channel: 'telegram',
  accountId: 'default',
  label: 'Telegram Daily',
  target: {
    kind: 'telegram',
    chatId: 'chat-1',
    peerKey: 'tg:chat-1',
    threadKey: 'tg:chat-1',
  },
  verifiedAt: '2026-03-13T09:00:00.000Z',
  replySessionId: 'session-1',
  ...overrides,
});

describe('automation service', () => {
  it('blocks deleting an endpoint that is referenced by an automation', async () => {
    const { createAutomationService } = await import('./service-core.js');
    const removeEndpoint = vi.fn();
    const service = createAutomationService({
      store: {
        listJobs: () => [createJob()],
        listEndpoints: () => [createEndpoint()],
        getEndpoint: vi.fn((endpointId: string) =>
          endpointId === 'endpoint-1' ? createEndpoint() : null
        ),
        getDefaultEndpoint: vi.fn(() => null),
        saveEndpoint: vi.fn((endpoint: AutomationEndpoint) => endpoint),
        removeEndpoint,
        setDefaultEndpoint: vi.fn(),
        saveJob: vi.fn((job: AutomationJob) => job),
        getJob: vi.fn(),
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
        runAutomationTurn: vi.fn(),
      } as never,
      delivery: {
        deliver: vi.fn(),
      } as never,
      endpointsService: {
        listEndpoints: () => [createEndpoint()],
        getEndpoint: () => createEndpoint(),
        bindEndpoint: vi.fn(),
        updateEndpoint: vi.fn(),
        removeEndpoint,
        setDefaultEndpoint: vi.fn(),
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

    expect(() => service.removeEndpoint('endpoint-1')).toThrow(
      'Automation endpoint is still used by 1 automation.'
    );
    expect(removeEndpoint).not.toHaveBeenCalled();
  });

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
        listEndpoints: () => [createEndpoint()],
        getEndpoint: vi.fn((endpointId: string) =>
          endpointId === 'endpoint-1' ? createEndpoint() : null
        ),
        getDefaultEndpoint: vi.fn(() => null),
        saveEndpoint: vi.fn((endpoint: AutomationEndpoint) => endpoint),
        removeEndpoint: vi.fn(),
        setDefaultEndpoint: vi.fn(),
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
      endpointsService: {
        listEndpoints: () => [createEndpoint()],
        getEndpoint: () => createEndpoint(),
        bindEndpoint: vi.fn(),
        updateEndpoint: vi.fn(),
        removeEndpoint: vi.fn(),
        setDefaultEndpoint: vi.fn(),
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
        listEndpoints: () => [createEndpoint()],
        getEndpoint: vi.fn((endpointId: string) =>
          endpointId === 'endpoint-1' ? createEndpoint() : null
        ),
        getDefaultEndpoint: vi.fn(() => null),
        saveEndpoint: vi.fn((endpoint: AutomationEndpoint) => endpoint),
        removeEndpoint: vi.fn(),
        setDefaultEndpoint: vi.fn(),
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
      endpointsService: {
        listEndpoints: () => [createEndpoint()],
        getEndpoint: () => createEndpoint(),
        bindEndpoint: vi.fn(),
        updateEndpoint: vi.fn(),
        removeEndpoint: vi.fn(),
        setDefaultEndpoint: vi.fn(),
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
        listEndpoints: () => [createEndpoint()],
        getEndpoint: vi.fn((endpointId: string) =>
          endpointId === 'endpoint-1' ? createEndpoint() : null
        ),
        getDefaultEndpoint: vi.fn(() => null),
        saveEndpoint: vi.fn((endpoint: AutomationEndpoint) => endpoint),
        removeEndpoint: vi.fn(),
        setDefaultEndpoint: vi.fn(),
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
      endpointsService: {
        listEndpoints: () => [createEndpoint()],
        getEndpoint: () => createEndpoint(),
        bindEndpoint: vi.fn(),
        updateEndpoint: vi.fn(),
        removeEndpoint: vi.fn(),
        setDefaultEndpoint: vi.fn(),
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
});
