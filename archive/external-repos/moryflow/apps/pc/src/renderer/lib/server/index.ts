/**
 * [PROVIDES]: Server API 模块导出
 * [DEPENDS]: @moryflow/shared-api, api.ts, client.ts, context.tsx
 * [POS]: PC 端 Server 模块入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// ── 从共享包重新导出类型 ──────────────────────────────────
export type {
  UserTier,
  TierInfo,
  CreditsBalance,
  SubscriptionDetails,
  CreditsInfo,
  MembershipModel,
  MembershipModelApiItem,
  MembershipModelsResponse,
  MembershipAuthState,
  BetterAuthError,
  MembershipApiError,
} from '@moryflow/shared-api'

// ── 从共享包重新导出常量和工具函数 ────────────────────────
export {
  MEMBERSHIP_MODEL_PREFIX,
  MEMBERSHIP_PROVIDER_ID,
  MEMBERSHIP_PROVIDER_SLUG,
  MEMBERSHIP_PROVIDER_NAME,
  isMembershipModelId,
  extractMembershipModelId,
  buildMembershipModelId,
  TIER_DISPLAY_NAMES,
  TIER_COLORS,
  TIER_PRIORITY,
  compareTiers,
  isTierSufficient,
  AUTH_ERROR_MESSAGES,
  parseAuthError,
} from '@moryflow/shared-api'

// ── 本地类型别名（向后兼容） ──────────────────────────────
export type {
  User,
  UserInfo,
  UserProfile,
  ModelsResponse,
  AuthState,
} from './types'

// ── PC 端特有常量 ────────────────────────────────────────
export { MEMBERSHIP_API_URL } from './const'

// ── Auth Client 导出 ─────────────────────────────────────
export {
  signIn,
  signUp,
  signOut,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from './client'

// ── API 客户端和便捷函数 ─────────────────────────────────
export {
  serverApi,
  ServerApiError,
  fetchCurrentUser,
  fetchCredits,
  fetchProfile,
  updateProfile,
  fetchMembershipModels,
  fetchProducts,
  createCheckout,
  deleteAccount,
} from './api'

// ── 预注册 API ───────────────────────────────────────────
export { preRegisterApi } from './pre-register'

// ── Context & Hooks 导出 ─────────────────────────────────
export { AuthProvider, useAuth } from './context'
