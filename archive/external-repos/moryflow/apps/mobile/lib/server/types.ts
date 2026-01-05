/**
 * Membership 类型定义
 *
 * 从共享包重导出类型
 */

// 从共享包导入并重新导出所有类型
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
} from '@moryflow/shared-api'

// 本地类型别名（简化使用）
export type {
  MembershipUserInfo as UserInfo,
  MembershipModelsResponse as ModelsResponse,
} from '@moryflow/shared-api'
