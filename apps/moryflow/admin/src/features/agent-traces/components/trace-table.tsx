/**
 * Trace 列表表格
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
import { File, View } from 'lucide-react';
import { formatDateTime, formatDuration, formatTokens } from '@/lib/format';
import { TraceStatusBadge } from './trace-status-badge';
import type { AgentTrace } from '../types';

interface TraceTableProps {
  traces: AgentTrace[];
  isLoading?: boolean;
  onViewDetail: (trace: AgentTrace) => void;
}

const TABLE_COLUMNS = [
  { width: 'w-36' },
  { width: 'w-32' },
  { width: 'w-40' },
  { width: 'w-20' },
  { width: 'w-16' },
  { width: 'w-16' },
  { width: 'w-16' },
  { width: 'w-16' },
];

export function TraceTable({ traces, isLoading, onViewDetail }: TraceTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>用户</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">轮次</TableHead>
            <TableHead className="text-right">Token</TableHead>
            <TableHead className="text-right">耗时</TableHead>
            <TableHead className="text-right">详情</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton columns={TABLE_COLUMNS} rows={10} />
          ) : traces.length > 0 ? (
            traces.map((trace) => (
              <TableRow key={trace.id}>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDateTime(trace.startedAt)}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{trace.agentName}</span>
                </TableCell>
                <TableCell>
                  <div className="truncate max-w-40" title={trace.user?.email}>
                    {trace.user?.email ?? '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <TraceStatusBadge status={trace.status} />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{trace.turnCount}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatTokens(trace.totalTokens)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatDuration(trace.duration)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onViewDetail(trace)}>
                    <View className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12">
                <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无执行记录</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
