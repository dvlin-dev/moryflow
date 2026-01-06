/**
 * 会员模型数据源
 *
 * 将会员模型转换为统一的 UnifiedModel 格式
 */

import {
  buildMembershipModelId,
  MEMBERSHIP_PROVIDER_ID,
  MEMBERSHIP_PROVIDER_NAME,
  type MembershipModel,
} from '@/lib/server'
import type { UnifiedModel, ModelGroup } from './types'

/**
 * 将会员模型转换为统一格式
 */
export function convertMembershipModels(models: MembershipModel[]): UnifiedModel[] {
  return models.map((model) => ({
    id: buildMembershipModelId(model.id),
    actualId: model.id,
    name: model.name,
    source: 'membership',
    provider: model.ownedBy,
    available: model.available,
    meta: {
      minTier: model.minTier,
    },
  }))
}

/**
 * 构建会员模型分组
 */
export function buildMembershipModelGroup(models: MembershipModel[]): ModelGroup {
  return {
    id: MEMBERSHIP_PROVIDER_ID,
    name: MEMBERSHIP_PROVIDER_NAME,
    source: 'membership',
    models: convertMembershipModels(models),
  }
}
