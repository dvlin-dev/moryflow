/**
 * [PROVIDES]: Browser Session API（session/open/snapshot/action/screenshot/tab/window/cdp）
 * [DEPENDS]: browser-api-client / BROWSER_API
 * [POS]: Agent Browser Playground 浏览器域 API - Session 操作
 */

import { BROWSER_API } from '@/lib/api-paths';
import { createClient } from './browser-api-client';
import type {
  BrowserActionBatchResponse,
  BrowserActionResponse,
  BrowserDeltaSnapshotResponse,
  BrowserOpenResponse,
  BrowserScreenshotResponse,
  BrowserSessionInfo,
  BrowserSnapshotResponse,
  BrowserTabInfo,
  BrowserWindowInfo,
} from './types';

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
