/**
 * Users Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usersApi, type UserTier, type CreditType } from './api'

export const USERS_QUERY_KEY = ['users'] as const
export const DELETIONS_QUERY_KEY = ['deletions'] as const

/** 获取用户列表 */
export function useUsers(params: {
  page: number
  pageSize: number
  tier: string
  deleted?: boolean
}) {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, params.tier, params.deleted, params.page],
    queryFn: () =>
      usersApi.getAll({
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
        tier: params.tier,
        deleted: params.deleted,
      }),
  })
}

/** 获取删除记录列表 */
export function useDeletionRecords(params: {
  page: number
  pageSize: number
  reason?: string
}) {
  return useQuery({
    queryKey: [...DELETIONS_QUERY_KEY, params.reason, params.page],
    queryFn: () =>
      usersApi.getDeletionRecords({
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
        reason: params.reason,
      }),
  })
}

/** 获取删除统计 */
export function useDeletionStats() {
  return useQuery({
    queryKey: [...DELETIONS_QUERY_KEY, 'stats'],
    queryFn: () => usersApi.getDeletionStats(),
  })
}

/** 获取用户详情 */
export function useUserDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id!),
    enabled: !!id,
  })
}

/** 设置用户等级 */
export function useSetUserTier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, tier }: { userId: string; tier: UserTier }) =>
      usersApi.setTier(userId, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      toast.success('用户等级设置成功')
    },
    onError: (error: Error) => {
      toast.error(`设置失败：${error.message}`)
    },
  })
}

/** 发放积分 */
export function useGrantCredits() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      type,
      amount,
      reason,
    }: {
      userId: string
      type: CreditType
      amount: number
      reason?: string
    }) => usersApi.grantCredits(userId, { type, amount, reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
      toast.success('积分发放成功')
    },
    onError: (error: Error) => {
      toast.error(`发放失败：${error.message}`)
    },
  })
}
