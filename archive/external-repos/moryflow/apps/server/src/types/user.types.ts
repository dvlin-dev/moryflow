/**
 * Shared Types - Current User
 * 当前用户类型定义（用于控制器中的 @CurrentUser() 装饰器）
 */

import type { UserTier } from './tier.types';

/**
 * 当前已认证用户信息
 */
export interface CurrentUserDto {
  id: string;
  email: string;
  name: string | null;
  tier: UserTier;
  isAdmin: boolean;
}
