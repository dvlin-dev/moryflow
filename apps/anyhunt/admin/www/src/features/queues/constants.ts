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
};

export const QUEUE_STATUS_TABS: Array<{ value: QueueJobStatus; label: string }> = [
  { value: 'waiting', label: '等待中' },
  { value: 'active', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'delayed', label: '延迟' },
];

export type QueueConfirmAction = 'retry' | 'clean-completed' | 'clean-failed' | 'cleanup-stale';

export function getQueueConfirmDescription(
  action: QueueConfirmAction,
  queueName: QueueName
): string {
  const queueLabel = QUEUE_LABELS[queueName];

  switch (action) {
    case 'retry':
      return `确定要重试 ${queueLabel} 队列中所有失败的任务吗？`;
    case 'clean-completed':
      return `确定要清理 ${queueLabel} 队列中所有已完成的任务吗？`;
    case 'clean-failed':
      return `确定要清理 ${queueLabel} 队列中所有失败的任务吗？`;
    case 'cleanup-stale':
      return '确定要清理所有卡住超过 30 分钟的任务吗？这些任务将被标记为失败。';
    default:
      return '';
  }
}
