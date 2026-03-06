/**
 * [PROPS]: queueName/status
 * [EMITS]: none
 * [POS]: 单个队列状态下的任务列表内容
 */

import { ListEmptyState, ListErrorState, ListLoadingRows } from '@/components/list-state';
import { useQueueJobs } from '../hooks';
import type { QueueJob, QueueJobStatus, QueueName } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@moryflow/ui';

type QueueJobListState = 'loading' | 'error' | 'empty' | 'ready';

function resolveQueueJobListState(params: {
  isLoading: boolean;
  hasError: boolean;
  itemCount: number;
}): QueueJobListState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.hasError) {
    return 'error';
  }

  if (params.itemCount === 0) {
    return 'empty';
  }

  return 'ready';
}

function QueueJobsTable({
  items,
  showFailedReason,
}: {
  items: QueueJob[];
  showFailedReason: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>任务名</TableHead>
          <TableHead>尝试次数</TableHead>
          <TableHead>时间</TableHead>
          {showFailedReason ? <TableHead>错误原因</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-mono text-xs">{job.id}</TableCell>
            <TableCell>{job.name}</TableCell>
            <TableCell>{job.attemptsMade}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(job.timestamp).toLocaleTimeString('zh-CN')}
            </TableCell>
            {showFailedReason ? (
              <TableCell className="max-w-xs truncate text-xs text-destructive">
                {job.failedReason}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export interface QueueJobListContentProps {
  queueName: QueueName;
  status: QueueJobStatus;
}

export function QueueJobListContent({ queueName, status }: QueueJobListContentProps) {
  const { data, isLoading, isError, error } = useQueueJobs(queueName, { status, limit: 20 });
  const state = resolveQueueJobListState({
    isLoading,
    hasError: isError,
    itemCount: data?.items.length ?? 0,
  });

  switch (state) {
    case 'loading':
      return <ListLoadingRows />;
    case 'error':
      return (
        <ListErrorState
          message={error instanceof Error ? error.message : '加载队列任务失败'}
          messageClassName="text-destructive text-sm"
        />
      );
    case 'empty':
      return <ListEmptyState message="暂无任务" className="py-8 text-center" />;
    case 'ready':
      return <QueueJobsTable items={data?.items ?? []} showFailedReason={status === 'failed'} />;
    default:
      return null;
  }
}
