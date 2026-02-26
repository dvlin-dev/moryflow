/**
 * [PROPS]: queues/isLoading/selectedQueue/onSelect
 * [EMITS]: onSelect
 * [POS]: Queues 列表卡片（含 loading）
 */

import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@moryflow/ui';
import { QUEUE_LABELS } from '../constants';
import type { QueueName, QueueStats } from '../types';

export interface QueueCardsGridProps {
  queues: QueueStats[] | undefined;
  isLoading: boolean;
  selectedQueue: QueueName;
  onSelect: (queue: QueueName) => void;
}

function QueueCard({
  stats,
  isSelected,
  onSelect,
}: {
  stats: QueueStats;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isPaused = stats.paused > 0;

  return (
    <Card
      className={`cursor-pointer transition-colors ${isSelected ? 'border-primary' : ''}`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{QUEUE_LABELS[stats.name]}</span>
          {isPaused ? (
            <Badge variant="outline" className="text-yellow-600">
              已暂停
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold text-yellow-600">{stats.waiting}</p>
            <p className="text-xs text-muted-foreground">等待</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
            <p className="text-xs text-muted-foreground">处理中</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">失败</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QueueCardsGrid({
  queues,
  isLoading,
  selectedQueue,
  onSelect,
}: QueueCardsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-32" />
        ))}
      </div>
    );
  }

  if (!queues || queues.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {queues.map((stats) => (
        <QueueCard
          key={stats.name}
          stats={stats}
          isSelected={selectedQueue === stats.name}
          onSelect={() => onSelect(stats.name)}
        />
      ))}
    </div>
  );
}
