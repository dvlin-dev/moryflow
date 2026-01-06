/**
 * Shared Types - Current User
 * 当前用户类型定义（用于控制器中的 @CurrentUser() 装饰器）
 */

import type { SubscriptionTier } from './tier.types';

/**
 * 当前已认证用户信息
 */
export interface CurrentUserDto {
  id: string;
  email: string;
  name: string | null;
  tier: SubscriptionTier; // 从 Subscription 关联获取
  isAdmin: boolean;
}
