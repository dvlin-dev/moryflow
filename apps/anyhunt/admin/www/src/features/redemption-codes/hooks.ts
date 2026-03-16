/**
 * Redemption Codes React Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getRedemptionCodes,
  getRedemptionCode,
  createRedemptionCode,
  updateRedemptionCode,
  deleteRedemptionCode,
} from './api';
import type {
  RedemptionCodeQuery,
  CreateRedemptionCodeRequest,
  UpdateRedemptionCodeRequest,
} from './types';

/** Query Key factory */
export const redemptionCodeKeys = {
  all: ['admin', 'redemption-codes'] as const,
  lists: () => [...redemptionCodeKeys.all, 'list'] as const,
  list: (query?: RedemptionCodeQuery) => [...redemptionCodeKeys.lists(), query] as const,
  details: () => [...redemptionCodeKeys.all, 'detail'] as const,
  detail: (id: string) => [...redemptionCodeKeys.details(), id] as const,
};

/** Get redemption codes list */
export function useRedemptionCodes(query: RedemptionCodeQuery = {}) {
  return useQuery({
    queryKey: redemptionCodeKeys.list(query),
    queryFn: () => getRedemptionCodes(query),
  });
}

/** Get single redemption code */
export function useRedemptionCode(id: string) {
  return useQuery({
    queryKey: redemptionCodeKeys.detail(id),
    queryFn: () => getRedemptionCode(id),
    enabled: !!id,
  });
}

/** Create redemption code */
export function useCreateRedemptionCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRedemptionCodeRequest) => createRedemptionCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: redemptionCodeKeys.all });
      toast.success('Redemption code created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create redemption code');
    },
  });
}

/** Update redemption code */
export function useUpdateRedemptionCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRedemptionCodeRequest }) =>
      updateRedemptionCode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: redemptionCodeKeys.all });
      toast.success('Redemption code updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update redemption code');
    },
  });
}

/** Delete redemption code */
export function useDeleteRedemptionCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRedemptionCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: redemptionCodeKeys.all });
      toast.success('Redemption code deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete redemption code');
    },
  });
}
