/**
 * [PROVIDES]: Server API 模块导出
 * [DEPENDS]: /api, api.ts, client.ts, auth-store.ts, auth-methods.ts
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
} from '@moryflow/api';

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
  parseAuthError,
} from '@moryflow/api';

// ── 本地类型别名（向后兼容） ──────────────────────────────
export type { User, UserInfo, UserProfile, ModelsResponse, AuthState } from './types';

// ── PC 端特有常量 ────────────────────────────────────────
export { MEMBERSHIP_API_URL } from './const';

// ── Auth API 导出 ────────────────────────────────────────
export { signInWithEmail, signUpWithEmail, sendVerificationOTP, verifyEmailOTP } from './auth-api';

// ── Auth Session ────────────────────────────────────────
export {
  getAccessToken,
  refreshAccessToken,
  logoutFromServer,
  clearAuthSession,
} from './auth-session';
export { useAuthStore, waitForAuthHydration } from './auth-store';
export { authMethods } from './auth-methods';

// ── API 客户端和便捷函数 ─────────────────────────────────
export {
  ServerApiError,
  fetchCurrentUser,
  fetchCredits,
  fetchProfile,
  updateProfile,
  fetchMembershipModels,
  fetchProducts,
  createCheckout,
  deleteAccount,
} from './api';

// ── Hooks 导出（基于 zustand，无 Context）──────────────────
export { useAuth } from './auth-hooks';
