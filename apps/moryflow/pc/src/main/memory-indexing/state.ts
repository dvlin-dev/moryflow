const DEFAULT_DEBOUNCE_MS = 2_000;
const MAX_RETRY_COUNT = 3;

export interface MemoryIndexingTaskState {
  timer: NodeJS.Timeout | null;
  retryCount: number;
  lastUploadedSignature: string | null;
  absolutePath: string | null;
}

type BootstrapRunToken = symbol;

interface BootstrapVaultState {
  runs: Set<BootstrapRunToken>;
  hasLocalDocuments: boolean;
}

const createTaskState = (): MemoryIndexingTaskState => ({
  timer: null,
  retryCount: 0,
  lastUploadedSignature: null,
  absolutePath: null,
});

export const createMemoryIndexingState = () => {
  const tasks = new Map<string, MemoryIndexingTaskState>();
  const bootstrapVaultStates = new Map<string, BootstrapVaultState>();
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

  return {
    debounceMs: DEFAULT_DEBOUNCE_MS,
    maxRetryCount: MAX_RETRY_COUNT,
    getTask,
    schedule(taskKey: string, handler: () => void, absolutePath?: string): void {
      const task = getTask(taskKey);
      clearTimer(taskKey);
      if (absolutePath) {
        task.absolutePath = absolutePath;
      }
      task.timer = setTimeout(() => {
        task.timer = null;
        handler();
      }, DEFAULT_DEBOUNCE_MS);
    },
    scheduleRetry(taskKey: string, handler: () => void): boolean {
      const task = getTask(taskKey);
      if (task.retryCount >= MAX_RETRY_COUNT) {
        return false;
      }
      const delay = 500 * 2 ** task.retryCount;
      task.retryCount += 1;
      clearTimer(taskKey);
      task.timer = setTimeout(() => {
        task.timer = null;
        handler();
      }, delay);
      return true;
    },
    markUploaded(taskKey: string, signature: string): void {
      const task = getTask(taskKey);
      task.retryCount = 0;
      task.lastUploadedSignature = signature;
      clearTimer(taskKey);
    },
    getLastUploadedSignature(taskKey: string): string | null {
      return tasks.get(taskKey)?.lastUploadedSignature ?? null;
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
        pending: (state?.runs.size ?? 0) > 0,
        hasLocalDocuments: state?.hasLocalDocuments ?? false,
      };
    },
    resetTask(taskKey: string): void {
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
      bootstrapVaultStates.clear();
    },
  };
};
