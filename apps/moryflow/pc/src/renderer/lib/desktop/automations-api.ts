import type {
  AutomationBindEndpointInput,
  AutomationCreateInput,
  AutomationEndpoint,
  AutomationJob,
  AutomationListRunsInput,
  AutomationRemoveEndpointInput,
  AutomationRunRecord,
  AutomationSetDefaultEndpointInput,
  AutomationToggleInput,
  AutomationUpdateEndpointInput,
} from '@shared/ipc';

const getAutomationsApi = () => {
  const api = window.desktopAPI?.automations;
  if (!api) {
    throw new Error('desktopAPI.automations is not available');
  }
  return api;
};

export const listAutomations = async (): Promise<AutomationJob[]> => {
  return getAutomationsApi().listAutomations();
};

export const getAutomation = async (jobId: string): Promise<AutomationJob | null> => {
  return getAutomationsApi().getAutomation({ jobId });
};

export const createAutomation = async (input: AutomationCreateInput): Promise<AutomationJob> => {
  return getAutomationsApi().createAutomation(input);
};

export const updateAutomation = async (job: AutomationJob): Promise<AutomationJob> => {
  return getAutomationsApi().updateAutomation(job);
};

export const deleteAutomation = async (jobId: string): Promise<void> => {
  await getAutomationsApi().deleteAutomation({ jobId });
};

export const toggleAutomation = async (input: AutomationToggleInput): Promise<AutomationJob> => {
  return getAutomationsApi().toggleAutomation(input);
};

export const runAutomationNow = async (jobId: string): Promise<AutomationJob> => {
  return getAutomationsApi().runAutomationNow({ jobId });
};

export const listAutomationRuns = async (
  input?: AutomationListRunsInput
): Promise<AutomationRunRecord[]> => {
  return getAutomationsApi().listRuns(input);
};

export const listAutomationEndpoints = async (): Promise<AutomationEndpoint[]> => {
  return getAutomationsApi().listEndpoints();
};

export const getDefaultAutomationEndpoint = async (): Promise<AutomationEndpoint | null> => {
  return getAutomationsApi().getDefaultEndpoint();
};

export const bindAutomationEndpoint = async (
  input: AutomationBindEndpointInput
): Promise<AutomationEndpoint> => {
  return getAutomationsApi().bindEndpoint(input);
};

export const updateAutomationEndpoint = async (
  input: AutomationUpdateEndpointInput
): Promise<AutomationEndpoint> => {
  return getAutomationsApi().updateEndpoint(input);
};

export const removeAutomationEndpoint = async (
  input: AutomationRemoveEndpointInput
): Promise<void> => {
  await getAutomationsApi().removeEndpoint(input);
};

export const setDefaultAutomationEndpoint = async (
  input?: AutomationSetDefaultEndpointInput
): Promise<void> => {
  await getAutomationsApi().setDefaultEndpoint(input);
};
