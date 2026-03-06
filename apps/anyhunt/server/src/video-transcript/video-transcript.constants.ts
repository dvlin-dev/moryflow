/**
 * [PROVIDES]: 视频转写模块常量、队列 Job ID 规则、Redis Key 规则
 * [DEPENDS]: 无
 * [POS]: Video Transcript 模块共享常量入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export const VIDEO_TRANSCRIPT_FALLBACK_CHECK_JOB_PREFIX =
  'video-transcript-fallback-check';
export const VIDEO_TRANSCRIPT_CLOUD_RUN_JOB_PREFIX =
  'video-transcript-cloud-run';
export const VIDEO_TRANSCRIPT_LOCAL_ENABLED_OVERRIDE_KEY =
  'video:config:local-enabled';

export const VIDEO_TRANSCRIPT_FALLBACK_TIMEOUT_MS = 10 * 60 * 1000;
export const VIDEO_TRANSCRIPT_LOCAL_JOB_TIMEOUT_MS = 4 * 60 * 60 * 1000;
export const VIDEO_TRANSCRIPT_CLOUD_JOB_TIMEOUT_MS = 2 * 60 * 60 * 1000;
export const VIDEO_TRANSCRIPT_FALLBACK_SCAN_INTERVAL_MS = 30 * 1000;

export const VIDEO_TRANSCRIPT_HEARTBEAT_INTERVAL_MS = 15 * 1000;
export const VIDEO_TRANSCRIPT_HEARTBEAT_TTL_SECONDS = 60;
export const VIDEO_TRANSCRIPT_PREEMPT_TTL_SECONDS = 30 * 60;
export const VIDEO_TRANSCRIPT_LOCAL_OFFLINE_ALERT_MS = 3 * 60 * 1000;

export const VIDEO_TRANSCRIPT_CLOUD_DAILY_BUDGET_USD = 20;
export const VIDEO_TRANSCRIPT_CLOUD_BUDGET_ALERT_RATIO = 0.8;
export const VIDEO_TRANSCRIPT_CLOUD_BUDGET_TIMEZONE = 'Asia/Shanghai';
export const VIDEO_TRANSCRIPT_CLOUD_COST_PER_AUDIO_SECOND_USD = 0.0002;

export const VIDEO_TRANSCRIPT_DEFAULT_VAULT_ID = 'video-transcripts';

export const VIDEO_TRANSCRIPT_LOCAL_WORKER_NODE_ID_ENV =
  'VIDEO_TRANSCRIPT_LOCAL_NODE_ID';

export const VIDEO_TRANSCRIPT_SUPPORTED_HOSTS = [
  'douyin.com',
  'iesdouyin.com',
  'bilibili.com',
  'b23.tv',
  'xiaohongshu.com',
  'xhslink.com',
  'youtube.com',
  'youtu.be',
] as const;

export const VIDEO_TRANSCRIPT_TRACKING_QUERY_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'spm',
  'spm_id_from',
  'from',
  'feature',
  'si',
] as const;

export function buildVideoTranscriptFallbackCheckJobId(taskId: string): string {
  return `${VIDEO_TRANSCRIPT_FALLBACK_CHECK_JOB_PREFIX}:${taskId}`;
}

export function buildVideoTranscriptCloudRunJobId(taskId: string): string {
  return `${VIDEO_TRANSCRIPT_CLOUD_RUN_JOB_PREFIX}:${taskId}`;
}

export function buildVideoTranscriptPreemptKey(taskId: string): string {
  return `video:task:${taskId}:preempt`;
}

export function buildVideoTranscriptHeartbeatKey(nodeId: string): string {
  return `video:worker:local:${nodeId}:heartbeat`;
}

export function buildVideoTranscriptBudgetKey(dayKey: string): string {
  return `video:cloud:budget:${dayKey}`;
}

export function parseBooleanEnv(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export const VIDEO_TRANSCRIPT_TERMINAL_STATUSES = new Set([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);
