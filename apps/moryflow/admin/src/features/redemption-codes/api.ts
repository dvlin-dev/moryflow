import { adminApi } from '@/lib/api';
import type {
  RedemptionCode,
  RedemptionCodeDetail,
  RedemptionCodeConfig,
  RedemptionCodesListResponse,
  CreateRedemptionCodeRequest,
  UpdateRedemptionCodeRequest,
} from './types';
import { buildRedemptionCodesListPath } from './query-paths';

export interface RedemptionCodesQueryParams {
  page: number;
  limit: number;
  type?: string;
  isActive?: string;
  search?: string;
}

export const redemptionCodesApi = {
  getConfig: (): Promise<RedemptionCodeConfig> => adminApi.get('/redemption-codes/config'),

  getAll: (params: RedemptionCodesQueryParams): Promise<RedemptionCodesListResponse> =>
    adminApi.get(buildRedemptionCodesListPath(params)),

  getById: (id: string): Promise<RedemptionCodeDetail> => adminApi.get(`/redemption-codes/${id}`),

  create: (data: CreateRedemptionCodeRequest): Promise<RedemptionCode> =>
    adminApi.post('/redemption-codes', data),

  update: (id: string, data: UpdateRedemptionCodeRequest): Promise<RedemptionCode> =>
    adminApi.patch(`/redemption-codes/${id}`, data),

  deactivate: (id: string): Promise<RedemptionCode> => adminApi.delete(`/redemption-codes/${id}`),
};
