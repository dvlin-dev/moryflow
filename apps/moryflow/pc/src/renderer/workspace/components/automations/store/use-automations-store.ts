import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { AutomationEndpoint, AutomationJob, AutomationRunRecord } from '@shared/ipc';

export type AutomationsState = {
  isHydrated: boolean;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  automations: AutomationJob[];
  endpoints: AutomationEndpoint[];
  defaultEndpointId: string | null;
  selectedAutomationId: string | null;
  runsByJobId: Record<string, AutomationRunRecord[]>;
  setHydrated: (isHydrated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setErrorMessage: (errorMessage: string | null) => void;
  setAutomations: (automations: AutomationJob[]) => void;
  setEndpoints: (endpoints: AutomationEndpoint[]) => void;
  setDefaultEndpointId: (defaultEndpointId: string | null) => void;
  setSelectedAutomationId: (selectedAutomationId: string | null) => void;
  setRunsForJob: (jobId: string, runs: AutomationRunRecord[]) => void;
  patchAutomation: (job: AutomationJob) => void;
  removeAutomation: (jobId: string) => void;
  patchEndpoint: (endpoint: AutomationEndpoint) => void;
  removeEndpoint: (endpointId: string) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  isHydrated: false,
  isLoading: false,
  isSaving: false,
  errorMessage: null,
  automations: [],
  endpoints: [],
  defaultEndpointId: null,
  selectedAutomationId: null,
  runsByJobId: {},
} satisfies Omit<
  AutomationsState,
  | 'setHydrated'
  | 'setLoading'
  | 'setSaving'
  | 'setErrorMessage'
  | 'setAutomations'
  | 'setEndpoints'
  | 'setDefaultEndpointId'
  | 'setSelectedAutomationId'
  | 'setRunsForJob'
  | 'patchAutomation'
  | 'removeAutomation'
  | 'patchEndpoint'
  | 'removeEndpoint'
  | 'reset'
>;

const sortAutomations = (jobs: AutomationJob[]) =>
  [...jobs].sort((left, right) => right.updatedAt - left.updatedAt);

const sortEndpoints = (endpoints: AutomationEndpoint[]) =>
  [...endpoints].sort((left, right) => {
    const leftRank = left.lastUsedAt ? Date.parse(left.lastUsedAt) : 0;
    const rightRank = right.lastUsedAt ? Date.parse(right.lastUsedAt) : 0;
    return rightRank - leftRank || left.label.localeCompare(right.label);
  });

export const automationsStore = createStore<AutomationsState>()((set) => ({
  ...INITIAL_STATE,
  setHydrated: (isHydrated) => set({ isHydrated }),
  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setAutomations: (automations) => set({ automations: sortAutomations(automations) }),
  setEndpoints: (endpoints) => set({ endpoints: sortEndpoints(endpoints) }),
  setDefaultEndpointId: (defaultEndpointId) => set({ defaultEndpointId }),
  setSelectedAutomationId: (selectedAutomationId) => set({ selectedAutomationId }),
  setRunsForJob: (jobId, runs) =>
    set((state) => ({
      runsByJobId: {
        ...state.runsByJobId,
        [jobId]: runs,
      },
    })),
  patchAutomation: (job) =>
    set((state) => ({
      automations: sortAutomations([
        job,
        ...state.automations.filter((item) => item.id !== job.id),
      ]),
    })),
  removeAutomation: (jobId) =>
    set((state) => {
      const nextSelectedId =
        state.selectedAutomationId === jobId ? null : state.selectedAutomationId;
      const nextRunsByJobId = { ...state.runsByJobId };
      delete nextRunsByJobId[jobId];
      return {
        automations: state.automations.filter((item) => item.id !== jobId),
        selectedAutomationId: nextSelectedId,
        runsByJobId: nextRunsByJobId,
      };
    }),
  patchEndpoint: (endpoint) =>
    set((state) => ({
      endpoints: sortEndpoints([
        endpoint,
        ...state.endpoints.filter((item) => item.id !== endpoint.id),
      ]),
    })),
  removeEndpoint: (endpointId) =>
    set((state) => ({
      endpoints: state.endpoints.filter((item) => item.id !== endpointId),
      defaultEndpointId: state.defaultEndpointId === endpointId ? null : state.defaultEndpointId,
    })),
  reset: () => set(INITIAL_STATE),
}));

export const useAutomationsStore = <T>(selector: (state: AutomationsState) => T): T =>
  useStore(automationsStore, selector);

export const resetAutomationsStore = (): void => {
  automationsStore.getState().reset();
};
