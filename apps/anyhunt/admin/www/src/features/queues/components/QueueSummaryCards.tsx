/**
 * [PROPS]: summary
 * [EMITS]: none
 * [POS]: Queues 总览统计卡片
 */

import { Card, CardContent } from '@moryflow/ui';
import type { AllQueueStats } from '../types';

export interface QueueSummaryCardsProps {
  summary: AllQueueStats['summary'] | undefined;
}

export function QueueSummaryCards({ summary }: QueueSummaryCardsProps) {
  if (!summary) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold text-yellow-600">{summary.totalWaiting}</div>
          <p className="text-sm text-muted-foreground">总等待任务</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold text-blue-600">{summary.totalActive}</div>
          <p className="text-sm text-muted-foreground">正在处理</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold text-red-600">{summary.totalFailed}</div>
          <p className="text-sm text-muted-foreground">失败任务</p>
        </CardContent>
      </Card>
    </div>
  );
}
