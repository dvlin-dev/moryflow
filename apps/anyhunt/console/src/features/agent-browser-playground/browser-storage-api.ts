/**
 * [PROVIDES]: Browser Storage/Profile/Stream API
 * [DEPENDS]: browser-api-client / BROWSER_API
 * [POS]: Agent Browser Playground 浏览器域 API - 存储与持久化
 */

import { BROWSER_API } from '@/lib/api-paths';
import { createClient } from './browser-api-client';
import type {
  BrowserProfileLoadResult,
  BrowserProfileSaveResult,
  BrowserStorageExportResult,
  BrowserStreamTokenResult,
} from './types';

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
