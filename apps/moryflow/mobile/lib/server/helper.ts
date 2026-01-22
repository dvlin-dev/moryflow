/**
 * Membership 辅助函数
 *
 * 纯函数，用于数据转换和处理
 */

import type { UserInfo, MembershipModel, MembershipModelApiItem } from './types';
import type { AuthUser } from './auth-api';

/**
 * 从认证用户创建临时用户信息
 * 用于登录/注册后立即显示用户信息，后台再同步完整数据
 */
export function createTempUserInfo(authUser: AuthUser, name?: string): UserInfo {
  return {
    id: authUser.id,
    email: authUser.email,
    emailVerified: false,
    name: authUser.name || name,
    createdAt: new Date().toISOString(),
    tier: 'free',
    tierInfo: { displayName: '免费用户', features: [], creditsPerMonth: 0 },
    credits: {
      daily: 0,
      subscription: 0,
      purchased: 0,
      total: 0,
      debt: 0,
      available: 0,
    },
  };
}

/**
 * 转换 API 模型数据为内部格式
 */
export function convertApiModels(apiModels: MembershipModelApiItem[]): MembershipModel[] {
  return apiModels.map((model) => ({
    id: model.id,
    name: model.display_name || model.id,
    ownedBy: model.owned_by,
    minTier: model.min_tier,
    available: model.available,
  }));
}
