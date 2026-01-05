/**
 * Membership 模块导出
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
} from './types'

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
  TIER_PRIORITY,
  TIER_INFO_CONFIG,
  compareTiers,
  isTierSufficient,
  getTierInfo,
  // 错误处理
  AUTH_ERROR_MESSAGES,
  parseAuthError,
} from './const'
