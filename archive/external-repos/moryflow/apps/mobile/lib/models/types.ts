/**
 * 模型管理类型定义
 *
 * 统一的模型类型，支持未来扩展自定义 Provider
 */

/** 模型来源类型 */
export type ModelSourceType = 'membership' | 'custom' | 'local'

/** 统一模型定义 */
export interface UnifiedModel {
  /** 完整 ID（如 membership:gpt-4o） */
  id: string
  /** 实际模型 ID（如 gpt-4o） */
  actualId: string
  /** 显示名称 */
  name: string
  /** 来源类型 */
  source: ModelSourceType
  /** 提供商名称 */
  provider?: string
  /** 是否可用（用户等级是否满足） */
  available: boolean
  /** 元信息 */
  meta?: {
    /** 最低等级要求（会员模型特有，如 'free'/'basic'/'pro'） */
    minTier?: string
    /** 上下文长度 */
    contextLength?: number
    /** 最大输出 */
    maxOutput?: number
  }
}

/** 模型分组 */
export interface ModelGroup {
  /** 分组 ID */
  id: string
  /** 分组名称 */
  name: string
  /** 来源类型 */
  source: ModelSourceType
  /** 分组内模型列表 */
  models: UnifiedModel[]
}
