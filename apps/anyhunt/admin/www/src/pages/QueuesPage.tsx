/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Queues 页面 - 队列监控（Lucide icons direct render）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 apps/anyhunt/admin/www/CLAUDE.md
 */
import { useState } from 'react';
import {
  TriangleAlert,
  CircleX,
  CircleCheck,
  Clock,
  Delete,
  Loader,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Timer,
} from 'lucide-react';
import { PageHeader } from '@anyhunt/ui';
import { formatRelativeTime } from '@anyhunt/ui/lib';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@anyhunt/ui';
import {
  useAllQueueStats,
  useQueueJobs,
  useRetryAllFailed,
  useCleanQueue,
  usePauseQueue,
} from '@/features/queues';
import { useCleanupStaleJobs } from '@/features/jobs';
import type { QueueName, QueueJobStatus, QueueStats } from '@/features/queues';

const QUEUE_LABELS: Record<string, string> = {
  screenshot: 'Screenshot',
  scrape: 'Scrape',
  crawl: 'Crawl',
  'batch-scrape': 'Batch Scrape',
  VIDEO_TRANSCRIPT_LOCAL_QUEUE: 'Video Transcript (Local)',
  VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE: 'Video Transcript (Cloud Fallback)',
};

const STATUS_TABS: { value: QueueJobStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'waiting', label: 'Waiting', icon: <Clock className="h-4 w-4" /> },
  { value: 'active', label: 'Active', icon: <Loader className="h-4 w-4" /> },
  {
    value: 'completed',
    label: 'Completed',
    icon: <CircleCheck className="h-4 w-4" />,
  },
  { value: 'failed', label: 'Failed', icon: <CircleX className="h-4 w-4" /> },
  { value: 'delayed', label: 'Delayed', icon: <Timer className="h-4 w-4" /> },
];

/** 队列状态卡片 */
function QueueCard({
  stats,
  onSelect,
  isSelected,
}: {
  stats: QueueStats;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const isPaused = stats.paused > 0;

  return (
    <Card
      className={`cursor-pointer transition-colors ${isSelected ? 'border-primary' : ''}`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{QUEUE_LABELS[stats.name] || stats.name}</span>
          {isPaused && (
            <Badge variant="outline" className="text-yellow-600">
              Paused
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold text-yellow-600">{stats.waiting}</p>
            <p className="text-xs text-muted-foreground">Waiting</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** 队列任务列表 */
function QueueJobList({ queueName, status }: { queueName: QueueName; status: QueueJobStatus }) {
  const { data, isLoading } = useQueueJobs(queueName, { status, limit: 20 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">No jobs yet.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead>Time</TableHead>
          {status === 'failed' && <TableHead>Failed Reason</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-mono text-xs">{job.id}</TableCell>
            <TableCell>{job.name}</TableCell>
            <TableCell>{job.attemptsMade}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatRelativeTime(job.timestamp)}
            </TableCell>
            {status === 'failed' && (
              <TableCell className="max-w-xs truncate text-xs text-destructive">
                {job.failedReason}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function QueuesPage() {
  const [selectedQueue, setSelectedQueue] = useState<QueueName>('scrape');
  const [selectedStatus, setSelectedStatus] = useState<QueueJobStatus>('waiting');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'retry' | 'clean-completed' | 'clean-failed' | 'cleanup-stale' | null;
  }>({ open: false, action: null });

  const { data, isLoading, refetch } = useAllQueueStats();
  const { mutate: retryAllFailed, isPending: isRetrying } = useRetryAllFailed();
  const { mutate: cleanQueue, isPending: isCleaning } = useCleanQueue();
  const { mutate: togglePause } = usePauseQueue();
  const { mutate: cleanupStaleJobs, isPending: isCleaningStale } = useCleanupStaleJobs();

  const selectedStats = data?.queues.find((q) => q.name === selectedQueue);
  const isPaused = selectedStats?.paused ? selectedStats.paused > 0 : false;

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
    }
    setConfirmDialog({ open: false, action: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Queues" description="BullMQ queue monitor." />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmDialog({ open: true, action: 'cleanup-stale' })}
            disabled={isCleaningStale}
          >
            <TriangleAlert className="mr-2 h-4 w-4" />
            Cleanup stuck jobs
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-600">{data.summary.totalWaiting}</div>
              <p className="text-sm text-muted-foreground">Total waiting jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{data.summary.totalActive}</div>
              <p className="text-sm text-muted-foreground">Active jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-red-600">{data.summary.totalFailed}</div>
              <p className="text-sm text-muted-foreground">Failed jobs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queue Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {data?.queues.map((stats) => (
            <QueueCard
              key={stats.name}
              stats={stats}
              onSelect={() => setSelectedQueue(stats.name as QueueName)}
              isSelected={selectedQueue === stats.name}
            />
          ))}
        </div>
      )}

      {/* Selected Queue Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {QUEUE_LABELS[selectedQueue] || selectedQueue} Queue
              {isPaused && (
                <Badge variant="outline" className="ml-2 text-yellow-600">
                  Paused
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => togglePause({ name: selectedQueue, pause: !isPaused })}
              >
                {isPaused ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog({ open: true, action: 'retry' })}
                disabled={isRetrying || (selectedStats?.failed ?? 0) === 0}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry all failed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog({ open: true, action: 'clean-completed' })}
                disabled={isCleaning}
              >
                <Delete className="mr-2 h-4 w-4" />
                Clean completed
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedStatus}
            onValueChange={(v) => setSelectedStatus(v as QueueJobStatus)}
          >
            <TabsList>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                  {tab.icon}
                  {tab.label}
                  {selectedStats && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedStats[tab.value]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <QueueJobList queueName={selectedQueue} status={tab.value} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'retry' &&
                `Retry all failed jobs in "${QUEUE_LABELS[selectedQueue] || selectedQueue}"?`}
              {confirmDialog.action === 'clean-completed' &&
                `Clean all completed jobs in "${QUEUE_LABELS[selectedQueue] || selectedQueue}"?`}
              {confirmDialog.action === 'clean-failed' &&
                `Clean all failed jobs in "${QUEUE_LABELS[selectedQueue] || selectedQueue}"?`}
              {confirmDialog.action === 'cleanup-stale' &&
                'Cleanup all jobs stuck for more than 30 minutes? Those jobs will be marked as failed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
