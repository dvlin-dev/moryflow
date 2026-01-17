/**
 * Digest Welcome Hooks (Admin)
 *
 * [PROVIDES]: useAdminWelcomeConfig, useUpdateAdminWelcomeConfig
 * [POS]: React Query hooks for Welcome config
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminWelcomeConfig, updateAdminWelcomeConfig } from './api';
import type { UpdateWelcomeInput } from './types';

const digestWelcomeKey = ['admin', 'digest', 'welcome'] as const;

export function useAdminWelcomeConfig() {
  return useQuery({
    queryKey: digestWelcomeKey,
    queryFn: fetchAdminWelcomeConfig,
  });
}

export function useUpdateAdminWelcomeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWelcomeInput) => updateAdminWelcomeConfig(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestWelcomeKey });
    },
  });
}
