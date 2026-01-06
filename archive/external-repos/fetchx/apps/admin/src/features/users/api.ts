/**
 * Users API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import { buildUrl } from '@/lib/query-utils';
import type {
  PaginatedResponse,
  UserListItem,
  UserDetail,
  UserQuery,
  UpdateUserRequest,
} from './types';

/** 获取用户列表 */
export async function getUsers(
  query: UserQuery = {},
): Promise<PaginatedResponse<UserListItem>> {
  const url = buildUrl(ADMIN_API.USERS, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    isAdmin: query.isAdmin,
  });
  return apiClient.get<PaginatedResponse<UserListItem>>(url);
}

/** 获取单个用户 */
export async function getUser(id: string): Promise<UserDetail> {
  return apiClient.get<UserDetail>(`${ADMIN_API.USERS}/${id}`);
}

/** 更新用户 */
export async function updateUser(
  id: string,
  data: UpdateUserRequest,
): Promise<UserListItem> {
  return apiClient.patch<UserListItem>(`${ADMIN_API.USERS}/${id}`, data);
}

/** 删除用户 */
export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`${ADMIN_API.USERS}/${id}`);
}
