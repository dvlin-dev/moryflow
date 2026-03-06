/**
 * [PROVIDES]: Queues 页面常量映射与确认文案
 * [DEPENDS]: QueueName/QueueJobStatus 类型
 * [POS]: Queues 容器与子组件共享配置
 */

import type { QueueJobStatus, QueueName } from './types';

export const QUEUE_LABELS: Record<QueueName, string> = {
  screenshot: 'Screenshot',
  scrape: 'Scrape',
  crawl: 'Crawl',
  'batch-scrape': 'Batch Scrape',
  VIDEO_TRANSCRIPT_LOCAL_QUEUE: 'Video Transcript (Local)',
  VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE: 'Video Transcript (Cloud Fallback)',
};

export const QUEUE_STATUS_TABS: Array<{ value: QueueJobStatus; label: string }> = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'delayed', label: 'Delayed' },
];

export type QueueConfirmAction = 'retry' | 'clean-completed' | 'clean-failed' | 'cleanup-stale';

export function getQueueConfirmDescription(
  action: QueueConfirmAction,
  queueName: QueueName
): string {
  const queueLabel = QUEUE_LABELS[queueName];

  switch (action) {
    case 'retry':
      return `Retry all failed jobs in "${queueLabel}"?`;
    case 'clean-completed':
      return `Clean all completed jobs in "${queueLabel}"?`;
    case 'clean-failed':
      return `Clean all failed jobs in "${queueLabel}"?`;
    case 'cleanup-stale':
      return 'Cleanup all jobs stuck for more than 30 minutes? Those jobs will be marked as failed.';
    default:
      return '';
  }
}
