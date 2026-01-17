/**
 * Digest Welcome API (Admin)
 *
 * [PROVIDES]: fetchAdminWelcomeConfig, updateAdminWelcomeConfig
 * [POS]: Admin Welcome 配置读写
 */

import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type { DigestWelcomeConfig, UpdateWelcomeInput } from './types';

export async function fetchAdminWelcomeConfig(): Promise<DigestWelcomeConfig> {
  return apiClient.get<DigestWelcomeConfig>(ADMIN_API.DIGEST_WELCOME);
}

export async function updateAdminWelcomeConfig(
  input: UpdateWelcomeInput
): Promise<DigestWelcomeConfig> {
  return apiClient.put<DigestWelcomeConfig>(ADMIN_API.DIGEST_WELCOME, input);
}
