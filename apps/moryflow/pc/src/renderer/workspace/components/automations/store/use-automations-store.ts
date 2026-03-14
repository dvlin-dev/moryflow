import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { AutomationJob, AutomationRunRecord, TelegramKnownChat } from '@shared/ipc';

export type AutomationsState = {
  isHydrated: boolean;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  automations: AutomationJob[];
  knownChats: TelegramKnownChat[];
  selectedAutomationId: string | null;
  runsByJobId: Record<string, AutomationRunRecord[]>;
  setHydrated: (isHydrated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setErrorMessage: (errorMessage: string | null) => void;
  setAutomations: (automations: AutomationJob[]) => void;
  setKnownChats: (knownChats: TelegramKnownChat[]) => void;
  setSelectedAutomationId: (selectedAutomationId: string | null) => void;
  setRunsForJob: (jobId: string, runs: AutomationRunRecord[]) => void;
  patchAutomation: (job: AutomationJob) => void;
  removeAutomation: (jobId: string) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  isHydrated: false,
  isLoading: false,
  isSaving: false,
  errorMessage: null,
  automations: [],
  knownChats: [],
  selectedAutomationId: null,
  runsByJobId: {},
} satisfies Omit<
  AutomationsState,
  | 'setHydrated'
  | 'setLoading'
  | 'setSaving'
  | 'setErrorMessage'
  | 'setAutomations'
  | 'setKnownChats'
  | 'setSelectedAutomationId'
  | 'setRunsForJob'
  | 'patchAutomation'
  | 'removeAutomation'
  | 'reset'
>;

const sortAutomations = (jobs: AutomationJob[]) =>
  [...jobs].sort((left, right) => right.updatedAt - left.updatedAt);

export const automationsStore = createStore<AutomationsState>()((set) => ({
  ...INITIAL_STATE,
  setHydrated: (isHydrated) => set({ isHydrated }),
  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setAutomations: (automations) => set({ automations: sortAutomations(automations) }),
  setKnownChats: (knownChats) => set({ knownChats }),
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
  reset: () => set(INITIAL_STATE),
}));

export const useAutomationsStore = <T>(selector: (state: AutomationsState) => T): T =>
  useStore(automationsStore, selector);

export const resetAutomationsStore = (): void => {
  automationsStore.getState().reset();
};
