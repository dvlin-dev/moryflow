/**
 * Users API
 */
import { apiClient, type PaginatedResult } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  UserListItem,
  UserDetail,
  UserQuery,
  UpdateUserRequest,
} from './types';

/** 构建查询字符串 */
function buildQueryString(query: UserQuery): string {
  const params = new URLSearchParams();
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.isAdmin !== undefined) params.set('isAdmin', String(query.isAdmin));
  return params.toString();
}

/** 获取用户列表 */
export async function getUsers(
  query: UserQuery = {},
): Promise<PaginatedResult<UserListItem>> {
  const qs = buildQueryString(query);
  const url = qs ? `${ADMIN_API.USERS}?${qs}` : ADMIN_API.USERS;
  return apiClient.getPaginated<UserListItem>(url);
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
