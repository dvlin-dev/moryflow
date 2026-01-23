/**
 * [PROVIDES]: serverApi, fetchCurrentUser, fetchCredits, fetchProfile, updateProfile, fetchMembershipModels, deleteAccount
 * [DEPENDS]: /api/client, auth-session.ts
 * [POS]: Mobile 端 Server API 封装，使用统一客户端
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { createServerApiClient, ServerApiError } from '@anyhunt/api/client';
import { MEMBERSHIP_API_URL } from '@anyhunt/api';
import { getAccessToken, refreshAccessToken } from './auth-session';

// ── 创建 API 客户端 ──────────────────────────────────────

export const serverApi = createServerApiClient({
  baseUrl: MEMBERSHIP_API_URL,
  tokenProvider: { getToken: getAccessToken },
  onUnauthorized: refreshAccessToken,
});

// ── 重导出 ServerApiError ───────────────────────────────

export { ServerApiError };

// 便捷函数（保持向后兼容）
export const fetchCurrentUser = () => serverApi.user.fetchCurrent();
export const fetchCredits = () => serverApi.user.fetchCredits();
export const fetchProfile = () => serverApi.user.fetchProfile();
export const updateProfile = (data: Parameters<typeof serverApi.user.updateProfile>[0]) =>
  serverApi.user.updateProfile(data);
export const fetchMembershipModels = () => serverApi.models.fetch();
export const deleteAccount = (data: Parameters<typeof serverApi.user.deleteAccount>[0]) =>
  serverApi.user.deleteAccount(data);
