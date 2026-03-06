/**
 * [PROVIDES]: Admin Video Transcript API 方法
 * [DEPENDS]: apiClient, ADMIN_API
 * [POS]: Admin Video Transcript API 访问层
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  UpdateVideoTranscriptRuntimeConfigInput,
  UpdateVideoTranscriptRuntimeConfigResponse,
  VideoTranscriptRuntimeConfig,
  VideoTranscriptOverview,
  VideoTranscriptResources,
  VideoTranscriptTaskListResponse,
} from './types';

export async function getVideoTranscriptOverview(): Promise<VideoTranscriptOverview> {
  return apiClient.get<VideoTranscriptOverview>(`${ADMIN_API.VIDEO_TRANSCRIPTS}/overview`);
}

export async function getVideoTranscriptResources(): Promise<VideoTranscriptResources> {
  return apiClient.get<VideoTranscriptResources>(`${ADMIN_API.VIDEO_TRANSCRIPTS}/resources`);
}

export async function getVideoTranscriptRuntimeConfig(): Promise<VideoTranscriptRuntimeConfig> {
  return apiClient.get<VideoTranscriptRuntimeConfig>(`${ADMIN_API.VIDEO_TRANSCRIPTS}/config`);
}

export async function updateVideoTranscriptRuntimeConfig(
  input: UpdateVideoTranscriptRuntimeConfigInput
): Promise<UpdateVideoTranscriptRuntimeConfigResponse> {
  return apiClient.put<UpdateVideoTranscriptRuntimeConfigResponse>(
    `${ADMIN_API.VIDEO_TRANSCRIPTS}/config/local-enabled`,
    input
  );
}

export async function getVideoTranscriptTasks(
  page = 1,
  limit = 20
): Promise<VideoTranscriptTaskListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  }).toString();

  return apiClient.get<VideoTranscriptTaskListResponse>(
    `${ADMIN_API.VIDEO_TRANSCRIPTS}/tasks?${query}`
  );
}
