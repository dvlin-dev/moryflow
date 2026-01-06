/**
 * Memories API
 */
import { apiClient, API_BASE_URL } from '@/lib/api-client'
import { getAuthToken } from '@/stores/auth'
import { CONSOLE_API } from '@/lib/api-paths'
import type { Memory, ListMemoriesParams, ExportFormat } from './types'

/** 获取 Memory 列表 */
export async function getMemories(
  params: ListMemoriesParams = {}
): Promise<{ memories: Memory[]; total: number }> {
  const searchParams = new URLSearchParams()

  if (params.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId)
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit))
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  const url = query ? `${CONSOLE_API.MEMORIES}?${query}` : CONSOLE_API.MEMORIES

  const result = await apiClient.getPaginated<Memory>(url)

  return {
    memories: result.data,
    total: result.meta.total,
  }
}

/** 导出 Memories */
export async function exportMemories(
  params: { apiKeyId?: string; format: ExportFormat } = { format: 'json' }
): Promise<Blob> {
  const searchParams = new URLSearchParams()

  if (params.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId)
  searchParams.set('format', params.format)

  const query = searchParams.toString()
  const url = `${CONSOLE_API.MEMORIES}/export?${query}`

  return apiClient.postBlob(url, undefined)
}

/** 下载导出的 Memories */
export async function downloadMemories(
  params: { apiKeyId?: string; format: ExportFormat } = { format: 'json' }
): Promise<void> {
  const searchParams = new URLSearchParams()

  if (params.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId)
  searchParams.set('format', params.format)

  const query = searchParams.toString()
  const url = `${CONSOLE_API.MEMORIES}/export?${query}`

  const token = getAuthToken()
  const fullUrl = `${API_BASE_URL}${url}`

  const response = await fetch(fullUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Export failed')
  }

  const blob = await response.blob()
  const filename =
    response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
    `memories-export.${params.format}`

  // 创建下载链接
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(downloadUrl)
}
