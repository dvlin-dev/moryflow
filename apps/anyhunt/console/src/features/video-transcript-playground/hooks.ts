/**
 * [PROVIDES]: Video Transcript React Query hooks
 * [DEPENDS]: react-query, ./api
 * [POS]: Console Video Transcript 数据访问 hooks
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelVideoTranscriptTask,
  createVideoTranscriptTask,
  getVideoTranscriptTask,
  listVideoTranscriptTasks,
} from './api';

export const videoTranscriptKeys = {
  all: ['app', 'video-transcripts'] as const,
  list: (page: number, limit: number) => [...videoTranscriptKeys.all, 'list', page, limit] as const,
  detail: (taskId: string) => [...videoTranscriptKeys.all, 'detail', taskId] as const,
};

export function useVideoTranscriptTasks(page = 1, limit = 20) {
  return useQuery({
    queryKey: videoTranscriptKeys.list(page, limit),
    queryFn: () => listVideoTranscriptTasks(page, limit),
    refetchInterval: 5000,
  });
}

export function useVideoTranscriptTask(taskId: string | null) {
  return useQuery({
    queryKey: videoTranscriptKeys.detail(taskId ?? ''),
    queryFn: () => getVideoTranscriptTask(taskId ?? ''),
    enabled: Boolean(taskId),
    refetchInterval: 3000,
  });
}

export function useCreateVideoTranscriptTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVideoTranscriptTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoTranscriptKeys.all });
    },
  });
}

export function useCancelVideoTranscriptTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelVideoTranscriptTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoTranscriptKeys.all });
    },
  });
}
