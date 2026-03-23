const DEFAULT_DEBOUNCE_MS = 2_000;
const MAX_RETRY_COUNT = 3;

export interface MemoryIndexingTaskState {
  timer: NodeJS.Timeout | null;
  retryCount: number;
  absolutePath: string | null;
  vaultPath: string | null;
  phase: 'idle' | 'scheduled' | 'inflight';
}

type MemoryIndexingRemoteState =
  | {
      kind: 'uploaded';
      signature: string;
    }
  | {
      kind: 'deleted';
    };

type BootstrapRunToken = symbol;

interface BootstrapVaultState {
  runs: Set<BootstrapRunToken>;
  hasLocalDocuments: boolean;
}

const createTaskState = (): MemoryIndexingTaskState => ({
  timer: null,
  retryCount: 0,
  absolutePath: null,
  vaultPath: null,
  phase: 'idle',
});

export const createMemoryIndexingState = () => {
  const tasks = new Map<string, MemoryIndexingTaskState>();
  const remoteStates = new Map<string, MemoryIndexingRemoteState>();
  const bootstrapVaultStates = new Map<string, BootstrapVaultState>();
  const bootstrapVaultLocalWorkCounts = new Map<string, number>();
  const getTask = (taskKey: string): MemoryIndexingTaskState => {
    const existing = tasks.get(taskKey);
    if (existing) {
      return existing;
    }
    const created = createTaskState();
    tasks.set(taskKey, created);
    return created;
  };

  const clearTimer = (taskKey: string): void => {
    const task = tasks.get(taskKey);
    if (!task?.timer) {
      return;
    }
    clearTimeout(task.timer);
    task.timer = null;
  };

  const incrementLocalWork = (vaultPath: string): void => {
    const current = bootstrapVaultLocalWorkCounts.get(vaultPath) ?? 0;
    bootstrapVaultLocalWorkCounts.set(vaultPath, current + 1);
  };

  const decrementLocalWork = (vaultPath: string): void => {
    const current = bootstrapVaultLocalWorkCounts.get(vaultPath) ?? 0;
    if (current <= 1) {
      bootstrapVaultLocalWorkCounts.delete(vaultPath);
      return;
    }
    bootstrapVaultLocalWorkCounts.set(vaultPath, current - 1);
  };

  const bindTaskToVault = (task: MemoryIndexingTaskState, vaultPath?: string): void => {
    if (vaultPath) {
      task.vaultPath = vaultPath;
    }
  };

  const ensureTaskActive = (task: MemoryIndexingTaskState): void => {
    if (task.phase !== 'idle' || !task.vaultPath) {
      return;
    }
    incrementLocalWork(task.vaultPath);
  };

  const settleTask = (task: MemoryIndexingTaskState): void => {
    if (task.phase === 'idle') {
      return;
    }
    if (task.vaultPath) {
      decrementLocalWork(task.vaultPath);
    }
    task.phase = 'idle';
  };

  const markRemoteUploaded = (taskKey: string, signature: string): void => {
    const task = getTask(taskKey);
    task.retryCount = 0;
    remoteStates.set(taskKey, {
      kind: 'uploaded',
      signature,
    });
    clearTimer(taskKey);
  };

  const markRemoteDeleted = (taskKey: string): void => {
    const task = getTask(taskKey);
    task.retryCount = 0;
    remoteStates.set(taskKey, {
      kind: 'deleted',
    });
    clearTimer(taskKey);
  };

  return {
    debounceMs: DEFAULT_DEBOUNCE_MS,
    maxRetryCount: MAX_RETRY_COUNT,
    getTask,
    schedule(
      taskKey: string,
      handler: () => void,
      absolutePath?: string,
      vaultPath?: string,
      options?: {
        dedupeIfActive?: boolean;
      }
    ): boolean {
      const task = getTask(taskKey);
      if (options?.dedupeIfActive && task.phase !== 'idle') {
        return false;
      }
      bindTaskToVault(task, vaultPath);
      ensureTaskActive(task);
      clearTimer(taskKey);
      if (absolutePath) {
        task.absolutePath = absolutePath;
      }
      task.phase = 'scheduled';
      task.timer = setTimeout(() => {
        task.timer = null;
        task.phase = 'inflight';
        handler();
      }, DEFAULT_DEBOUNCE_MS);
      return true;
    },
    scheduleRetry(taskKey: string, handler: () => void): boolean {
      const task = getTask(taskKey);
      if (task.retryCount >= MAX_RETRY_COUNT) {
        return false;
      }
      const delay = 500 * 2 ** task.retryCount;
      task.retryCount += 1;
      clearTimer(taskKey);
      task.phase = 'scheduled';
      task.timer = setTimeout(() => {
        task.timer = null;
        task.phase = 'inflight';
        handler();
      }, delay);
      return true;
    },
    markRemoteUploaded(taskKey: string, signature: string): void {
      markRemoteUploaded(taskKey, signature);
    },
    markRemoteDeleted(taskKey: string): void {
      markRemoteDeleted(taskKey);
    },
    markUploaded(taskKey: string, signature: string): void {
      const task = getTask(taskKey);
      markRemoteUploaded(taskKey, signature);
      settleTask(task);
      clearTimer(taskKey);
    },
    markDeleted(taskKey: string): void {
      const task = getTask(taskKey);
      markRemoteDeleted(taskKey);
      settleTask(task);
      clearTimer(taskKey);
    },
    getLastUploadedSignature(taskKey: string): string | null {
      const remoteState = remoteStates.get(taskKey);
      return remoteState?.kind === 'uploaded' ? remoteState.signature : null;
    },
    hasRemoteDelete(taskKey: string): boolean {
      return remoteStates.get(taskKey)?.kind === 'deleted';
    },
    markBootstrapStarted(vaultPath: string): BootstrapRunToken {
      const token = Symbol(vaultPath);
      const state = bootstrapVaultStates.get(vaultPath) ?? {
        runs: new Set<BootstrapRunToken>(),
        hasLocalDocuments: false,
      };
      state.runs.add(token);
      bootstrapVaultStates.set(vaultPath, state);
      return token;
    },
    markBootstrapDocuments(
      vaultPath: string,
      token: BootstrapRunToken,
      hasLocalDocuments: boolean
    ): void {
      const state = bootstrapVaultStates.get(vaultPath);
      if (!state?.runs.has(token)) {
        return;
      }
      state.hasLocalDocuments = hasLocalDocuments;
    },
    markBootstrapFinished(vaultPath: string, token: BootstrapRunToken): void {
      const state = bootstrapVaultStates.get(vaultPath);
      if (!state) {
        return;
      }
      state.runs.delete(token);
    },
    getBootstrapState(vaultPath: string): { pending: boolean; hasLocalDocuments: boolean } {
      const state = bootstrapVaultStates.get(vaultPath);
      return {
        pending:
          (state?.runs.size ?? 0) > 0 || (bootstrapVaultLocalWorkCounts.get(vaultPath) ?? 0) > 0,
        hasLocalDocuments: state?.hasLocalDocuments ?? false,
      };
    },
    isBootstrapRunPending(vaultPath: string): boolean {
      return (bootstrapVaultStates.get(vaultPath)?.runs.size ?? 0) > 0;
    },
    resetTask(taskKey: string): void {
      const task = tasks.get(taskKey);
      if (task) {
        settleTask(task);
      }
      clearTimer(taskKey);
      tasks.delete(taskKey);
    },
    /** Returns absolute paths of all tasks with a pending timer. */
    getPendingPaths(): string[] {
      const paths: string[] = [];
      for (const task of tasks.values()) {
        if (task.timer && task.absolutePath) {
          paths.push(task.absolutePath);
        }
      }
      return paths;
    },
    reset(): void {
      for (const taskKey of tasks.keys()) {
        clearTimer(taskKey);
      }
      tasks.clear();
      remoteStates.clear();
      bootstrapVaultStates.clear();
      bootstrapVaultLocalWorkCounts.clear();
    },
  };
};
