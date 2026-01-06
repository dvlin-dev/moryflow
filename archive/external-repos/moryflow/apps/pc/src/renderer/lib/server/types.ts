/**
 * Membership 类型定义
 *
 * 从共享包重新导出，保持本地兼容性
 */

// 从共享包导入并重新导出
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
  ProductType,
  ProductInfo,
  ProductsResponse,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
} from '@moryflow/shared-api'

// 本地类型别名（保持向后兼容）
export type {
  MembershipUser as User,
  MembershipUserInfo as UserInfo,
  MembershipUserProfile as UserProfile,
  MembershipModelsResponse as ModelsResponse,
  MembershipAuthState as AuthState,
} from '@moryflow/shared-api'
