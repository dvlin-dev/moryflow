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

export async function updateAdminWelcomePage(id: string, input: UpdateWelcomePageInput) {
  return apiClient.put<{ success: true }>(`${ADMIN_API.DIGEST_WELCOME_PAGES}/${id}`, input);
}

export async function reorderAdminWelcomePages(input: ReorderWelcomePagesInput) {
  return apiClient.put<{ success: true }>(`${ADMIN_API.DIGEST_WELCOME_PAGES}/reorder`, input);
}

export async function deleteAdminWelcomePage(id: string) {
  return apiClient.delete<{ success: true }>(`${ADMIN_API.DIGEST_WELCOME_PAGES}/${id}`);
}
