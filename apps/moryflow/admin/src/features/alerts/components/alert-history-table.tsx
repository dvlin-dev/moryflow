/**
 * 告警历史表格
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleAlert } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { AlertLevelBadge, AlertTypeBadge } from './alert-badges';
import type { AlertHistory } from '../types';

interface AlertHistoryTableProps {
  history: AlertHistory[];
  isLoading?: boolean;
  error?: unknown;
}

export function AlertHistoryTable({ history, isLoading, error }: AlertHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>规则</TableHead>
              <TableHead>级别</TableHead>
              <TableHead>消息</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-64" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-12 text-center text-destructive">
        告警历史加载失败，请稍后重试
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <CircleAlert className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">暂无告警记录</p>
        <p className="text-sm text-muted-foreground mt-1">当告警触发时会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">时间</TableHead>
            <TableHead className="w-[200px]">规则</TableHead>
            <TableHead className="w-[100px]">级别</TableHead>
            <TableHead>消息</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground text-sm">
                {formatDateTime(item.triggeredAt)}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium text-sm">{item.rule?.name ?? '-'}</p>
                  {item.rule?.type && <AlertTypeBadge type={item.rule.type} />}
                </div>
              </TableCell>
              <TableCell>
                <AlertLevelBadge level={item.level} />
              </TableCell>
              <TableCell>
                <p className="text-sm">{item.context.message}</p>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  {item.context.toolName && (
                    <span>
                      Tool: <code>{item.context.toolName}</code>
                    </span>
                  )}
                  {item.context.agentName && (
                    <span>
                      Agent: <code>{item.context.agentName}</code>
                    </span>
                  )}
                  <span>
                    当前值: {item.context.value} / 阈值: {item.context.threshold}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
