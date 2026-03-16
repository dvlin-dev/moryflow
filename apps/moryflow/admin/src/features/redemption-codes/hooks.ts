import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { redemptionCodesApi } from './api';
import type { CreateRedemptionCodeRequest, UpdateRedemptionCodeRequest } from './types';

export const REDEMPTION_CODES_QUERY_KEY = ['admin', 'redemption-codes'] as const;

export function useRedemptionCodeConfig() {
  return useQuery({
    queryKey: [...REDEMPTION_CODES_QUERY_KEY, 'config'],
    queryFn: () => redemptionCodesApi.getConfig(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRedemptionCodes(params: {
  page: number;
  pageSize: number;
  type?: string;
  isActive?: string;
  search?: string;
}) {
  const { page, pageSize, ...filters } = params;
  return useQuery({
    queryKey: [...REDEMPTION_CODES_QUERY_KEY, 'list', filters, page],
    queryFn: () => redemptionCodesApi.getAll({ page, limit: pageSize, ...filters }),
  });
}

export function useRedemptionCode(id: string) {
  return useQuery({
    queryKey: [...REDEMPTION_CODES_QUERY_KEY, 'detail', id],
    queryFn: () => redemptionCodesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateRedemptionCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRedemptionCodeRequest) => redemptionCodesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REDEMPTION_CODES_QUERY_KEY });
      toast.success('兑换码已创建');
    },
    onError: (err: Error) => toast.error(err.message || '创建失败'),
  });
}

export function useUpdateRedemptionCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRedemptionCodeRequest }) =>
      redemptionCodesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REDEMPTION_CODES_QUERY_KEY });
      toast.success('兑换码已更新');
    },
    onError: (err: Error) => toast.error(err.message || '更新失败'),
  });
}

export function useDeleteRedemptionCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => redemptionCodesApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REDEMPTION_CODES_QUERY_KEY });
      toast.success('兑换码已停用');
    },
    onError: (err: Error) => toast.error(err.message || '操作失败'),
  });
}
