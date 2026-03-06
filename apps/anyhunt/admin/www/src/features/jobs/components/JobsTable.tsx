/**
 * [PROPS]: 任务列表、分页与行级事件
 * [EMITS]: onRowClick/onViewDetail/onPageChange
 * [POS]: Jobs 列表表格展示组件
 */

import { ArrowUpRight } from 'lucide-react';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import { formatRelativeTime } from '@moryflow/ui/lib';
import { SimplePagination } from '@moryflow/ui';
import { formatMs, getStatusBadge, truncateUrl } from '@/lib/job-utils';
import type { JobListItem, Pagination } from '../types';

export interface JobsTableProps {
  items: JobListItem[];
  pagination: Pagination;
  onRowClick: (job: JobListItem) => void;
  onViewDetail: (job: JobListItem) => void;
  onPageChange: (page: number) => void;
}

export function JobsTable({
  items,
  pagination,
  onRowClick,
  onViewDetail,
  onPageChange,
}: JobsTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[400px]">URL</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>耗时</TableHead>
            <TableHead>用户</TableHead>
            <TableHead>时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((job) => (
            <TableRow
              key={job.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(job)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm" title={job.url}>
                    {truncateUrl(job.url)}
                  </span>
                  {job.fromCache ? (
                    <Badge variant="outline" className="text-xs">
                      缓存
                    </Badge>
                  ) : null}
                </div>
                {job.error && (
                  <p className="mt-1 line-clamp-1 text-xs text-destructive">
                    {job.errorCode}: {job.error}
                  </p>
                )}
              </TableCell>
              <TableCell>{getStatusBadge(job.status)}</TableCell>
              <TableCell className="font-mono text-sm">
                {formatMs(job.totalMs)}
                {job.queueWaitMs && job.queueWaitMs > 1000 ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (排队 {formatMs(job.queueWaitMs)})
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{job.userEmail}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelativeTime(job.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewDetail(job);
                  }}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex justify-center">
          <SimplePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </>
  );
}
