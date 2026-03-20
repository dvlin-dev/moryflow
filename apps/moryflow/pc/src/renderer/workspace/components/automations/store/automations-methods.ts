import type {
  AutomationCreateInput,
  AutomationJob,
  AutomationRunRecord,
  TelegramKnownChat,
} from '@shared/ipc';
import {
  createAutomation,
  deleteAutomation,
  listAutomationRuns,
  listAutomations,
  listKnownChats,
  runAutomationNow,
  toggleAutomation,
  updateAutomation,
} from '@/lib/desktop/automations-api';
import { automationsStore } from './use-automations-store';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;

const refreshAutomations = async (): Promise<AutomationJob[]> => {
  const jobs = await listAutomations();
  const state = automationsStore.getState();
  state.setAutomations(jobs);
  if (jobs.length === 0) {
    state.setSelectedAutomationId(null);
    return jobs;
  }
  const selectedId = state.selectedAutomationId;
  if (selectedId === null && state.isHydrated) {
    return jobs;
  }
  if (!selectedId || !jobs.some((item: AutomationJob) => item.id === selectedId)) {
    state.setSelectedAutomationId(jobs[0]?.id ?? null);
  }
  return jobs;
};

const refreshKnownChats = async (): Promise<TelegramKnownChat[]> => {
  const chats = await listKnownChats();
  automationsStore.getState().setKnownChats(chats);
  return chats;
};

const refreshRuns = async (jobId?: string | null): Promise<AutomationRunRecord[]> => {
  const runs = await listAutomationRuns(jobId ? { jobId, limit: 20 } : { limit: 20 });
  if (jobId) {
    automationsStore.getState().setRunsForJob(jobId, runs);
  }
  return runs;
};

export const automationsMethods = {
  async hydrate(): Promise<void> {
    const state = automationsStore.getState();
    state.setLoading(true);
    state.setErrorMessage(null);
    try {
      await Promise.all([refreshAutomations(), refreshKnownChats()]);
      const selectedId = automationsStore.getState().selectedAutomationId;
      if (selectedId) {
        await refreshRuns(selectedId);
      }
      automationsStore.getState().setHydrated(true);
    } catch (error) {
      automationsStore
        .getState()
        .setErrorMessage(getErrorMessage(error, 'Failed to load automations.'));
    } finally {
      automationsStore.getState().setLoading(false);
    }
  },

  selectAutomation(jobId: string | null): void {
    automationsStore.getState().setSelectedAutomationId(jobId);
    if (jobId) {
      void refreshRuns(jobId).catch((error) => {
        automationsStore
          .getState()
          .setErrorMessage(getErrorMessage(error, 'Failed to load run history.'));
      });
    }
  },

  async createAutomation(input: AutomationCreateInput): Promise<AutomationJob> {
    const state = automationsStore.getState();
    state.setSaving(true);
    state.setErrorMessage(null);
    try {
      const job = await createAutomation(input);
      state.patchAutomation(job);
      state.setSelectedAutomationId(job.id);
      await refreshRuns(job.id);
      return job;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create automation.');
      state.setErrorMessage(message);
      throw new Error(message);
    } finally {
      state.setSaving(false);
    }
  },

  async updateAutomation(job: AutomationJob): Promise<AutomationJob> {
    const state = automationsStore.getState();
    state.setSaving(true);
    state.setErrorMessage(null);
    try {
      const nextJob = await updateAutomation(job);
      state.patchAutomation(nextJob);
      return nextJob;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update automation.');
      state.setErrorMessage(message);
      throw new Error(message);
    } finally {
      state.setSaving(false);
    }
  },

  async deleteAutomation(jobId: string): Promise<void> {
    const state = automationsStore.getState();
    state.setSaving(true);
    state.setErrorMessage(null);
    try {
      await deleteAutomation(jobId);
      state.removeAutomation(jobId);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete automation.');
      state.setErrorMessage(message);
      throw new Error(message);
    } finally {
      state.setSaving(false);
    }
  },

  async toggleAutomation(jobId: string, enabled: boolean): Promise<AutomationJob> {
    const state = automationsStore.getState();
    state.setSaving(true);
    state.setErrorMessage(null);
    try {
      const job = await toggleAutomation({ jobId, enabled });
      state.patchAutomation(job);
      return job;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update automation status.');
      state.setErrorMessage(message);
      throw new Error(message);
    } finally {
      state.setSaving(false);
    }
  },

  async runNow(jobId: string): Promise<AutomationJob> {
    const state = automationsStore.getState();
    state.setSaving(true);
    state.setErrorMessage(null);
    try {
      const job = await runAutomationNow(jobId);
      state.patchAutomation(job);
      await refreshRuns(jobId);
      return job;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to run automation.');
      state.setErrorMessage(message);
      throw new Error(message);
    } finally {
      state.setSaving(false);
    }
  },

  refreshKnownChats,
  refreshRuns,
};
