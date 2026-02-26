/**
 * [PROVIDES]: Agent Playground API calls（estimate/models/task）
 * [DEPENDS]: ApiKeyClient, AGENT_API
 * [POS]: Agent Browser Playground Agent 域 API 封装
 */

import { createApiKeyClient } from '@/features/playground-shared/api-key-client';
import { AGENT_API } from '@/lib/api-paths';
import type {
  AgentCancelResponse,
  AgentEstimateResponse,
  AgentModelListResponse,
  AgentTaskResult,
} from './types';

const createClient = (apiKey: string) => createApiKeyClient({ apiKey });

const AGENT_TASK_ID_PATTERN = /^at_[a-z0-9]+_[a-z0-9]+$/;

const assertAgentTaskId = (taskId: string) => {
  if (!taskId || !AGENT_TASK_ID_PATTERN.test(taskId)) {
    throw new Error('Task id is required');
  }
};

export async function estimateAgentCost(
  apiKey: string,
  input: Record<string, unknown>
): Promise<AgentEstimateResponse> {
  const client = createClient(apiKey);
  return client.post(AGENT_API.ESTIMATE, input);
}

export async function listAgentModels(apiKey: string): Promise<AgentModelListResponse> {
  const client = createClient(apiKey);
  return client.get(AGENT_API.MODELS);
}

export async function executeAgentTask(
  apiKey: string,
  input: Record<string, unknown>
): Promise<AgentTaskResult> {
  const client = createClient(apiKey);
  return client.post(AGENT_API.BASE, { ...input, stream: false });
}

export async function getAgentTaskStatus(
  apiKey: string,
  taskId: string
): Promise<AgentTaskResult | null> {
  assertAgentTaskId(taskId);
  const client = createClient(apiKey);
  return client.get(`${AGENT_API.BASE}/${taskId}`);
}

export async function cancelAgentTask(
  apiKey: string,
  taskId: string
): Promise<AgentCancelResponse> {
  assertAgentTaskId(taskId);
  const client = createClient(apiKey);
  return client.delete(`${AGENT_API.BASE}/${taskId}`);
}
