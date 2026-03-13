import type { AutomationJob } from '@moryflow/automations-core';
import type { AutomationRunner } from './runner.js';

type TimerHandle = ReturnType<typeof setTimeout>;

type PowerMonitorLike = {
  on: (event: string, listener: () => void) => unknown;
  off: (event: string, listener: () => void) => unknown;
};

const DEFAULT_RUNNING_TIMEOUT_MS = 15 * 60 * 1000;

const cloneJob = (job: AutomationJob): AutomationJob => structuredClone(job);

const resolveScheduledRunAt = (job: AutomationJob): number | undefined => {
  if (job.schedule.kind === 'at') {
    return job.schedule.runAt;
  }
  return job.state.nextRunAt ?? job.createdAt + job.schedule.intervalMs;
};

const resolveFutureNextRunAt = (
  job: AutomationJob,
  dueAt: number,
  now: number
): number | undefined => {
  if (job.schedule.kind !== 'every') {
    return undefined;
  }
  const base = dueAt;
  if (base > now) {
    return base;
  }
  const elapsed = now - base;
  const steps = Math.floor(elapsed / job.schedule.intervalMs) + 1;
  return base + steps * job.schedule.intervalMs;
};

export const createAutomationScheduler = (input: {
  store: Pick<import('./store.js').AutomationStore, 'listJobs' | 'saveJob'> &
    Partial<Pick<import('./store.js').AutomationStore, 'getJob'>>;
  runner: Pick<AutomationRunner, 'runAutomationTurn'>;
  powerMonitor: PowerMonitorLike;
  now?: () => number;
  setTimer?: (handler: () => void, delayMs: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
  runningTimeoutMs?: number;
}) => {
  const now = input.now ?? (() => Date.now());
  const setTimer = input.setTimer ?? ((handler, delayMs) => setTimeout(handler, delayMs));
  const clearTimer = input.clearTimer ?? ((handle) => clearTimeout(handle));
  const runningTimeoutMs = input.runningTimeoutMs ?? DEFAULT_RUNNING_TIMEOUT_MS;
  let timer: TimerHandle | null = null;

  const persistJob = (job: AutomationJob) => {
    input.store.saveJob(job);
    return job;
  };

  const resolveCompletionBase = (runningJob: AutomationJob): AutomationJob | null => {
    return input.store.getJob?.(runningJob.id) ?? runningJob;
  };

  const finalizeJob = async (job: AutomationJob, dueAt: number) => {
    const liveJob = input.store.getJob?.(job.id) ?? job;

    if (
      liveJob.state.runningAt !== undefined &&
      now() - liveJob.state.runningAt < runningTimeoutMs
    ) {
      const skipped: AutomationJob = {
        ...liveJob,
        updatedAt: now(),
        state: {
          ...liveJob.state,
          lastRunStatus: 'skipped',
          nextRunAt: resolveFutureNextRunAt(liveJob, dueAt, now()),
        },
      };
      persistJob(skipped);
      return;
    }

    const runningJob: AutomationJob = {
      ...liveJob,
      updatedAt: now(),
      state: {
        ...liveJob.state,
        runningAt: now(),
      },
    };
    persistJob(runningJob);

    try {
      const result = await input.runner.runAutomationTurn(runningJob);
      const completionBase = resolveCompletionBase(runningJob);
      if (!completionBase) {
        return;
      }
      const nextRunAt = resolveFutureNextRunAt(completionBase, dueAt, now());
      const finishedJob: AutomationJob = {
        ...completionBase,
        enabled: completionBase.schedule.kind === 'at' ? false : completionBase.enabled,
        updatedAt: now(),
        state: {
          ...completionBase.state,
          ...result.nextState,
          runningAt: undefined,
          nextRunAt,
        },
      };
      persistJob(finishedJob);
    } catch (error) {
      const completionBase = resolveCompletionBase(runningJob);
      if (!completionBase) {
        return;
      }
      const failedJob: AutomationJob = {
        ...completionBase,
        updatedAt: now(),
        state: {
          ...completionBase.state,
          runningAt: undefined,
          lastRunAt: now(),
          lastRunStatus: 'error',
          lastError: error instanceof Error ? error.message : String(error),
          consecutiveErrors: (completionBase.state.consecutiveErrors ?? 0) + 1,
          nextRunAt: resolveFutureNextRunAt(completionBase, dueAt, now()),
        },
      };
      persistJob(failedJob);
    }
  };

  const runDueJobs = async () => {
    const currentNow = now();
    const jobs = input.store
      .listJobs()
      .filter((job) => job.enabled)
      .map((job) => {
        const nextRunAt = resolveScheduledRunAt(job);
        return nextRunAt !== undefined ? { job, nextRunAt } : null;
      })
      .filter((entry): entry is { job: AutomationJob; nextRunAt: number } => entry !== null)
      .filter((entry) => entry.nextRunAt <= currentNow)
      .sort((left, right) => left.nextRunAt - right.nextRunAt);

    for (const entry of jobs) {
      await finalizeJob(cloneJob(entry.job), entry.nextRunAt);
    }
    armNextTimer();
  };

  const armNextTimer = () => {
    if (timer) {
      clearTimer(timer);
      timer = null;
    }
    const currentNow = now();
    const nextRunAt = input.store
      .listJobs()
      .filter((job) => job.enabled)
      .map((job) => resolveScheduledRunAt(job))
      .filter((value): value is number => value !== undefined)
      .sort((left, right) => left - right)[0];
    if (nextRunAt === undefined) {
      return;
    }
    timer = setTimer(
      async () => {
        await runDueJobs();
      },
      Math.max(0, nextRunAt - currentNow)
    );
  };

  const handleResume = () => {
    void runDueJobs();
  };

  return {
    init() {
      input.powerMonitor.on('resume', handleResume);
      armNextTimer();
    },
    shutdown() {
      input.powerMonitor.off('resume', handleResume);
      if (timer) {
        clearTimer(timer);
        timer = null;
      }
    },
  };
};

export type AutomationScheduler = ReturnType<typeof createAutomationScheduler>;
