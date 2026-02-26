/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Queues 页面 - 队列监控编排层
 */

import { useState } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button, PageHeader } from '@moryflow/ui';
import { useCleanupStaleJobs } from '@/features/jobs';
import {
  QueueActionConfirmDialog,
  QueueCardsGrid,
  QueueJobsPanel,
  QueueSummaryCards,
  useAllQueueStats,
  useCleanQueue,
  usePauseQueue,
  useRetryAllFailed,
  type QueueConfirmAction,
  type QueueJobStatus,
  type QueueName,
} from '@/features/queues';

interface ConfirmDialogState {
  open: boolean;
  action: QueueConfirmAction | null;
}

export default function QueuesPage() {
  const [selectedQueue, setSelectedQueue] = useState<QueueName>('scrape');
  const [selectedStatus, setSelectedStatus] = useState<QueueJobStatus>('waiting');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    action: null,
  });

  const { data, isLoading, refetch } = useAllQueueStats();
  const { mutate: retryAllFailed, isPending: isRetrying } = useRetryAllFailed();
  const { mutate: cleanQueue, isPending: isCleaning } = useCleanQueue();
  const { mutate: togglePause } = usePauseQueue();
  const { mutate: cleanupStaleJobs, isPending: isCleaningStale } = useCleanupStaleJobs();

  const selectedStats = data?.queues.find((queue) => queue.name === selectedQueue);
  const isPaused = (selectedStats?.paused ?? 0) > 0;

  const openConfirmDialog = (action: QueueConfirmAction) => {
    setConfirmDialog({
      open: true,
      action,
    });
  };

  const handleConfirmAction = () => {
    switch (confirmDialog.action) {
      case 'retry':
        retryAllFailed(selectedQueue);
        break;
      case 'clean-completed':
        cleanQueue({ name: selectedQueue, status: 'completed' });
        break;
      case 'clean-failed':
        cleanQueue({ name: selectedQueue, status: 'failed' });
        break;
      case 'cleanup-stale':
        cleanupStaleJobs({ maxAgeMinutes: 30 });
        break;
      default:
        break;
    }

    setConfirmDialog({
      open: false,
      action: null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Queues" description="BullMQ 队列监控" />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => openConfirmDialog('cleanup-stale')}
            disabled={isCleaningStale}
          >
            <TriangleAlert className="mr-2 h-4 w-4" />
            清理卡住任务
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      <QueueSummaryCards summary={data?.summary} />

      <QueueCardsGrid
        queues={data?.queues}
        isLoading={isLoading}
        selectedQueue={selectedQueue}
        onSelect={(queue) => setSelectedQueue(queue)}
      />

      <QueueJobsPanel
        selectedQueue={selectedQueue}
        selectedStatus={selectedStatus}
        selectedStats={selectedStats}
        isPaused={isPaused}
        isRetrying={isRetrying}
        isCleaning={isCleaning}
        onStatusChange={setSelectedStatus}
        onTogglePause={() => togglePause({ name: selectedQueue, pause: !isPaused })}
        onRetry={() => openConfirmDialog('retry')}
        onCleanCompleted={() => openConfirmDialog('clean-completed')}
      />

      <QueueActionConfirmDialog
        open={confirmDialog.open}
        action={confirmDialog.action}
        selectedQueue={selectedQueue}
        onOpenChange={(open) =>
          setConfirmDialog({
            open,
            action: open ? confirmDialog.action : null,
          })
        }
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
