/**
 * Memories 类型定义
 */

/** Memory 列表项 */
export interface Memory {
  id: string
  apiKeyId: string
  apiKeyName: string
  userId: string
  agentId: string | null
  sessionId: string | null
  content: string
  metadata: Record<string, unknown> | null
  source: string | null
  importance: number | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

/** Memory 列表查询参数 */
export interface ListMemoriesParams {
  apiKeyId?: string
  limit?: number
  offset?: number
}

/** Memory 列表响应 */
export interface ListMemoriesResponse {
  memories: Memory[]
  total: number
}

/** 导出格式 */
export type ExportFormat = 'json' | 'csv'
