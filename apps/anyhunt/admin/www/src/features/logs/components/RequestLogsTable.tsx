/**
 * [PROPS]: data/onPageChange
 * [EMITS]: onPageChange
 * [POS]: Request Logs 明细表格
 */

import {
  Badge,
  SimplePagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import { formatRelativeTime } from '@moryflow/ui/lib';
import type { RequestLogListResponse } from '../types';

function statusVariant(statusCode: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (statusCode >= 500) {
    return 'destructive';
  }

  if (statusCode >= 400) {
    return 'secondary';
  }

  return 'default';
}

export interface RequestLogsTableProps {
  data: RequestLogListResponse;
  onPageChange: (page: number) => void;
}

export function RequestLogsTable({ data, onPageChange }: RequestLogsTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>User</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Error</TableHead>
            <TableHead className="text-right">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelativeTime(item.createdAt)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(item.statusCode)}>{item.statusCode}</Badge>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs">{item.method}</span>
              </TableCell>
              <TableCell>
                <div className="max-w-[380px]">
                  <p className="truncate font-mono text-xs" title={item.path}>
                    {item.path}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.routeGroup || '-'}</p>
                </div>
              </TableCell>
              <TableCell>
                <p className="max-w-[180px] truncate text-xs" title={item.userId || ''}>
                  {item.userId || '-'}
                </p>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs">{item.clientIp}</span>
              </TableCell>
              <TableCell>
                <div className="max-w-[220px]">
                  <p className="truncate text-xs text-foreground" title={item.errorCode || ''}>
                    {item.errorCode || '-'}
                  </p>
                  <p
                    className="truncate text-xs text-muted-foreground"
                    title={item.errorMessage || ''}
                  >
                    {item.errorMessage || '-'}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-xs">{item.durationMs} ms</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data.pagination.totalPages > 1 ? (
        <div className="mt-4 flex justify-center">
          <SimplePagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </>
  );
}
