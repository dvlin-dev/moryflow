/**
 * Entities API
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type { Entity, ListEntitiesParams } from './types'

/** 获取 Entity 列表 */
export async function getEntities(
  params: ListEntitiesParams = {}
): Promise<{ entities: Entity[]; total: number }> {
  const searchParams = new URLSearchParams()

  if (params.type) searchParams.set('type', params.type)
  if (params.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId)
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit))
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  const url = query ? `${CONSOLE_API.ENTITIES}?${query}` : CONSOLE_API.ENTITIES

  const result = await apiClient.getPaginated<Entity>(url)

  return {
    entities: result.data,
    total: result.meta.total,
  }
}

/** 获取所有 Entity 类型 */
export async function getEntityTypes(): Promise<string[]> {
  return apiClient.get<string[]>(`${CONSOLE_API.ENTITIES}/types`)
}

/** 删除 Entity */
export async function deleteEntity(id: string): Promise<void> {
  await apiClient.delete(`${CONSOLE_API.ENTITIES}/${id}`)
}
