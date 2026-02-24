/**
 * [PROVIDES]: Agent/Browser Playground API calls（含诊断/流式/Profile）
 * [DEPENDS]: ApiKeyClient, BROWSER_API, AGENT_API
 * [POS]: Console 调用公网 API 的封装
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { ApiKeyClient } from '@/features/playground-shared/api-key-client';
import { AGENT_API, BROWSER_API } from '@/lib/api-paths';
import type {
  AgentCancelResponse,
  AgentEstimateResponse,
  AgentModelListResponse,
  AgentTaskResult,
  BrowserActionResponse,
  BrowserActionBatchResponse,
  BrowserConsoleMessage,
  BrowserDetectionRiskSummary,
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

const createClient = (apiKey: string) => new ApiKeyClient({ apiKey });

const AGENT_TASK_ID_PATTERN = /^at_[a-z0-9]+_[a-z0-9]+$/;

const assertAgentTaskId = (taskId: string) => {
  if (!taskId || !AGENT_TASK_ID_PATTERN.test(taskId)) {
    throw new Error('Task id is required');
  }
};

export async function createBrowserSession(
  apiKey: string,
  options?: Record<string, unknown>
): Promise<BrowserSessionInfo> {
  const client = createClient(apiKey);
  return client.post(BROWSER_API.SESSION, options ?? {});
}

export async function getBrowserSessionStatus(
  apiKey: string,
  sessionId: string
): Promise<BrowserSessionInfo> {
  const client = createClient(apiKey);
  return client.get(`${BROWSER_API.SESSION}/${sessionId}`);
}

export async function closeBrowserSession(apiKey: string, sessionId: string) {
  const client = createClient(apiKey);
  return client.delete(`${BROWSER_API.SESSION}/${sessionId}`);
}

export async function openBrowserUrl(
  apiKey: string,
  sessionId: string,
  options: Record<string, unknown>
): Promise<BrowserOpenResponse> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/open`, options);
}

export async function getBrowserSnapshot(
  apiKey: string,
  sessionId: string,
  options?: Record<string, unknown>
): Promise<BrowserSnapshotResponse> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/snapshot`, options ?? {});
}

export async function getBrowserDeltaSnapshot(
  apiKey: string,
  sessionId: string,
  options?: Record<string, unknown>
): Promise<BrowserDeltaSnapshotResponse> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/snapshot/delta`, options ?? {});
}

export async function executeBrowserAction(
  apiKey: string,
  sessionId: string,
  action: Record<string, unknown>
): Promise<BrowserActionResponse> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/action`, action);
}

export async function executeBrowserActionBatch(
  apiKey: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserActionBatchResponse> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/action/batch`, input);
}

export async function getBrowserScreenshot(
  apiKey: string,
  sessionId: string,
  options?: Record<string, unknown>
): Promise<BrowserScreenshotResponse> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/screenshot`, options ?? {});
}

export async function createBrowserTab(apiKey: string, sessionId: string): Promise<BrowserTabInfo> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/tabs`);
}

export async function listBrowserTabs(
  apiKey: string,
  sessionId: string
): Promise<BrowserTabInfo[]> {
  const client = createClient(apiKey);
  return client.get(`${BROWSER_API.SESSION}/${sessionId}/tabs`);
}

export async function switchBrowserTab(
  apiKey: string,
  sessionId: string,
  tabIndex: number
): Promise<BrowserTabInfo> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/tabs/${tabIndex}/activate`);
}

export async function closeBrowserTab(apiKey: string, sessionId: string, tabIndex: number) {
  const client = createClient(apiKey);
  return client.delete(`${BROWSER_API.SESSION}/${sessionId}/tabs/${tabIndex}`);
}

export async function getDialogHistory(apiKey: string, sessionId: string): Promise<unknown[]> {
  const client = createClient(apiKey);
  return client.get<unknown[]>(`${BROWSER_API.SESSION}/${sessionId}/dialogs`);
}

export async function createBrowserWindow(
  apiKey: string,
  sessionId: string,
  options?: Record<string, unknown>
): Promise<BrowserWindowInfo> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/windows`, options ?? {});
}

export async function listBrowserWindows(
  apiKey: string,
  sessionId: string
): Promise<BrowserWindowInfo[]> {
  const client = createClient(apiKey);
  return client.get(`${BROWSER_API.SESSION}/${sessionId}/windows`);
}

export async function switchBrowserWindow(
  apiKey: string,
  sessionId: string,
  windowIndex: number
): Promise<BrowserWindowInfo> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/windows/${windowIndex}/activate`);
}

export async function closeBrowserWindow(apiKey: string, sessionId: string, windowIndex: number) {
  const client = createClient(apiKey);
  return client.delete(`${BROWSER_API.SESSION}/${sessionId}/windows/${windowIndex}`);
}

export async function connectBrowserCdp(
  apiKey: string,
  options: Record<string, unknown>
): Promise<BrowserSessionInfo> {
  const client = createClient(apiKey);
  return client.post<BrowserSessionInfo>(BROWSER_API.CDP_CONNECT, options);
}

export async function setInterceptRules(apiKey: string, sessionId: string, rules: unknown[]) {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/intercept/rules`, { rules });
}

export async function addInterceptRule(
  apiKey: string,
  sessionId: string,
  rule: Record<string, unknown>
) {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/intercept/rule`, rule);
}

export async function removeInterceptRule(apiKey: string, sessionId: string, ruleId: string) {
  const client = createClient(apiKey);
  return client.delete(`${BROWSER_API.SESSION}/${sessionId}/intercept/rule/${ruleId}`);
}

export async function clearInterceptRules(apiKey: string, sessionId: string) {
  const client = createClient(apiKey);
  return client.delete(`${BROWSER_API.SESSION}/${sessionId}/intercept/rules`);
}

export async function getInterceptRules(apiKey: string, sessionId: string): Promise<unknown[]> {
  const client = createClient(apiKey);
  return client.get<unknown[]>(`${BROWSER_API.SESSION}/${sessionId}/intercept/rules`);
}

export async function getNetworkHistory(
  apiKey: string,
  sessionId: string,
  options?: { limit?: number; urlFilter?: string }
): Promise<BrowserNetworkRequestRecord[]> {
  const client = createClient(apiKey);
  return client.get(
    withQuery(`${BROWSER_API.SESSION}/${sessionId}/network/history`, {
      limit: options?.limit?.toString(),
      urlFilter: options?.urlFilter,
    })
  );
}

export async function clearNetworkHistory(apiKey: string, sessionId: string) {
  const client = createClient(apiKey);
  return client.delete(`${BROWSER_API.SESSION}/${sessionId}/network/history`);
}

export async function setBrowserHeaders(
  apiKey: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserHeadersResult> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/headers`, input);
}

export async function clearBrowserHeaders(
  apiKey: string,
  sessionId: string,
  input: Record<string, unknown>
) {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/headers/clear`, input);
}

export async function getBrowserConsoleMessages(
  apiKey: string,
  sessionId: string,
  options?: { limit?: number }
): Promise<BrowserConsoleMessage[]> {
  const client = createClient(apiKey);
  return client.get(
    withQuery(`${BROWSER_API.SESSION}/${sessionId}/console`, {
      limit: options?.limit?.toString(),
    })
  );
}

export async function clearBrowserConsoleMessages(apiKey: string, sessionId: string) {
  const client = createClient(apiKey);
  return client.delete(`${BROWSER_API.SESSION}/${sessionId}/console`);
}

export async function getBrowserPageErrors(
  apiKey: string,
  sessionId: string,
  options?: { limit?: number }
): Promise<BrowserPageError[]> {
  const client = createClient(apiKey);
  return client.get(
    withQuery(`${BROWSER_API.SESSION}/${sessionId}/errors`, {
      limit: options?.limit?.toString(),
    })
  );
}

export async function clearBrowserPageErrors(apiKey: string, sessionId: string) {
  const client = createClient(apiKey);
  return client.delete(`${BROWSER_API.SESSION}/${sessionId}/errors`);
}

export async function getBrowserDetectionRisk(
  apiKey: string,
  sessionId: string
): Promise<BrowserDetectionRiskSummary> {
  const client = createClient(apiKey);
  return client.get(`${BROWSER_API.SESSION}/${sessionId}/risk`);
}

export async function startBrowserTrace(
  apiKey: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserTraceStartResult> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/trace/start`, input);
}

export async function stopBrowserTrace(
  apiKey: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserTraceStopResult> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/trace/stop`, input);
}

export async function startBrowserHar(
  apiKey: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserHarStartResult> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/har/start`, input);
}

export async function stopBrowserHar(
  apiKey: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserHarStopResult> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/har/stop`, input);
}

export async function saveBrowserProfile(
  apiKey: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserProfileSaveResult> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/profile/save`, input);
}

export async function loadBrowserProfile(
  apiKey: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserProfileLoadResult> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/profile/load`, input);
}

export async function createBrowserStreamToken(
  apiKey: string,
  sessionId: string,
  input: Record<string, unknown>
): Promise<BrowserStreamTokenResult> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/stream`, input);
}

export async function exportBrowserStorage(
  apiKey: string,
  sessionId: string,
  options?: Record<string, unknown>
): Promise<BrowserStorageExportResult> {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/storage/export`, options ?? {});
}

export async function importBrowserStorage(
  apiKey: string,
  sessionId: string,
  data: Record<string, unknown>
) {
  const client = createClient(apiKey);
  return client.post(`${BROWSER_API.SESSION}/${sessionId}/storage/import`, data);
}

export async function clearBrowserStorage(apiKey: string, sessionId: string) {
  const client = createClient(apiKey);
  return client.delete(`${BROWSER_API.SESSION}/${sessionId}/storage`);
}

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
