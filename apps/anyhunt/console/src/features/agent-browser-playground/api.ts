/**
 * [PROVIDES]: Agent/Browser Playground API calls
 * [DEPENDS]: apiClient, CONSOLE_PLAYGROUND_API
 * [POS]: Console Playground 代理请求封装
 */

import { apiClient } from '@/lib/api-client';
import { CONSOLE_PLAYGROUND_API } from '@/lib/api-paths';
import type {
  AgentCancelResponse,
  AgentEstimateResponse,
  AgentTaskResult,
  BrowserActionResponse,
  BrowserDeltaSnapshotResponse,
  BrowserNetworkRequestRecord,
  BrowserOpenResponse,
  BrowserScreenshotResponse,
  BrowserSessionInfo,
  BrowserSnapshotResponse,
  BrowserStorageExportResult,
  BrowserTabInfo,
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
  return apiClient.get(withQuery(`${CONSOLE_PLAYGROUND_API.AGENT}/${taskId}`, { apiKeyId }));
}

export async function cancelAgentTask(
  apiKeyId: string,
  taskId: string
): Promise<AgentCancelResponse> {
  return apiClient.delete(withQuery(`${CONSOLE_PLAYGROUND_API.AGENT}/${taskId}`, { apiKeyId }));
}
