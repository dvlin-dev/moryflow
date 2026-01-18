/**
 * Digest Welcome Config Hooks (Admin)
 *
 * [PROVIDES]: useAdminWelcomeConfig, useUpdateAdminWelcomeConfig
 * [POS]: React Query hooks for Welcome config
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminWelcomeConfig, updateAdminWelcomeConfig } from './api';
import type { UpdateWelcomeConfigInput } from './types';

const digestWelcomeConfigKey = ['admin', 'digest', 'welcome', 'config'] as const;

export function useAdminWelcomeConfig() {
  return useQuery({
    queryKey: digestWelcomeConfigKey,
    queryFn: fetchAdminWelcomeConfig,
  });
}

export function useUpdateAdminWelcomeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWelcomeConfigInput) => updateAdminWelcomeConfig(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestWelcomeConfigKey });
    },
  });
}
