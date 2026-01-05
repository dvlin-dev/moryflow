/**
 * Browser API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type { BrowserPoolDetailedStatus } from './types';

/**
 * 获取浏览器池状态
 */
export async function getBrowserStatus(): Promise<BrowserPoolDetailedStatus> {
  return apiClient.get<BrowserPoolDetailedStatus>(`${ADMIN_API.BROWSER}/status`);
}
