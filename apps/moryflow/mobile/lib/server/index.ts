/**
 * [PROVIDES]: Server API 客户端、类型与工具函数
 * [DEPENDS]: /api - 共享 API 类型和客户端
 * [POS]: Mobile 端 Server 模块入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// ── 从共享包重导出 ───────────────────────────────────────

export {
  // 模型标识常量
  MEMBERSHIP_MODEL_PREFIX,
  MEMBERSHIP_PROVIDER_ID,
  MEMBERSHIP_PROVIDER_SLUG,
  MEMBERSHIP_PROVIDER_NAME,
  // 模型工具函数
  isMembershipModelId,
  extractMembershipModelId,
  buildMembershipModelId,
  // 等级配置
  TIER_DISPLAY_NAMES,
  TIER_COLORS,
  TIER_PRIORITY,
  TIER_INFO_CONFIG,
  compareTiers,
  isTierSufficient,
  getTierInfo,
  // 错误处理
  AUTH_ERROR_MESSAGES,
  parseAuthError,
  // API URL
  MEMBERSHIP_API_URL,
} from '@anyhunt/api'

export type {
  UserTier,
  TierInfo,
  CreditsBalance,
  SubscriptionDetails,
  CreditsInfo,
  MembershipUser,
  MembershipUserInfo,
  MembershipUserProfile,
  MembershipModel,
  MembershipModelApiItem,
  MembershipModelsResponse,
  MembershipAuthState,
  BetterAuthError,
} from '@anyhunt/api'

// ── Mobile 特有导出 ──────────────────────────────────────

export type { UserInfo, ModelsResponse } from './types'

// 验证工具
export {
  PASSWORD_CONFIG,
  validateEmail,
  validatePassword,
  generateUsername,
} from './validation'

// 存储
export {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  getStoredUserCache,
  setStoredUserCache,
  clearStoredUserCache,
} from './storage'

// API 客户端和便捷函数
export {
  serverApi,
  ServerApiError,
  fetchCurrentUser,
  fetchCredits,
  fetchProfile,
  updateProfile,
  fetchMembershipModels,
  deleteAccount,
} from './api'

// 认证 API（Mobile 特有）
export {
  signInWithEmail,
  signUpWithEmail,
  signOutFromServer,
  sendVerificationOTP,
  verifyEmailOTP,
  extractToken,
  extractUser,
  type BetterAuthResponse,
  type AuthUser,
} from './auth-api'

// 预注册 API
export { preRegisterApi, type SendOtpParams, type VerifyParams, type VerifyResult } from './pre-register-api'

// Context & Hooks
export {
  MembershipProvider,
  useMembership,
  useMembershipUser,
  useMembershipModels,
  useMembershipAuth,
} from './context'
