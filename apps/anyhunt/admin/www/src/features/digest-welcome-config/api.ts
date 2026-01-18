/**
 * Digest Welcome Config API (Admin)
 *
 * [PROVIDES]: fetchAdminWelcomeConfig, updateAdminWelcomeConfig
 * [POS]: Admin Welcome Config（enabled/defaultSlug/actions）读写
 */

import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type { DigestWelcomeConfig, UpdateWelcomeConfigInput } from './types';

export async function fetchAdminWelcomeConfig(): Promise<DigestWelcomeConfig> {
  return apiClient.get<DigestWelcomeConfig>(ADMIN_API.DIGEST_WELCOME);
}

export async function updateAdminWelcomeConfig(
  input: UpdateWelcomeConfigInput
): Promise<DigestWelcomeConfig> {
  return apiClient.put<DigestWelcomeConfig>(ADMIN_API.DIGEST_WELCOME, input);
}
