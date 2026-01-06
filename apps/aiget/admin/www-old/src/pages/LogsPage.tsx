/**
 * 管理日志页面
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminLog, PaginatedResponse } from '@/types';

export default function LogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page],
    queryFn: () => api.get<PaginatedResponse<AdminLog>>(`/admin/logs?page=${page}&limit=20`),
  });

  const levelColors = {
    INFO: 'secondary',
    WARN: 'warning',
    ERROR: 'destructive',
  } as const;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Logs</h1>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.adminEmail}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    <Badge variant={levelColors[log.level]}>{log.level}</Badge>
                  </TableCell>
                  <TableCell>{log.targetUserEmail || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{log.ip || '-'}</TableCell>
                  <TableCell>{format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {data?.page} of {data?.totalPages} ({data?.total} total)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
