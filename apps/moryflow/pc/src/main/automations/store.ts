import { automationJobSchema, type AutomationJob } from '@moryflow/automations-core';
import { createDesktopStore } from '../store-factory.js';

type AutomationStoreShape = {
  jobsById: Record<string, AutomationJob>;
};

const STORE_NAME = 'automations';

const DEFAULT_STORE: AutomationStoreShape = {
  jobsById: {},
};

const cloneValue = <T>(value: T): T => structuredClone(value);

const normalizeJobs = (jobsById: Record<string, AutomationJob> | undefined) => {
  const next: Record<string, AutomationJob> = {};
  for (const [jobId, job] of Object.entries(jobsById ?? {})) {
    const parsed = automationJobSchema.safeParse(job);
    if (!parsed.success) {
      continue;
    }
    next[jobId] = parsed.data;
  }
  return next;
};

const sortJobs = (jobs: AutomationJob[]) =>
  jobs.sort((left, right) => right.updatedAt - left.updatedAt);

export const createAutomationStore = () => {
  const store = createDesktopStore<AutomationStoreShape>({
    name: STORE_NAME,
    defaults: DEFAULT_STORE,
  });
  const listeners = new Set<() => void>();

  const readShape = (): AutomationStoreShape => ({
    jobsById: normalizeJobs(store.get('jobsById') ?? DEFAULT_STORE.jobsById),
  });

  const writeShape = (shape: AutomationStoreShape) => {
    store.store = cloneValue({ jobsById: normalizeJobs(shape.jobsById) });
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    listJobs(): AutomationJob[] {
      return sortJobs(Object.values(readShape().jobsById)).map(cloneValue);
    },
    getJob(jobId: string): AutomationJob | null {
      return cloneValue(readShape().jobsById[jobId] ?? null);
    },
    saveJob(job: AutomationJob): AutomationJob {
      const parsed = automationJobSchema.parse(job);
      const shape = readShape();
      shape.jobsById[parsed.id] = parsed;
      writeShape(shape);
      return cloneValue(parsed);
    },
    removeJob(jobId: string): void {
      const shape = readShape();
      delete shape.jobsById[jobId];
      writeShape(shape);
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset(): void {
      writeShape(DEFAULT_STORE);
    },
  };
};

export type AutomationStore = ReturnType<typeof createAutomationStore>;
