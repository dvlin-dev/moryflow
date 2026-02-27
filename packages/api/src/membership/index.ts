/**
 * [PROVIDES]: membership 类型、常量与工具函数导出
 * [DEPENDS]: membership/types.ts, membership/const.ts
 * [POS]: 共享 API 包的 membership 入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// 类型
export type {
  UserTier,
  TierInfo,
  CreditsBalance,
  SubscriptionDetails,
  CreditsInfo,
  MembershipUser,
  MembershipUserInfo,
  MembershipUserProfile,
  MembershipThinkingLevelOption,
  MembershipThinkingVisibleParam,
  MembershipThinkingVisibleParamKey,
  MembershipThinkingProfile,
  MembershipModel,
  MembershipModelApiItem,
  MembershipModelsResponse,
  MembershipAuthState,
  BetterAuthError,
  MembershipApiError,
  // 产品和支付
  ProductType,
  ProductInfo,
  ProductsResponse,
  CheckoutConfig,
  SubscriptionInfo,
  SubscriptionStatusResponse,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
} from './types';

// 常量和工具函数
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
  getTierInfo,
  // 错误处理
  parseAuthError,
} from './const';
