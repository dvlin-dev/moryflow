/**
 * [PROPS]: digest reports table data + callbacks
 * [EMITS]: onResolve / onPageChange / onViewTopic
 * [POS]: Digest reports ready-state table
 */

import { SquareCheck, View } from 'lucide-react';
import {
  Badge,
  Button,
  SimplePagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import { formatRelativeTime } from '@moryflow/ui/lib';
import { reportReasonLabels, reportStatusConfig } from '../constants';
import type { Report, ReportListResponse } from '../types';

export interface DigestReportsTableProps {
  data: ReportListResponse;
  onResolve: (report: Report) => void;
  onPageChange: (page: number) => void;
  onViewTopic: (slug: string) => void;
}

export function DigestReportsTable({
  data,
  onResolve,
  onPageChange,
  onViewTopic,
}: DigestReportsTableProps) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {data.page} of {data.totalPages}
        </span>
        <span>{data.total} total</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Topic</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reported</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((report) => {
            const config = reportStatusConfig[report.status];
            return (
              <TableRow key={report.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{report.topic?.title || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">/{report.topic?.slug}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{reportReasonLabels[report.reason]}</Badge>
                  {report.description ? (
                    <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                      {report.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatRelativeTime(report.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {report.topic?.slug ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewTopic(report.topic!.slug)}
                        title="View Topic"
                      >
                        <View className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {report.status === 'PENDING' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onResolve(report)}
                        title="Resolve"
                      >
                        <SquareCheck className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {data.totalPages > 1 ? (
        <div className="mt-4 flex justify-center">
          <SimplePagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </>
  );
}
