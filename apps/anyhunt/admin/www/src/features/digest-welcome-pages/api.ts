/**
 * Digest Welcome Pages API (Admin)
 *
 * [PROVIDES]: list/create/update/reorder/delete Welcome Pages
 * [POS]: Admin Welcome Pages 管理 API
 */

import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  CreateWelcomePageInput,
  DigestWelcomePage,
  ReorderWelcomePagesInput,
  UpdateWelcomePageInput,
} from './types';

export async function fetchAdminWelcomePages(): Promise<DigestWelcomePage[]> {
  return apiClient.get<DigestWelcomePage[]>(ADMIN_API.DIGEST_WELCOME_PAGES);
}

export async function createAdminWelcomePage(
  input: CreateWelcomePageInput
): Promise<{ id: string }> {
  return apiClient.post<{ id: string }>(ADMIN_API.DIGEST_WELCOME_PAGES, input);
}

export async function updateAdminWelcomePage(
  id: string,
  input: UpdateWelcomePageInput
): Promise<void> {
  return apiClient.put<void>(`${ADMIN_API.DIGEST_WELCOME_PAGES}/${id}`, input);
}

export async function reorderAdminWelcomePages(input: ReorderWelcomePagesInput): Promise<void> {
  return apiClient.put<void>(`${ADMIN_API.DIGEST_WELCOME_PAGES}/reorder`, input);
}

export async function deleteAdminWelcomePage(id: string): Promise<void> {
  return apiClient.delete<void>(`${ADMIN_API.DIGEST_WELCOME_PAGES}/${id}`);
}
