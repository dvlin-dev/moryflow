/**
 * [PROVIDES]: Agent/Browser Playground API calls（含诊断/流式/Profile）
 * [DEPENDS]: apiClient, CONSOLE_PLAYGROUND_API
 * [POS]: Console Playground 代理请求封装
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { apiClient } from '@/lib/api-client';
import { CONSOLE_PLAYGROUND_API } from '@/lib/api-paths';
import type {
  AgentCancelResponse,
  AgentEstimateResponse,
  AgentModelListResponse,
  AgentTaskResult,
  BrowserActionResponse,
  BrowserActionBatchResponse,
  BrowserConsoleMessage,
  BrowserDeltaSnapshotResponse,
  BrowserHarStartResult,
  BrowserHarStopResult,
  BrowserHeadersResult,
  BrowserNetworkRequestRecord,
  BrowserOpenResponse,
  BrowserPageError,
  BrowserProfileLoadResult,
  BrowserProfileSaveResult,
  BrowserScreenshotResponse,
  BrowserSessionInfo,
  BrowserSnapshotResponse,
  BrowserStorageExportResult,
  BrowserStreamTokenResult,
  BrowserTabInfo,
  BrowserTraceStartResult,
  BrowserTraceStopResult,
  BrowserWindowInfo,
} from './types';

const withQuery = (endpoint: string, query: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const queryString = params.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

const AGENT_TASK_ID_PATTERN = /^at_[a-z0-9]+_[a-z0-9]+$/;

const assertAgentTaskId = (taskId: string) => {
  if (!taskId || !AGENT_TASK_ID_PATTERN.test(taskId)) {
    throw new Error('Task id is required');
  }
};

export async function createBrowserSession(
  apiKeyId: string,
  options?: Record<string, unknown>
): Promise<BrowserSessionInfo> {
  return apiClient.post(CONSOLE_PLAYGROUND_API.BROWSER_SESSION, {
    apiKeyId,
    ...(options ?? {}),
  });
}

export async function getBrowserSessionStatus(
  apiKeyId: string,
  sessionId: string
): Promise<BrowserSessionInfo> {
  return apiClient.get(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}`, { apiKeyId })
  );
}

export async function closeBrowserSession(apiKeyId: string, sessionId: string) {
  return apiClient.delete(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}`, { apiKeyId })
  );
}

export async function openBrowserUrl(
  apiKeyId: string,
  sessionId: string,
  options: Record<string, unknown>
): Promise<BrowserOpenResponse> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/open`, {
    apiKeyId,
    ...options,
  });
}

export async function getBrowserSnapshot(
  apiKeyId: string,
  sessionId: string,
  options?: Record<string, unknown>
): Promise<BrowserSnapshotResponse> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/snapshot`, {
    apiKeyId,
    ...(options ?? {}),
  });
}

export async function getBrowserDeltaSnapshot(
  apiKeyId: string,
  sessionId: string,
  options?: Record<string, unknown>
): Promise<BrowserDeltaSnapshotResponse> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/snapshot/delta`, {
    apiKeyId,
    ...(options ?? {}),
  });
}

export async function executeBrowserAction(
  apiKeyId: string,
  sessionId: string,
  action: Record<string, unknown>
): Promise<BrowserActionResponse> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/action`, {
    apiKeyId,
    ...action,
  });
}

export async function executeBrowserActionBatch(
  apiKeyId: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserActionBatchResponse> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/action/batch`, {
    apiKeyId,
    ...input,
  });
}

export async function getBrowserScreenshot(
  apiKeyId: string,
  sessionId: string,
  options?: Record<string, unknown>
): Promise<BrowserScreenshotResponse> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/screenshot`, {
    apiKeyId,
    ...(options ?? {}),
  });
}

export async function createBrowserTab(
  apiKeyId: string,
  sessionId: string
): Promise<BrowserTabInfo> {
  return apiClient.post(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/tabs`, { apiKeyId })
  );
}

export async function listBrowserTabs(
  apiKeyId: string,
  sessionId: string
): Promise<BrowserTabInfo[]> {
  return apiClient.get(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/tabs`, { apiKeyId })
  );
}

export async function switchBrowserTab(
  apiKeyId: string,
  sessionId: string,
  tabIndex: number
): Promise<BrowserTabInfo> {
  return apiClient.post(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/tabs/${tabIndex}/activate`, {
      apiKeyId,
    })
  );
}

export async function closeBrowserTab(apiKeyId: string, sessionId: string, tabIndex: number) {
  return apiClient.delete(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/tabs/${tabIndex}`, {
      apiKeyId,
    })
  );
}

export async function getDialogHistory(apiKeyId: string, sessionId: string): Promise<unknown[]> {
  return apiClient.get<unknown[]>(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/dialogs`, {
      apiKeyId,
    })
  );
}

export async function createBrowserWindow(
  apiKeyId: string,
  sessionId: string,
  options?: Record<string, unknown>
): Promise<BrowserWindowInfo> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/windows`, {
    apiKeyId,
    ...(options ?? {}),
  });
}

export async function listBrowserWindows(
  apiKeyId: string,
  sessionId: string
): Promise<BrowserWindowInfo[]> {
  return apiClient.get(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/windows`, { apiKeyId })
  );
}

export async function switchBrowserWindow(
  apiKeyId: string,
  sessionId: string,
  windowIndex: number
): Promise<BrowserWindowInfo> {
  return apiClient.post(
    withQuery(
      `${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/windows/${windowIndex}/activate`,
      { apiKeyId }
    )
  );
}

export async function closeBrowserWindow(apiKeyId: string, sessionId: string, windowIndex: number) {
  return apiClient.delete(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/windows/${windowIndex}`, {
      apiKeyId,
    })
  );
}

export async function connectBrowserCdp(
  apiKeyId: string,
  options: Record<string, unknown>
): Promise<BrowserSessionInfo> {
  return apiClient.post<BrowserSessionInfo>(CONSOLE_PLAYGROUND_API.BROWSER_CDP_CONNECT, {
    apiKeyId,
    ...options,
  });
}

export async function setInterceptRules(apiKeyId: string, sessionId: string, rules: unknown[]) {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/intercept/rules`, {
    apiKeyId,
    rules,
  });
}

export async function addInterceptRule(
  apiKeyId: string,
  sessionId: string,
  rule: Record<string, unknown>
) {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/intercept/rule`, {
    apiKeyId,
    ...rule,
  });
}

export async function removeInterceptRule(apiKeyId: string, sessionId: string, ruleId: string) {
  return apiClient.delete(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/intercept/rule/${ruleId}`, {
      apiKeyId,
    })
  );
}

export async function clearInterceptRules(apiKeyId: string, sessionId: string) {
  return apiClient.delete(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/intercept/rules`, {
      apiKeyId,
    })
  );
}

export async function getInterceptRules(apiKeyId: string, sessionId: string): Promise<unknown[]> {
  return apiClient.get<unknown[]>(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/intercept/rules`, {
      apiKeyId,
    })
  );
}

export async function getNetworkHistory(
  apiKeyId: string,
  sessionId: string,
  options?: { limit?: number; urlFilter?: string }
): Promise<BrowserNetworkRequestRecord[]> {
  return apiClient.get(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/network/history`, {
      apiKeyId,
      limit: options?.limit?.toString(),
      urlFilter: options?.urlFilter,
    })
  );
}

export async function clearNetworkHistory(apiKeyId: string, sessionId: string) {
  return apiClient.delete(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/network/history`, {
      apiKeyId,
    })
  );
}

export async function setBrowserHeaders(
  apiKeyId: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserHeadersResult> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/headers`, {
    apiKeyId,
    ...input,
  });
}

export async function clearBrowserHeaders(
  apiKeyId: string,
  sessionId: string,
  input: Record<string, unknown>
) {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/headers/clear`, {
    apiKeyId,
    ...input,
  });
}

export async function getBrowserConsoleMessages(
  apiKeyId: string,
  sessionId: string,
  options?: { limit?: number }
): Promise<BrowserConsoleMessage[]> {
  return apiClient.get(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/console`, {
      apiKeyId,
      limit: options?.limit?.toString(),
    })
  );
}

export async function clearBrowserConsoleMessages(apiKeyId: string, sessionId: string) {
  return apiClient.delete(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/console`, { apiKeyId })
  );
}

export async function getBrowserPageErrors(
  apiKeyId: string,
  sessionId: string,
  options?: { limit?: number }
): Promise<BrowserPageError[]> {
  return apiClient.get(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/errors`, {
      apiKeyId,
      limit: options?.limit?.toString(),
    })
  );
}

export async function clearBrowserPageErrors(apiKeyId: string, sessionId: string) {
  return apiClient.delete(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/errors`, { apiKeyId })
  );
}

export async function startBrowserTrace(
  apiKeyId: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserTraceStartResult> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/trace/start`, {
    apiKeyId,
    ...input,
  });
}

export async function stopBrowserTrace(
  apiKeyId: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserTraceStopResult> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/trace/stop`, {
    apiKeyId,
    ...input,
  });
}

export async function startBrowserHar(
  apiKeyId: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserHarStartResult> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/har/start`, {
    apiKeyId,
    ...input,
  });
}

export async function stopBrowserHar(
  apiKeyId: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserHarStopResult> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/har/stop`, {
    apiKeyId,
    ...input,
  });
}

export async function saveBrowserProfile(
  apiKeyId: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserProfileSaveResult> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/profile/save`, {
    apiKeyId,
    ...input,
  });
}

export async function loadBrowserProfile(
  apiKeyId: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserProfileLoadResult> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/profile/load`, {
    apiKeyId,
    ...input,
  });
}

export async function createBrowserStreamToken(
  apiKeyId: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserStreamTokenResult> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/stream`, {
    apiKeyId,
    ...input,
  });
}

export async function exportBrowserStorage(
  apiKeyId: string,
  sessionId: string,
  options?: Record<string, unknown>
): Promise<BrowserStorageExportResult> {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/storage/export`, {
    apiKeyId,
    ...(options ?? {}),
  });
}

export async function importBrowserStorage(
  apiKeyId: string,
  sessionId: string,
  data: Record<string, unknown>
) {
  return apiClient.post(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/storage/import`, {
    apiKeyId,
    ...data,
  });
}

export async function clearBrowserStorage(apiKeyId: string, sessionId: string) {
  return apiClient.delete(
    withQuery(`${CONSOLE_PLAYGROUND_API.BROWSER_SESSION}/${sessionId}/storage`, {
      apiKeyId,
    })
  );
}

export async function estimateAgentCost(
  apiKeyId: string,
  input: Record<string, unknown>
): Promise<AgentEstimateResponse> {
  return apiClient.post(CONSOLE_PLAYGROUND_API.AGENT_ESTIMATE, {
    apiKeyId,
    ...input,
  });
}

export async function listAgentModels(apiKeyId: string): Promise<AgentModelListResponse> {
  return apiClient.get(withQuery(CONSOLE_PLAYGROUND_API.AGENT_MODELS, { apiKeyId }));
}

export async function executeAgentTask(
  apiKeyId: string,
  input: Record<string, unknown>
): Promise<AgentTaskResult> {
  return apiClient.post(CONSOLE_PLAYGROUND_API.AGENT, {
    apiKeyId,
    ...input,
  });
}

export async function getAgentTaskStatus(
  apiKeyId: string,
  taskId: string
): Promise<AgentTaskResult | null> {
  assertAgentTaskId(taskId);
  return apiClient.get(withQuery(`${CONSOLE_PLAYGROUND_API.AGENT}/${taskId}`, { apiKeyId }));
}

export async function cancelAgentTask(
  apiKeyId: string,
  taskId: string
): Promise<AgentCancelResponse> {
  assertAgentTaskId(taskId);
  return apiClient.delete(withQuery(`${CONSOLE_PLAYGROUND_API.AGENT}/${taskId}`, { apiKeyId }));
}
