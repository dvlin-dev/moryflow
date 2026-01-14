/**
 * RunHistoryItem - 运行历史条目组件
 *
 * [PROPS]: run 数据
 * [POS]: 用于 Console 运行历史列表展示
 */

import { Card, CardContent } from '../components/card';
import { Button } from '../components/button';
import { DigestStatusBadge } from './digest-status-badge';
import { cn } from '../lib/utils';

export interface RunData {
  id: string;
  subscriptionId: string;
  status: string;
  source: string;
  scheduledAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  outputLocale: string;
  result: {
    itemsCandidate?: number;
    itemsSelected?: number;
    itemsDelivered?: number;
    itemsDedupSkipped?: number;
    itemsRedelivered?: number;
  } | null;
  billing: {
    totalCredits?: number;
  } | null;
  error: string | null;
}

export interface RunHistoryItemProps {
  run: RunData;
  onViewDetails?: () => void;
  className?: string;
}

export function RunHistoryItem({ run, onViewDetails, className }: RunHistoryItemProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const duration = () => {
    if (!run.startedAt || !run.finishedAt) return '-';
    const ms = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <Card className={cn(className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <DigestStatusBadge status={run.status} type="run" />
            <div className="text-sm">
              <p className="font-medium">{formatDate(run.scheduledAt)}</p>
              <p className="text-muted-foreground">
                {run.source === 'MANUAL' ? 'Manual' : 'Scheduled'} • {duration()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            {run.result && (
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>
                  <span className="font-medium">{run.result.itemsDelivered ?? 0}</span> delivered
                </span>
                <span>
                  <span className="font-medium">{run.result.itemsCandidate ?? 0}</span> candidates
                </span>
                <span>
                  <span className="font-medium">{run.result.itemsDedupSkipped ?? 0}</span> skipped
                </span>
              </div>
            )}

            {run.billing && run.billing.totalCredits && run.billing.totalCredits > 0 && (
              <span className="text-muted-foreground">{run.billing.totalCredits} credits</span>
            )}

            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              Details
            </Button>
          </div>
        </div>

        {run.error && (
          <div className="mt-2 rounded bg-destructive/10 p-2 text-sm text-destructive">
            {run.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
