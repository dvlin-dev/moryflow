/**
 * 失败 Tool 列表表格
 */

import { TableSkeleton } from '@/components/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CircleX, View } from 'lucide-react';
import { formatDateTime, formatDuration } from '@/lib/format';
import { ErrorTypeBadge } from './trace-status-badge';
import type { AgentSpan } from '../types';
import { resolveAgentTraceListViewState } from '../view-state';

interface FailedToolTableProps {
  spans: AgentSpan[];
  isLoading?: boolean;
  error?: unknown;
  onViewDetail: (span: AgentSpan) => void;
}

const TABLE_COLUMNS = [
  { width: 'w-36' },
  { width: 'w-32' },
  { width: 'w-32' },
  { width: 'w-40' },
  { width: 'w-24' },
  { width: 'w-16' },
  { width: 'w-16' },
];

export function FailedToolTable({
  spans,
  isLoading = false,
  error = null,
  onViewDetail,
}: FailedToolTableProps) {
  const viewState = resolveAgentTraceListViewState({
    isLoading,
    error,
    count: spans.length,
  });

  const renderRowsByState = () => {
    switch (viewState) {
      case 'loading':
        return <TableSkeleton columns={TABLE_COLUMNS} rows={10} />;
      case 'error':
        return (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-12 text-destructive">
              失败记录加载失败，请稍后重试
            </TableCell>
          </TableRow>
        );
      case 'empty':
        return (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-12">
              <CircleX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无失败记录</p>
            </TableCell>
          </TableRow>
        );
      case 'ready':
        return spans.map((span) => (
          <TableRow key={span.id}>
            <TableCell className="text-muted-foreground text-sm">
              {formatDateTime(span.startedAt)}
            </TableCell>
            <TableCell>
              <span className="font-mono text-sm">{span.name}</span>
            </TableCell>
            <TableCell>
              <span className="font-mono text-sm">{span.trace?.agentName ?? '-'}</span>
            </TableCell>
            <TableCell>
              <div className="truncate max-w-40" title={span.trace?.user?.email}>
                {span.trace?.user?.email ?? '-'}
              </div>
            </TableCell>
            <TableCell>
              <ErrorTypeBadge errorType={span.errorType} />
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {formatDuration(span.duration)}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => onViewDetail(span)}>
                <View className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ));
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间</TableHead>
            <TableHead>Tool 名称</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>用户</TableHead>
            <TableHead>错误类型</TableHead>
            <TableHead className="text-right">耗时</TableHead>
            <TableHead className="text-right">详情</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{renderRowsByState()}</TableBody>
      </Table>
    </div>
  );
}
