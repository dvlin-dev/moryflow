/**
 * [PROVIDES]: Video Transcript playground API 请求方法
 * [DEPENDS]: apiClient, CONSOLE_API
 * [POS]: Console Video Transcript API 封装
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { apiClient } from '@/lib/api-client';
import { CONSOLE_API } from '@/lib/api-paths';
import type {
  CreateVideoTranscriptTaskInput,
  CreateVideoTranscriptTaskResponse,
  ListVideoTranscriptTasksResponse,
  VideoTranscriptTask,
} from './types';

export async function createVideoTranscriptTask(
  input: CreateVideoTranscriptTaskInput
): Promise<CreateVideoTranscriptTaskResponse> {
  return apiClient.post<CreateVideoTranscriptTaskResponse>(CONSOLE_API.VIDEO_TRANSCRIPTS, input);
}

export async function getVideoTranscriptTask(taskId: string): Promise<VideoTranscriptTask> {
  return apiClient.get<VideoTranscriptTask>(`${CONSOLE_API.VIDEO_TRANSCRIPTS}/${taskId}`);
}

export async function listVideoTranscriptTasks(
  page = 1,
  limit = 20
): Promise<ListVideoTranscriptTasksResponse> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  }).toString();
  return apiClient.get<ListVideoTranscriptTasksResponse>(
    `${CONSOLE_API.VIDEO_TRANSCRIPTS}?${query}`
  );
}

export async function cancelVideoTranscriptTask(taskId: string): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>(`${CONSOLE_API.VIDEO_TRANSCRIPTS}/${taskId}/cancel`);
}
