/**
 * Digest Welcome Pages Hooks (Admin)
 *
 * [PROVIDES]: list/create/update/reorder/delete hooks
 * [POS]: React Query hooks for Welcome Pages
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminWelcomePage,
  deleteAdminWelcomePage,
  fetchAdminWelcomePages,
  reorderAdminWelcomePages,
  updateAdminWelcomePage,
} from './api';
import type {
  CreateWelcomePageInput,
  ReorderWelcomePagesInput,
  UpdateWelcomePageInput,
} from './types';

const digestWelcomePagesKey = ['admin', 'digest', 'welcome', 'pages'] as const;

export function useAdminWelcomePages() {
  return useQuery({
    queryKey: digestWelcomePagesKey,
    queryFn: fetchAdminWelcomePages,
  });
}

export function useCreateAdminWelcomePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWelcomePageInput) => createAdminWelcomePage(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestWelcomePagesKey });
    },
  });
}

export function useUpdateAdminWelcomePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; input: UpdateWelcomePageInput }) =>
      updateAdminWelcomePage(params.id, params.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestWelcomePagesKey });
    },
  });
}

export function useReorderAdminWelcomePages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderWelcomePagesInput) => reorderAdminWelcomePages(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestWelcomePagesKey });
    },
  });
}

export function useDeleteAdminWelcomePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminWelcomePage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestWelcomePagesKey });
    },
  });
}
