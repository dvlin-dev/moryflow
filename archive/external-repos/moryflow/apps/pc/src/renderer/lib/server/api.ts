/**
 * [PROVIDES]: serverApi, fetchCurrentUser, fetchCredits, fetchProfile, updateProfile, fetchMembershipModels, fetchProducts, createCheckout, deleteAccount
 * [DEPENDS]: @moryflow/shared-api/client, client.ts
 * [POS]: PC 端 Server API 封装，使用统一客户端
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { createServerApiClient, ServerApiError } from '@moryflow/shared-api/client'
import { MEMBERSHIP_API_URL } from './const'
import { getStoredToken } from './client'

// ── 创建 API 客户端 ──────────────────────────────────────

export const serverApi = createServerApiClient({
  baseUrl: MEMBERSHIP_API_URL,
  tokenProvider: { getToken: getStoredToken },
})

// ── 重导出 ServerApiError ───────────────────────────────

export { ServerApiError }

// ── 向后兼容的便捷函数 ───────────────────────────────────

export const fetchCurrentUser = () => serverApi.user.fetchCurrent()
export const fetchCredits = () => serverApi.user.fetchCredits()
export const fetchProfile = () => serverApi.user.fetchProfile()
export const updateProfile = (data: Parameters<typeof serverApi.user.updateProfile>[0]) =>
  serverApi.user.updateProfile(data)
export const fetchMembershipModels = () => serverApi.models.fetch()
export const fetchProducts = () => serverApi.payment.fetchProducts()
export const createCheckout = (data: Parameters<typeof serverApi.payment.createCheckout>[0]) =>
  serverApi.payment.createCheckout(data)
export const deleteAccount = (data: Parameters<typeof serverApi.user.deleteAccount>[0]) =>
  serverApi.user.deleteAccount(data)
