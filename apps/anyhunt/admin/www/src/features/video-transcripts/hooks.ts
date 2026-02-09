/**
 * [PROVIDES]: Admin Video Transcript React Query hooks
 * [DEPENDS]: react-query, ./api
 * [POS]: Admin Video Transcript 数据拉取 hooks
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVideoTranscriptOverview,
  getVideoTranscriptRuntimeConfig,
  getVideoTranscriptResources,
  getVideoTranscriptTasks,
  updateVideoTranscriptRuntimeConfig,
} from './api';

export const videoTranscriptAdminKeys = {
  all: ['admin', 'video-transcripts'] as const,
  overview: () => [...videoTranscriptAdminKeys.all, 'overview'] as const,
  resources: () => [...videoTranscriptAdminKeys.all, 'resources'] as const,
  config: () => [...videoTranscriptAdminKeys.all, 'config'] as const,
  tasks: (page: number, limit: number) =>
    [...videoTranscriptAdminKeys.all, 'tasks', page, limit] as const,
};

export function useVideoTranscriptOverview() {
  return useQuery({
    queryKey: videoTranscriptAdminKeys.overview(),
    queryFn: getVideoTranscriptOverview,
    refetchInterval: 5000,
  });
}

export function useVideoTranscriptResources() {
  return useQuery({
    queryKey: videoTranscriptAdminKeys.resources(),
    queryFn: getVideoTranscriptResources,
    refetchInterval: 5000,
  });
}

export function useVideoTranscriptRuntimeConfig() {
  return useQuery({
    queryKey: videoTranscriptAdminKeys.config(),
    queryFn: getVideoTranscriptRuntimeConfig,
    refetchInterval: 5000,
  });
}

export function useVideoTranscriptTasks(page = 1, limit = 20) {
  return useQuery({
    queryKey: videoTranscriptAdminKeys.tasks(page, limit),
    queryFn: () => getVideoTranscriptTasks(page, limit),
    refetchInterval: 5000,
  });
}

export function useUpdateVideoTranscriptRuntimeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateVideoTranscriptRuntimeConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoTranscriptAdminKeys.config() });
      queryClient.invalidateQueries({ queryKey: videoTranscriptAdminKeys.all });
    },
  });
}
