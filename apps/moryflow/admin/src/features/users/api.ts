/**
 * Users API
 */
import { adminApi } from '../../lib/api';
import type {
  User,
  UserDetails,
  UserListResponse,
  UserTier,
  CreditType,
  DeletionRecordListResponse,
  DeletionStats,
} from '../../types/api';
import { buildUsersListPath, buildDeletionRecordsPath } from './query-paths'

export const usersApi = {
  /** 获取用户列表 */
  getAll: (params: { limit: number; offset: number; tier?: string; deleted?: boolean }) =>
    adminApi.get<UserListResponse>(buildUsersListPath(params)),

  /** 获取用户详情 */
  getById: (id: string) => adminApi.get<UserDetails>(`/users/${id}`),

  /** 设置用户等级 */
  setTier: (userId: string, tier: UserTier) =>
    adminApi.put<{ user: User }>(`/users/${userId}/tier`, { tier }),

  /** 发放积分 */
  grantCredits: (userId: string, data: { type: CreditType; amount: number; reason?: string }) =>
    adminApi.post<void>(`/users/${userId}/credits`, data),

  /** 设置管理员权限 */
  setAdmin: (userId: string, isAdmin: boolean) =>
    adminApi.put<{ user: User }>(`/users/${userId}/admin`, { isAdmin }),

  /** 获取删除记录列表 */
  getDeletionRecords: (params: { limit: number; offset: number; reason?: string }) =>
    adminApi.get<DeletionRecordListResponse>(buildDeletionRecordsPath(params)),

  /** 获取删除统计 */
  getDeletionStats: () => adminApi.get<DeletionStats>('/deletions/stats'),
};

export type { User, UserDetails, UserTier, CreditType };
