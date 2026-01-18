/**
 * Users React Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteUser, getCreditGrants, getUser, getUsers, grantCredits, updateUser } from './api';
import type { UserQuery, UpdateUserRequest, CreditGrantsQuery, GrantCreditsRequest } from './types';

/** Query Key 工厂 */
export const userKeys = {
  all: ['admin', 'users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (query?: UserQuery) => [...userKeys.lists(), query] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  creditGrants: () => [...userKeys.all, 'credits', 'grants'] as const,
  creditGrantsByUser: (id: string, query?: CreditGrantsQuery) =>
    [...userKeys.creditGrants(), id, query] as const,
};

/** 获取用户列表 */
export function useUsers(query: UserQuery = {}) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: () => getUsers(query),
  });
}

/** 获取单个用户 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUser(id),
    enabled: !!id,
  });
}

export function useCreditGrants(userId: string, query: CreditGrantsQuery = {}) {
  return useQuery({
    queryKey: userKeys.creditGrantsByUser(userId, query),
    queryFn: () => getCreditGrants(userId, query),
    enabled: !!userId,
  });
}

/** 更新用户 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('用户已更新');
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败');
    },
  });
}

/** 删除用户 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('用户已删除');
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败');
    },
  });
}

export function useGrantCredits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: GrantCreditsRequest }) =>
      grantCredits(userId, data),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(result.userId) }),
        queryClient.invalidateQueries({ queryKey: userKeys.creditGrants() }),
      ]);
      toast.success('Credits granted');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Grant failed';
      toast.error(message);
    },
  });
}
