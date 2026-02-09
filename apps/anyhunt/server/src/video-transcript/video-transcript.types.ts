/**
 * [DEFINES]: 视频转写模块输入输出类型
 * [USED_BY]: video-transcript.service.ts, processors, controllers
 * [POS]: Video Transcript 模块类型定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type VideoPlatform = string;

export interface VideoTranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface VideoTranscriptResult {
  text: string;
  segments: VideoTranscriptSegment[];
  durationSec: number;
  languageDetected?: string;
}

export interface VideoTranscriptArtifacts {
  userId: string;
  vaultId: string;
  videoFileId?: string;
  audioFileId?: string;
  textFileId?: string;
  srtFileId?: string;
  jsonFileId?: string;
  videoUrl?: string;
  audioUrl?: string;
  textUrl?: string;
  srtUrl?: string;
  jsonUrl?: string;
}

export interface VideoTranscriptLocalJobData {
  taskId: string;
}

export interface VideoTranscriptCloudJobData {
  kind: 'fallback-check' | 'cloud-run';
  taskId: string;
  reason?: 'timeout' | 'local-disabled';
}

export interface VideoTranscriptHeartbeatPayload {
  nodeId: string;
  hostname: string;
  pid: number;
  cpuLoad1: number;
  memoryTotal: number;
  memoryFree: number;
  processRss: number;
  activeTasks: number;
  updatedAt: string;
}

export interface VideoTranscriptBudgetReservation {
  allowed: boolean;
  estimatedCostUsd: number;
  usageAfterReserveUsd: number;
  dailyBudgetUsd: number;
  dayKey: string;
  timezone: string;
}

export interface VideoTranscriptLocalOutput {
  text: string;
  segments: VideoTranscriptSegment[];
  languageDetected?: string;
  txtPath: string;
  jsonPath: string;
  srtPath: string;
}

export interface VideoTranscriptCloudOutput {
  text: string;
  segments: VideoTranscriptSegment[];
  languageDetected?: string;
  txtPath: string;
  jsonPath: string;
  srtPath: string;
}
