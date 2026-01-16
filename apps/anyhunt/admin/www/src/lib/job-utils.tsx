/**
 * Job 相关共享工具函数和组件
 */
import {
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Loading01Icon,
} from '@hugeicons/core-free-icons';
import { Badge, Icon } from '@anyhunt/ui';
import type { JobStatus, JobErrorCode } from '@/features/jobs';

/**
 * 格式化毫秒数为可读字符串
 */
export function formatMs(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * 截断 URL 显示
 */
export function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + '...';
}

/**
 * 获取状态 Badge 组件
 */
export function getStatusBadge(status: JobStatus) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="outline" className="gap-1">
          <Icon icon={Clock01Icon} className="h-3 w-3" />
          等待中
        </Badge>
      );
    case 'PROCESSING':
      return (
        <Badge variant="secondary" className="gap-1">
          <Icon icon={Loading01Icon} className="h-3 w-3 animate-spin" />
          处理中
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <Icon icon={CheckmarkCircle01Icon} className="h-3 w-3" />
          成功
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="destructive" className="gap-1">
          <Icon icon={CancelCircleIcon} className="h-3 w-3" />
          失败
        </Badge>
      );
  }
}

/**
 * 错误码中文标签
 */
export const ERROR_LABELS: Record<JobErrorCode, string> = {
  PAGE_TIMEOUT: '页面超时',
  URL_NOT_ALLOWED: 'URL 不允许',
  SELECTOR_NOT_FOUND: '选择器未找到',
  BROWSER_ERROR: '浏览器错误',
  NETWORK_ERROR: '网络错误',
  RATE_LIMITED: '限流',
  QUOTA_EXCEEDED: '配额不足',
  INVALID_URL: 'URL 无效',
  PAGE_NOT_FOUND: '404 页面不存在',
  ACCESS_DENIED: '403 访问被拒',
};

/**
 * 错误码颜色配置
 */
export const ERROR_COLORS: Record<JobErrorCode, string> = {
  PAGE_TIMEOUT: '#ef4444',
  URL_NOT_ALLOWED: '#f97316',
  SELECTOR_NOT_FOUND: '#eab308',
  BROWSER_ERROR: '#22c55e',
  NETWORK_ERROR: '#3b82f6',
  RATE_LIMITED: '#8b5cf6',
  QUOTA_EXCEEDED: '#ec4899',
  INVALID_URL: '#6366f1',
  PAGE_NOT_FOUND: '#14b8a6',
  ACCESS_DENIED: '#f43f5e',
};
