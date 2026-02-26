/**
 * [PROPS]: timing
 * [EMITS]: none
 * [POS]: Job 详情耗时分解展示
 */

import { formatMs } from '@/lib/job-utils';
import type { JobTiming } from '../types';

export interface JobTimingBreakdownProps {
  timing: JobTiming;
}

export function JobTimingBreakdown({ timing }: JobTimingBreakdownProps) {
  const items = [
    { label: '排队等待', value: timing.queueWait, color: 'bg-gray-400' },
    { label: '页面加载', value: timing.fetch, color: 'bg-blue-500' },
    { label: '页面渲染', value: timing.render, color: 'bg-green-500' },
    { label: '内容转换', value: timing.transform, color: 'bg-yellow-500' },
    { label: '截图捕获', value: timing.screenshot, color: 'bg-purple-500' },
    { label: '图片处理', value: timing.imageProcess, color: 'bg-pink-500' },
    { label: '文件上传', value: timing.upload, color: 'bg-orange-500' },
  ].filter((item) => item.value !== null && item.value > 0);

  const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
  if (total === 0) {
    return <p className="text-muted-foreground">暂无耗时数据</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex h-6 overflow-hidden rounded-md">
        {items.map((item, index) => (
          <div
            key={index}
            className={`${item.color} transition-all`}
            style={{ width: `${((item.value ?? 0) / total) * 100}%` }}
            title={`${item.label}: ${formatMs(item.value)}`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded ${item.color}`} />
            <span>
              {item.label}: {formatMs(item.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="text-sm font-medium">总耗时: {formatMs(timing.total)}</div>
    </div>
  );
}
