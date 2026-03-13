import {
  automationEndpointSchema,
  automationJobSchema,
  type AutomationEndpoint,
  type AutomationJob,
} from '@moryflow/automations-core';
import { createDesktopStore } from '../store-factory.js';

type AutomationStoreShape = {
  jobsById: Record<string, AutomationJob>;
  endpointsById: Record<string, AutomationEndpoint>;
  defaultEndpointId?: string;
};

const STORE_NAME = 'automations';

const DEFAULT_STORE: AutomationStoreShape = {
  jobsById: {},
  endpointsById: {},
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

const normalizeEndpoints = (endpointsById: Record<string, AutomationEndpoint> | undefined) => {
  const next: Record<string, AutomationEndpoint> = {};
  for (const [endpointId, endpoint] of Object.entries(endpointsById ?? {})) {
    const parsed = automationEndpointSchema.safeParse(endpoint);
    if (!parsed.success) {
      continue;
    }
    next[endpointId] = parsed.data;
  }
  return next;
};

const sortJobs = (jobs: AutomationJob[]) =>
  jobs.sort((left, right) => right.updatedAt - left.updatedAt);

const sortEndpoints = (endpoints: AutomationEndpoint[]) =>
  endpoints.sort((left, right) => {
    const leftRank = left.lastUsedAt ? Date.parse(left.lastUsedAt) : 0;
    const rightRank = right.lastUsedAt ? Date.parse(right.lastUsedAt) : 0;
    return rightRank - leftRank || left.label.localeCompare(right.label);
  });

export const createAutomationStore = () => {
  const store = createDesktopStore<AutomationStoreShape>({
    name: STORE_NAME,
    defaults: DEFAULT_STORE,
  });

  const normalizeShape = (shape: AutomationStoreShape): AutomationStoreShape => ({
    jobsById: normalizeJobs(shape.jobsById),
    endpointsById: normalizeEndpoints(shape.endpointsById),
    ...(shape.defaultEndpointId ? { defaultEndpointId: shape.defaultEndpointId } : {}),
  });

  const readShape = (): AutomationStoreShape => {
    const jobsById = normalizeJobs(store.get('jobsById') ?? DEFAULT_STORE.jobsById);
    const endpointsById = normalizeEndpoints(
      store.get('endpointsById') ?? DEFAULT_STORE.endpointsById
    );
    const defaultEndpointId = store.get('defaultEndpointId');

    if (defaultEndpointId && !endpointsById[defaultEndpointId]) {
      const cleaned = normalizeShape({ jobsById, endpointsById });
      store.store = cloneValue(cleaned);
      return cleaned;
    }

    return normalizeShape({
      jobsById,
      endpointsById,
      ...(defaultEndpointId ? { defaultEndpointId } : {}),
    });
  };

  const writeShape = (shape: AutomationStoreShape) => {
    store.store = cloneValue(normalizeShape(shape));
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
    listEndpoints(): AutomationEndpoint[] {
      return sortEndpoints(Object.values(readShape().endpointsById)).map(cloneValue);
    },
    getEndpoint(endpointId: string): AutomationEndpoint | null {
      return cloneValue(readShape().endpointsById[endpointId] ?? null);
    },
    saveEndpoint(endpoint: AutomationEndpoint): AutomationEndpoint {
      const parsed = automationEndpointSchema.parse(endpoint);
      const shape = readShape();
      shape.endpointsById[parsed.id] = parsed;
      writeShape(shape);
      return cloneValue(parsed);
    },
    removeEndpoint(endpointId: string): void {
      const shape = readShape();
      delete shape.endpointsById[endpointId];
      if (shape.defaultEndpointId === endpointId) {
        delete shape.defaultEndpointId;
      }
      writeShape(shape);
    },
    setDefaultEndpoint(endpointId?: string): void {
      const shape = readShape();
      if (!endpointId) {
        delete shape.defaultEndpointId;
        writeShape(shape);
        return;
      }
      const endpoint = shape.endpointsById[endpointId];
      if (!endpoint) {
        throw new Error('Automation endpoint not found.');
      }
      if (!endpoint.verifiedAt) {
        throw new Error('Only verified endpoints can be set as default.');
      }
      shape.defaultEndpointId = endpointId;
      writeShape(shape);
    },
    getDefaultEndpoint(): AutomationEndpoint | null {
      const shape = readShape();
      if (!shape.defaultEndpointId) {
        return null;
      }
      return cloneValue(shape.endpointsById[shape.defaultEndpointId] ?? null);
    },
    reset(): void {
      writeShape(DEFAULT_STORE);
    },
  };
};

export type AutomationStore = ReturnType<typeof createAutomationStore>;
