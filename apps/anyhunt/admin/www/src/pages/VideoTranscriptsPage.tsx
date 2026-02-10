/**
 * [PROPS]: none
 * [EMITS]: pagination/refresh actions
 * [POS]: Admin 视频转写执行与资源看板
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 apps/anyhunt/admin/www/CLAUDE.md
 */

import { useMemo, useState } from 'react';
import { Cloud, Cpu, RefreshCw, Server } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Switch,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  Progress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@anyhunt/ui';
import { formatRelativeTime } from '@anyhunt/ui/lib';
import {
  useVideoTranscriptOverview,
  useVideoTranscriptRuntimeConfig,
  useVideoTranscriptResources,
  useVideoTranscriptTasks,
  useUpdateVideoTranscriptRuntimeConfig,
} from '@/features/video-transcripts';

const PAGE_SIZE = 20;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function getStatusBadgeVariant(status: string) {
  if (status === 'COMPLETED') {
    return 'default';
  }
  if (status === 'FAILED' || status === 'CANCELLED') {
    return 'destructive';
  }
  return 'secondary';
}

export default function VideoTranscriptsPage() {
  const [page, setPage] = useState(1);

  const overviewQuery = useVideoTranscriptOverview();
  const resourcesQuery = useVideoTranscriptResources();
  const configQuery = useVideoTranscriptRuntimeConfig();
  const tasksQuery = useVideoTranscriptTasks(page, PAGE_SIZE);
  const updateRuntimeConfig = useUpdateVideoTranscriptRuntimeConfig();

  const runningCount = useMemo(() => {
    if (!overviewQuery.data) {
      return 0;
    }

    const status = overviewQuery.data.status;
    return (
      status.pending +
      status.downloading +
      status.extractingAudio +
      status.transcribing +
      status.uploading
    );
  }, [overviewQuery.data]);

  const cloudFallbackRate = useMemo(() => {
    if (!overviewQuery.data) {
      return 0;
    }

    const totalCompleted =
      overviewQuery.data.executor.localCompleted + overviewQuery.data.executor.cloudCompleted;

    if (totalCompleted <= 0) {
      return 0;
    }

    return (overviewQuery.data.executor.cloudCompleted / totalCompleted) * 100;
  }, [overviewQuery.data]);

  const budgetUsagePercent = useMemo(() => {
    const budget = resourcesQuery.data?.budget;
    if (!budget || budget.dailyBudgetUsd <= 0) {
      return 0;
    }
    return Math.min((budget.usedUsd / budget.dailyBudgetUsd) * 100, 100);
  }, [resourcesQuery.data?.budget]);

  const isLoading =
    overviewQuery.isLoading ||
    resourcesQuery.isLoading ||
    tasksQuery.isLoading ||
    configQuery.isLoading;

  const handleToggleLocalEnabled = async (enabled: boolean) => {
    try {
      await updateRuntimeConfig.mutateAsync({
        enabled,
        reason: `Admin set local enabled to ${enabled}`,
      });
      toast.success(`Local routing ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update local routing');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <PageHeader
          title="Video Transcripts"
          description="Execution overview, local node resources and cloud fallback budget."
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            void overviewQuery.refetch();
            void resourcesQuery.refetch();
            void configQuery.refetch();
            void tasksQuery.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : overviewQuery.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Tasks</CardDescription>
              <CardTitle className="text-3xl">{overviewQuery.data.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Running</CardDescription>
              <CardTitle className="text-3xl">{runningCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl">{overviewQuery.data.status.completed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cloud Fallback Rate</CardDescription>
              <CardTitle className="text-3xl">{cloudFallbackRate.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {overviewQuery.data?.today ? (
        <Card>
          <CardHeader>
            <CardTitle>Today Metrics</CardTitle>
            <CardDescription>
              Success/failure, fallback trigger and SLA metrics ({overviewQuery.data.today.timezone}
              ).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-semibold">{overviewQuery.data.today.successRate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Failure Rate</p>
              <p className="text-2xl font-semibold">{overviewQuery.data.today.failureRate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fallback Trigger Rate</p>
              <p className="text-2xl font-semibold">
                {overviewQuery.data.today.cloudFallbackTriggerRate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Local Within 10m</p>
              <p className="text-2xl font-semibold">
                {overviewQuery.data.today.localWithinTimeoutRate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Duration</p>
              <p className="text-2xl font-semibold">
                {overviewQuery.data.today.averageDurationSec.toFixed(1)}s
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Budget Gate Triggered</p>
              <p className="text-2xl font-semibold">
                {overviewQuery.data.today.budgetGateTriggered}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Local Routing Switch</CardTitle>
          <CardDescription>
            Controls whether new tasks go to local queue first. Changes are audited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configQuery.data ? (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">VIDEO_TRANSCRIPT_LOCAL_ENABLED</p>
                  <p className="text-xs text-muted-foreground">
                    Source: {configQuery.data.source}
                    {configQuery.data.overrideRaw ? ` (${configQuery.data.overrideRaw})` : ''}
                  </p>
                </div>
                <Switch
                  checked={configQuery.data.localEnabled}
                  disabled={updateRuntimeConfig.isPending}
                  onCheckedChange={(checked) => {
                    void handleToggleLocalEnabled(checked);
                  }}
                />
              </div>

              {configQuery.data.audits.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configQuery.data.audits.map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell>{formatRelativeTime(audit.createdAt)}</TableCell>
                        <TableCell>{audit.actorUserId}</TableCell>
                        <TableCell>{audit.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No audit records yet.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No runtime config data.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Cloud Fallback Budget
            </CardTitle>
            <CardDescription>Daily cap and usage in configured timezone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resourcesQuery.data ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Used</p>
                    <p className="text-lg font-semibold">
                      ${resourcesQuery.data.budget.usedUsd.toFixed(4)} / $
                      {resourcesQuery.data.budget.dailyBudgetUsd.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="text-lg font-semibold">
                      ${resourcesQuery.data.budget.remainingUsd.toFixed(4)}
                    </p>
                  </div>
                </div>
                <Progress value={budgetUsagePercent} className="h-2" />
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{resourcesQuery.data.budget.dayKey}</Badge>
                  <Badge variant="outline">{resourcesQuery.data.budget.timezone}</Badge>
                  {resourcesQuery.data.alerts.budgetOver80Percent ? (
                    <Badge variant="destructive">Budget {'>'} 80%</Badge>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No budget data.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Queue Snapshot
            </CardTitle>
            <CardDescription>Local and cloud fallback queue status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resourcesQuery.data ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">Local Queue</p>
                  <p className="text-xs text-muted-foreground">
                    {resourcesQuery.data.queues.local.name}
                  </p>
                  <p className="mt-2 text-xs">
                    waiting: {resourcesQuery.data.queues.local.waiting}
                  </p>
                  <p className="text-xs">active: {resourcesQuery.data.queues.local.active}</p>
                  <p className="text-xs">failed: {resourcesQuery.data.queues.local.failed}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">Cloud Fallback Queue</p>
                  <p className="text-xs text-muted-foreground">
                    {resourcesQuery.data.queues.cloudFallback.name}
                  </p>
                  <p className="mt-2 text-xs">
                    waiting: {resourcesQuery.data.queues.cloudFallback.waiting}
                  </p>
                  <p className="text-xs">
                    active: {resourcesQuery.data.queues.cloudFallback.active}
                  </p>
                  <p className="text-xs">
                    failed: {resourcesQuery.data.queues.cloudFallback.failed}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No queue data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Local Nodes
          </CardTitle>
          <CardDescription>
            Heartbeat-based node status from Redis TTL keys.
            {resourcesQuery.data?.alerts.localNodeOffline ? (
              <span className="ml-1 text-destructive">Detected stale local nodes.</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resourcesQuery.data?.nodes.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node</TableHead>
                  <TableHead>Active Tasks</TableHead>
                  <TableHead>CPU (load1)</TableHead>
                  <TableHead>Memory</TableHead>
                  <TableHead>Process RSS</TableHead>
                  <TableHead>Heartbeat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resourcesQuery.data.nodes.map((node) => (
                  <TableRow key={node.nodeId}>
                    <TableCell>
                      <div className="font-medium">{node.nodeId}</div>
                      <div className="text-xs text-muted-foreground">{node.hostname}</div>
                    </TableCell>
                    <TableCell>{node.activeTasks}</TableCell>
                    <TableCell>{node.cpuLoad1.toFixed(2)}</TableCell>
                    <TableCell>
                      {formatBytes(node.memoryFree)} / {formatBytes(node.memoryTotal)}
                    </TableCell>
                    <TableCell>{formatBytes(node.processRss)}</TableCell>
                    <TableCell>{formatRelativeTime(node.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No live local nodes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Tasks</CardTitle>
          <CardDescription>Task status, executor and source URL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasksQuery.data?.items.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Executor</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Source URL</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasksQuery.data.items.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                      </TableCell>
                      <TableCell>{task.executor ?? '-'}</TableCell>
                      <TableCell>{task.platform}</TableCell>
                      <TableCell className="max-w-sm truncate" title={task.sourceUrl}>
                        {task.sourceUrl}
                      </TableCell>
                      <TableCell>{formatRelativeTime(task.createdAt)}</TableCell>
                      <TableCell
                        className="max-w-xs truncate text-xs text-destructive"
                        title={task.error ?? ''}
                      >
                        {task.error ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {tasksQuery.data.pagination.page} /{' '}
                  {tasksQuery.data.pagination.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (tasksQuery.data.pagination.totalPages || 1)}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          )}
        </CardContent>
      </Card>

      {overviewQuery.error || resourcesQuery.error || configQuery.error || tasksQuery.error ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">
            {(overviewQuery.error as Error | null)?.message ||
              (resourcesQuery.error as Error | null)?.message ||
              (configQuery.error as Error | null)?.message ||
              (tasksQuery.error as Error | null)?.message ||
              'Failed to load data.'}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
