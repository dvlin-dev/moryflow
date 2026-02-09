/**
 * [DEFINES]: Video Transcript playground 类型
 * [USED_BY]: video-transcript-playground api/hooks/page
 * [POS]: Console Video Transcript 类型入口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import type { PaginatedResponse } from '@/lib/types';

export type VideoTranscriptTaskStatus =
  | 'PENDING'
  | 'DOWNLOADING'
  | 'EXTRACTING_AUDIO'
  | 'TRANSCRIBING'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type VideoTranscriptExecutor = 'LOCAL' | 'CLOUD_FALLBACK' | null;

export interface VideoTranscriptTask {
  id: string;
  userId: string;
  platform: string;
  sourceUrl: string;
  status: VideoTranscriptTaskStatus;
  executor: VideoTranscriptExecutor;
  localStartedAt: string | null;
  artifacts: unknown;
  result: unknown;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoTranscriptTaskInput {
  url: string;
}

export interface CreateVideoTranscriptTaskResponse {
  taskId: string;
  status: VideoTranscriptTaskStatus;
}

export type ListVideoTranscriptTasksResponse = PaginatedResponse<VideoTranscriptTask>;
