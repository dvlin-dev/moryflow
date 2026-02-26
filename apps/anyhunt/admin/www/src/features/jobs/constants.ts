/**
 * [PROVIDES]: jobs 页面展示常量
 * [DEPENDS]: JobStatus 类型
 * [POS]: 供 Jobs 页面与子组件复用
 */

import type { JobStatus } from './types';

export interface JobStatusOption {
  value: JobStatus | 'all';
  label: string;
}

export const JOB_STATUS_OPTIONS: JobStatusOption[] = [
  { value: 'all', label: '全部状态' },
  { value: 'PENDING', label: '等待中' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'FAILED', label: '已失败' },
];
