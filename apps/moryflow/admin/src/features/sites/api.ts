/**
 * Sites API
 * 站点管理 API 调用
 */

import { adminApi } from '../../lib/api'
import type {
  SiteListParams,
  SiteListResponse,
  SiteDetail,
  SiteStats,
  SiteUpdateData,
} from './types'
import { buildSitesListPath } from './query-paths'

export const sitesApi = {
  /** 获取站点列表 */
  getAll: (params: SiteListParams): Promise<SiteListResponse> =>
    adminApi.get<SiteListResponse>(buildSitesListPath(params)),

  /** 获取站点统计 */
  getStats: (): Promise<SiteStats> => adminApi.get<SiteStats>('/sites/stats'),

  /** 获取站点详情 */
  getById: (id: string): Promise<SiteDetail> => adminApi.get<SiteDetail>(`/sites/${id}`),

  /** 强制下线站点 */
  offline: (id: string): Promise<void> => adminApi.post(`/sites/${id}/offline`),

  /** 恢复上线站点 */
  online: (id: string): Promise<void> => adminApi.post(`/sites/${id}/online`),

  /** 更新站点配置 */
  update: (id: string, data: SiteUpdateData): Promise<SiteDetail> =>
    adminApi.patch<SiteDetail>(`/sites/${id}`, data),

  /** 删除站点 */
  delete: (id: string): Promise<void> => adminApi.delete(`/sites/${id}`),
}
