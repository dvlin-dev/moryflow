/**
 * Entities 类型定义
 */

/** Entity 列表项 */
export interface Entity {
  id: string
  apiKeyId: string
  apiKeyName: string
  userId: string
  type: string
  name: string
  properties: Record<string, unknown> | null
  confidence: number | null
  createdAt: string
  updatedAt: string
}

/** Entity 列表查询参数 */
export interface ListEntitiesParams {
  type?: string
  apiKeyId?: string
  limit?: number
  offset?: number
}

/** Entity 列表响应 */
export interface ListEntitiesResponse {
  entities: Entity[]
  total: number
}
