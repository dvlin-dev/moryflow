/**
 * License API
 *
 * 注意: License 模块使用 /license 路径而非 /api/admin/payment/licenses
 * 这是因为 License 是独立的公共模块，支持：
 * - 公开验证 (POST /license/validate)
 * - 公开激活 (POST /license/activate)
 * - 公开停用 (POST /license/deactivate)
 * - 管理员列表/撤销需要 Bearer 认证
 *
 * 此设计与其他 payment 子模块（订阅、订单、优惠码）不同，它们仅供管理员使用。
 */
import { apiClient } from '@/lib/api-client'
import type { LicenseListResponse } from '@/types/payment'

export interface LicensesQueryParams {
  limit: number
  offset: number
  status?: string
}

export const licensesApi = {
  /** 获取 License 列表 */
  getAll: (params: LicensesQueryParams): Promise<LicenseListResponse> => {
    const searchParams = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    })
    if (params.status && params.status !== 'all') {
      searchParams.set('status', params.status)
    }
    return apiClient.get(`/license?${searchParams}`)
  },

  /** 撤销 License */
  revoke: (id: string): Promise<{ success: boolean }> =>
    apiClient.post(`/license/${id}/revoke`),
}
