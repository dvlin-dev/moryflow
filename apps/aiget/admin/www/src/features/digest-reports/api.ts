/**
 * Digest Reports API
 *
 * [PROVIDES]: API calls for report management
 * [POS]: Admin report API functions
 */

import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type { Report, ReportQuery, ReportListResponse, ResolveReportInput } from './types';

export async function fetchReports(params?: ReportQuery): Promise<ReportListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.topicId) searchParams.set('topicId', params.topicId);

  const query = searchParams.toString();
  const url = query ? `${ADMIN_API.DIGEST_REPORTS}?${query}` : ADMIN_API.DIGEST_REPORTS;

  return apiClient.get<ReportListResponse>(url);
}

export async function resolveReport(id: string, input: ResolveReportInput): Promise<Report> {
  return apiClient.patch<Report>(`${ADMIN_API.DIGEST_REPORTS}/${id}`, input);
}
