/**
 * Entities Hooks
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getEntities, getEntityTypes, deleteEntity } from './api'
import type { ListEntitiesParams } from './types'

const QUERY_KEY = ['entities']
const TYPES_QUERY_KEY = ['entity-types']

/** 获取 Entity 列表 */
export function useEntities(params: ListEntitiesParams = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => getEntities(params),
  })
}

/** 获取所有 Entity 类型 */
export function useEntityTypes() {
  return useQuery({
    queryKey: TYPES_QUERY_KEY,
    queryFn: getEntityTypes,
  })
}

/** 删除 Entity */
export function useDeleteEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteEntity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Entity deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete entity')
    },
  })
}
