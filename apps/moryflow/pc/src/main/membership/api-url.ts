import { MEMBERSHIP_API_URL as MEMBERSHIP_API_URL_DEFAULT } from '@moryflow/api';

type ProcessEnvShape = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const processEnv = (globalThis as ProcessEnvShape).process?.env;

const configuredMembershipApiUrl =
  viteEnv?.VITE_MEMBERSHIP_API_URL ?? processEnv?.VITE_MEMBERSHIP_API_URL;

export const MEMBERSHIP_API_URL = configuredMembershipApiUrl?.trim() || MEMBERSHIP_API_URL_DEFAULT;
