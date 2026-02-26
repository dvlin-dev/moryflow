/**
 * [PROVIDES]: Browser Observability API（intercept/network/headers/console/errors/risk/trace/har）
 * [DEPENDS]: browser-api-client / BROWSER_API
 * [POS]: Agent Browser Playground 浏览器域 API - 可观测操作
 */

import { BROWSER_API } from '@/lib/api-paths';
import { createClient, withQuery } from './browser-api-client';
import type {
  BrowserConsoleMessage,
  BrowserDetectionRiskSummary,
  BrowserHarStartResult,
  BrowserHarStopResult,
  BrowserHeadersResult,
  BrowserNetworkRequestRecord,
  BrowserPageError,
  BrowserTraceStartResult,
  BrowserTraceStopResult,
} from './types';

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
