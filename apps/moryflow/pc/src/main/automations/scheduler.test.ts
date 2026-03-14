/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AutomationJob } from '@moryflow/automations-core';

const createJob = (overrides: Partial<AutomationJob> = {}): AutomationJob => ({
  id: 'job-1',
  name: 'Daily summary',
  enabled: true,
  source: {
    kind: 'conversation-session',
    origin: 'conversation-entry',
    vaultPath: '/tmp/workspace',
    displayTitle: 'Inbox',
    sessionId: 'session-1',
  },
  schedule: {
    kind: 'every',
    intervalMs: 1_000,
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
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const createPowerMonitor = () => {
  const listeners = new Map<string, Set<() => void>>();
  return {
    on(event: 'resume' | 'suspend', listener: () => void) {
      const bucket = listeners.get(event) ?? new Set<() => void>();
      bucket.add(listener);
      listeners.set(event, bucket);
    },
    off(event: 'resume' | 'suspend', listener: () => void) {
      listeners.get(event)?.delete(listener);
    },
    emit(event: 'resume' | 'suspend') {
      for (const listener of listeners.get(event) ?? []) {
        listener();
      }
    },
  };
};

describe('automation scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  it('at schedule triggers only once and disables the job after execution', async () => {
    const job = createJob({
      schedule: { kind: 'at', runAt: 1_000 },
    });
    const saved: AutomationJob[] = [];
    const powerMonitor = createPowerMonitor();
    const { createAutomationScheduler } = await import('./scheduler.js');
    const scheduler = createAutomationScheduler({
      store: {
        listJobs: () => [job],
        saveJob: (next: AutomationJob) => {
          saved.push(next);
          Object.assign(job, next);
          return next;
        },
      } as never,
      runner: {
        runAutomationTurn: vi.fn(async () => ({
          outputText: 'done',
          runRecord: {
            id: 'run-1',
            jobId: 'job-1',
            startedAt: 1_000,
            finishedAt: 1_001,
            status: 'ok',
            outputText: 'done',
          },
          nextState: {
            lastRunAt: 1_001,
            lastRunStatus: 'ok',
          },
        })),
      } as never,
      powerMonitor: powerMonitor as never,
      now: () => Date.now(),
    });

    scheduler.init();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(saved.at(-1)?.enabled).toBe(false);
    expect(saved.at(-1)?.state.lastRunStatus).toBe('ok');
  });

  it('every schedule computes the next run after success', async () => {
    const job = createJob({
      state: { nextRunAt: 1_000 },
    });
    const saved: AutomationJob[] = [];
    const { createAutomationScheduler } = await import('./scheduler.js');
    const scheduler = createAutomationScheduler({
      store: {
        listJobs: () => [job],
        saveJob: (next: AutomationJob) => {
          saved.push(next);
          Object.assign(job, next);
          return next;
        },
      } as never,
      runner: {
        runAutomationTurn: vi.fn(async () => ({
          outputText: 'done',
          runRecord: {
            id: 'run-1',
            jobId: 'job-1',
            startedAt: 1_000,
            finishedAt: 1_001,
            status: 'ok',
            outputText: 'done',
          },
          nextState: {
            lastRunAt: 1_001,
            lastRunStatus: 'ok',
          },
        })),
      } as never,
      powerMonitor: createPowerMonitor() as never,
      now: () => Date.now(),
    });

    scheduler.init();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(saved.at(-1)?.state.nextRunAt).toBe(2_000);
  });

  it('re-arms the next timer when jobs change after init', async () => {
    const jobs: AutomationJob[] = [];
    let notifyStoreChange: (() => void) | null = null;
    const runAutomationTurn = vi.fn(async () => ({
      outputText: 'done',
      runRecord: {
        id: 'run-1',
        jobId: 'job-1',
        startedAt: 1_000,
        finishedAt: 1_001,
        status: 'ok' as const,
        outputText: 'done',
      },
      nextState: {
        lastRunAt: 1_001,
        lastRunStatus: 'ok' as const,
      },
    }));
    const { createAutomationScheduler } = await import('./scheduler.js');
    const scheduler = createAutomationScheduler({
      store: {
        listJobs: () => jobs,
        saveJob: (next: AutomationJob) => {
          const index = jobs.findIndex((job) => job.id === next.id);
          if (index >= 0) {
            jobs[index] = next;
          } else {
            jobs.push(next);
          }
          return next;
        },
        subscribe: (listener: () => void) => {
          notifyStoreChange = listener;
          return () => {
            if (notifyStoreChange === listener) {
              notifyStoreChange = null;
            }
          };
        },
      } as never,
      runner: {
        runAutomationTurn,
      } as never,
      powerMonitor: createPowerMonitor() as never,
      now: () => Date.now(),
    });

    scheduler.init();
    jobs.push(
      createJob({
        state: {
          nextRunAt: 1_000,
        },
      })
    );

    notifyStoreChange?.();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(runAutomationTurn).toHaveBeenCalledTimes(1);
  });

  it('skips a due job when runningAt is still active', async () => {
    const job = createJob({
      state: {
        nextRunAt: 1_000,
        runningAt: 900,
      },
    });
    const runAutomationTurn = vi.fn();
    const saved: AutomationJob[] = [];
    const { createAutomationScheduler } = await import('./scheduler.js');
    const scheduler = createAutomationScheduler({
      store: {
        listJobs: () => [job],
        saveJob: (next: AutomationJob) => {
          saved.push(next);
          Object.assign(job, next);
          return next;
        },
      } as never,
      runner: {
        runAutomationTurn,
      } as never,
      powerMonitor: createPowerMonitor() as never,
      now: () => Date.now(),
      runningTimeoutMs: 5_000,
    });

    scheduler.init();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(runAutomationTurn).not.toHaveBeenCalled();
    expect(saved.at(-1)?.state.nextRunAt).toBe(2_000);
  });

  it('does not persist a stale runningAt snapshot after the live job has already finished', async () => {
    const staleJob = createJob({
      state: {
        nextRunAt: 1_000,
        runningAt: 900,
      },
    });
    const liveJob = createJob({
      state: {
        nextRunAt: 1_000,
      },
    });
    const saved: AutomationJob[] = [];
    const runAutomationTurn = vi.fn(async () => ({
      outputText: 'done',
      runRecord: {
        id: 'run-1',
        jobId: 'job-1',
        startedAt: 1_000,
        finishedAt: 1_001,
        status: 'ok',
        outputText: 'done',
      },
      nextState: {
        lastRunAt: 1_001,
        lastRunStatus: 'ok',
      },
    }));
    const { createAutomationScheduler } = await import('./scheduler.js');
    const scheduler = createAutomationScheduler({
      store: {
        listJobs: () => [staleJob],
        getJob: () => liveJob,
        saveJob: (next: AutomationJob) => {
          saved.push(next);
          Object.assign(liveJob, next);
          return next;
        },
      } as never,
      runner: {
        runAutomationTurn,
      } as never,
      powerMonitor: createPowerMonitor() as never,
      now: () => Date.now(),
      runningTimeoutMs: 5_000,
    });

    scheduler.init();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(runAutomationTurn).toHaveBeenCalledTimes(1);
    expect(saved.some((job) => job.state.runningAt === 900)).toBe(false);
    expect(saved.at(-1)?.state.runningAt).toBeUndefined();
    expect(saved.at(-1)?.state.lastRunStatus).toBe('ok');
  });

  it('preserves user edits made while a job is running and only merges execution state on completion', async () => {
    const liveJob = createJob({
      state: {
        nextRunAt: 1_000,
      },
    });
    let resolveRun:
      | ((value: {
          outputText: string;
          runRecord: {
            id: string;
            jobId: string;
            startedAt: number;
            finishedAt: number;
            status: 'ok';
            outputText: string;
          };
          nextState: {
            lastRunAt: number;
            lastRunStatus: 'ok';
          };
        }) => void)
      | null = null;
    const runAutomationTurn = vi.fn(
      () =>
        new Promise<{
          outputText: string;
          runRecord: {
            id: string;
            jobId: string;
            startedAt: number;
            finishedAt: number;
            status: 'ok';
            outputText: string;
          };
          nextState: {
            lastRunAt: number;
            lastRunStatus: 'ok';
          };
        }>((resolve) => {
          resolveRun = resolve;
        })
    );
    const saved: AutomationJob[] = [];
    const { createAutomationScheduler } = await import('./scheduler.js');
    const scheduler = createAutomationScheduler({
      store: {
        listJobs: () => [liveJob],
        getJob: () => liveJob,
        saveJob: (next: AutomationJob) => {
          saved.push(next);
          Object.assign(liveJob, structuredClone(next));
          return next;
        },
      } as never,
      runner: {
        runAutomationTurn,
      } as never,
      powerMonitor: createPowerMonitor() as never,
      now: () => Date.now(),
    });

    scheduler.init();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(runAutomationTurn).toHaveBeenCalledTimes(1);
    expect(liveJob.state.runningAt).toBe(1_000);

    const userEditedJob: AutomationJob = {
      ...liveJob,
      enabled: false,
      payload: {
        ...liveJob.payload,
        message: 'Updated while running',
      },
      updatedAt: 1_500,
    };
    Object.assign(liveJob, structuredClone(userEditedJob));

    resolveRun?.({
      outputText: 'done',
      runRecord: {
        id: 'run-1',
        jobId: 'job-1',
        startedAt: 1_000,
        finishedAt: 1_001,
        status: 'ok',
        outputText: 'done',
      },
      nextState: {
        lastRunAt: 1_001,
        lastRunStatus: 'ok',
      },
    });
    await Promise.resolve();

    expect(saved.at(-1)?.enabled).toBe(false);
    expect(saved.at(-1)?.payload.message).toBe('Updated while running');
    expect(saved.at(-1)?.state.lastRunStatus).toBe('ok');
    expect(saved.at(-1)?.state.runningAt).toBeUndefined();
  });

  it('resume catches up only the most recent missed run once', async () => {
    const job = createJob({
      state: {
        nextRunAt: -3_000,
      },
    });
    const runAutomationTurn = vi.fn(async () => ({
      outputText: 'done',
      runRecord: {
        id: 'run-1',
        jobId: 'job-1',
        startedAt: 0,
        finishedAt: 1,
        status: 'ok',
        outputText: 'done',
      },
      nextState: {
        lastRunAt: 1,
        lastRunStatus: 'ok',
      },
    }));
    const saved: AutomationJob[] = [];
    const powerMonitor = createPowerMonitor();
    const { createAutomationScheduler } = await import('./scheduler.js');
    const scheduler = createAutomationScheduler({
      store: {
        listJobs: () => [job],
        saveJob: (next: AutomationJob) => {
          saved.push(next);
          Object.assign(job, next);
          return next;
        },
      } as never,
      runner: {
        runAutomationTurn,
      } as never,
      powerMonitor: powerMonitor as never,
      now: () => Date.now(),
    });

    scheduler.init();
    powerMonitor.emit('resume');
    await Promise.resolve();

    expect(runAutomationTurn).toHaveBeenCalledTimes(1);
    expect(saved.at(-1)?.state.nextRunAt).toBe(1_000);
  });

  it('keeps runningAt when resume checks a job that is still running', async () => {
    const job = createJob({
      state: {
        nextRunAt: 0,
      },
    });
    let resolveRun:
      | ((value: {
          outputText: string;
          runRecord: {
            id: string;
            jobId: string;
            startedAt: number;
            finishedAt: number;
            status: 'ok';
            outputText: string;
          };
          nextState: {
            lastRunAt: number;
            lastRunStatus: 'ok';
          };
        }) => void)
      | null = null;
    const runAutomationTurn = vi.fn(
      () =>
        new Promise<{
          outputText: string;
          runRecord: {
            id: string;
            jobId: string;
            startedAt: number;
            finishedAt: number;
            status: 'ok';
            outputText: string;
          };
          nextState: {
            lastRunAt: number;
            lastRunStatus: 'ok';
          };
        }>((resolve) => {
          resolveRun = resolve;
        })
    );
    const saved: AutomationJob[] = [];
    const powerMonitor = createPowerMonitor();
    const { createAutomationScheduler } = await import('./scheduler.js');
    const scheduler = createAutomationScheduler({
      store: {
        listJobs: () => [job],
        saveJob: (next: AutomationJob) => {
          saved.push(next);
          Object.assign(job, next);
          return next;
        },
      } as never,
      runner: {
        runAutomationTurn,
      } as never,
      powerMonitor: powerMonitor as never,
      now: () => Date.now(),
      runningTimeoutMs: 5_000,
    });

    scheduler.init();
    await vi.advanceTimersByTimeAsync(0);

    expect(runAutomationTurn).toHaveBeenCalledTimes(1);
    expect(job.state.runningAt).toBe(0);

    powerMonitor.emit('resume');
    await Promise.resolve();

    expect(runAutomationTurn).toHaveBeenCalledTimes(1);
    expect(saved.at(-1)?.state.runningAt).toBe(0);

    resolveRun?.({
      outputText: 'done',
      runRecord: {
        id: 'run-1',
        jobId: 'job-1',
        startedAt: 0,
        finishedAt: 10,
        status: 'ok',
        outputText: 'done',
      },
      nextState: {
        lastRunAt: 10,
        lastRunStatus: 'ok',
      },
    });
    await Promise.resolve();
  });
});
