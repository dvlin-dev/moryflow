/**
 * [DEFINES]: Admin Video Transcript 类型定义
 * [USED_BY]: video-transcripts api/hooks/page
 * [POS]: Admin Video Transcript 可观测类型入口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import type { Pagination } from '@/lib/types';

export interface VideoTranscriptBudget {
  dayKey: string;
  timezone: string;
  usedUsd: number;
  dailyBudgetUsd: number;
  remainingUsd: number;
}

export interface VideoTranscriptOverview {
  total: number;
  status: {
    pending: number;
    downloading: number;
    extractingAudio: number;
    transcribing: number;
    uploading: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  executor: {
    localCompleted: number;
    cloudCompleted: number;
  };
  budget: VideoTranscriptBudget;
  today: {
    timezone: string;
    startAt: string;
    endAt: string;
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
    successRate: number;
    failureRate: number;
    cloudFallbackTriggered: number;
    cloudFallbackTriggerRate: number;
    localCompletedWithinTimeout: number;
    localWithinTimeoutRate: number;
    averageDurationSec: number;
    budgetGateTriggered: number;
  };
}

export interface VideoTranscriptNode {
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

export interface VideoTranscriptQueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface VideoTranscriptResources {
  queues: {
    local: VideoTranscriptQueueMetrics;
    cloudFallback: VideoTranscriptQueueMetrics;
  };
  nodes: VideoTranscriptNode[];
  budget: VideoTranscriptBudget;
  alerts: {
    budgetOver80Percent: boolean;
    localNodeOffline: boolean;
    staleNodeIds: string[];
  };
}

export interface VideoTranscriptTaskItem {
  id: string;
  userId: string;
  platform: string;
  sourceUrl: string;
  status: string;
  executor: 'LOCAL' | 'CLOUD_FALLBACK' | null;
  localStartedAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface VideoTranscriptTaskListResponse {
  items: VideoTranscriptTaskItem[];
  pagination: Pagination;
}

export interface VideoTranscriptConfigAudit {
  id: string;
  actorUserId: string;
  reason: string;
  metadata: unknown;
  createdAt: string;
}

export interface VideoTranscriptRuntimeConfig {
  localEnabled: boolean;
  source: 'env' | 'override';
  overrideRaw: string | null;
  audits: VideoTranscriptConfigAudit[];
}

export interface UpdateVideoTranscriptRuntimeConfigInput {
  enabled: boolean;
  reason?: string;
}

export interface UpdateVideoTranscriptRuntimeConfigResponse {
  localEnabled: boolean;
  source: 'env' | 'override';
  overrideRaw: string | null;
  auditLogId: string;
  updatedAt: string;
}
