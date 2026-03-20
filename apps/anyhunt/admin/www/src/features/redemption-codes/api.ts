/**
 * Redemption Codes API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import { buildUrl } from '@/lib/query-utils';
import type { PaginatedResponse } from '@/lib/types';
import type {
  RedemptionCode,
  RedemptionCodeDetail,
  RedemptionCodeQuery,
  RedemptionCodeConfig,
  CreateRedemptionCodeRequest,
  UpdateRedemptionCodeRequest,
} from './types';

/** Get redemption code configuration */
export async function getRedemptionCodeConfig(): Promise<RedemptionCodeConfig> {
  return apiClient.get<RedemptionCodeConfig>(`${ADMIN_API.REDEMPTION_CODES}/config`);
}

/** Get redemption codes list */
export async function getRedemptionCodes(
  query: RedemptionCodeQuery = {}
): Promise<PaginatedResponse<RedemptionCode>> {
  const url = buildUrl(ADMIN_API.REDEMPTION_CODES, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    type: query.type,
    isActive: query.isActive,
  });
  return apiClient.get<PaginatedResponse<RedemptionCode>>(url);
}

/** Get single redemption code */
export async function getRedemptionCode(id: string): Promise<RedemptionCodeDetail> {
  return apiClient.get<RedemptionCodeDetail>(`${ADMIN_API.REDEMPTION_CODES}/${id}`);
}

/** Create redemption code */
export async function createRedemptionCode(
  data: CreateRedemptionCodeRequest
): Promise<RedemptionCode> {
  return apiClient.post<RedemptionCode>(ADMIN_API.REDEMPTION_CODES, data);
}

/** Update redemption code */
export async function updateRedemptionCode(
  id: string,
  data: UpdateRedemptionCodeRequest
): Promise<RedemptionCode> {
  return apiClient.patch<RedemptionCode>(`${ADMIN_API.REDEMPTION_CODES}/${id}`, data);
}

/** Delete redemption code */
export async function deleteRedemptionCode(id: string): Promise<void> {
  return apiClient.delete(`${ADMIN_API.REDEMPTION_CODES}/${id}`);
}
