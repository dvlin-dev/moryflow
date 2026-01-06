/**
 * 订阅列表页面
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
import type { Subscription, PaginatedResponse } from '@/types';

export default function SubscriptionsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', page],
    queryFn: () =>
      api.get<PaginatedResponse<Subscription>>(`/admin/subscriptions?page=${page}&limit=20`),
  });

  const statusColors = {
    ACTIVE: 'success',
    CANCELED: 'secondary',
    EXPIRED: 'destructive',
    PAST_DUE: 'warning',
  } as const;

  const tierColors = {
    FREE: 'secondary',
    STARTER: 'outline',
    PRO: 'default',
    MAX: 'success',
  } as const;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subscriptions</h1>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Period Start</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.user?.email || sub.userId}</TableCell>
                  <TableCell>
                    <Badge variant={tierColors[sub.tier]}>{sub.tier}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[sub.status]}>{sub.status}</Badge>
                  </TableCell>
                  <TableCell>{sub.provider}</TableCell>
                  <TableCell>{format(new Date(sub.currentPeriodStart), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{format(new Date(sub.currentPeriodEnd), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{format(new Date(sub.createdAt), 'yyyy-MM-dd')}</TableCell>
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
