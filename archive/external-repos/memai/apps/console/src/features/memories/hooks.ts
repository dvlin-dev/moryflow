/**
 * Memories Hooks
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getMemories, downloadMemories } from './api'
import type { ListMemoriesParams, ExportFormat } from './types'

const QUERY_KEY = ['memories']

/** 获取 Memory 列表 */
export function useMemories(params: ListMemoriesParams = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => getMemories(params),
  })
}

/** 导出 Memories */
export function useExportMemories() {
  return useMutation({
    mutationFn: (params: { apiKeyId?: string; format: ExportFormat }) =>
      downloadMemories(params),
    onSuccess: () => {
      toast.success('Export started')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export')
    },
  })
}
