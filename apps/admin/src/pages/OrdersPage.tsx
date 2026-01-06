/**
 * 订单列表页面
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
import type { Order, PaginatedResponse } from '@/types';

export default function OrdersPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => api.get<PaginatedResponse<Order>>(`/admin/orders?page=${page}&limit=20`),
  });

  const statusColors = {
    PENDING: 'secondary',
    PAID: 'success',
    FAILED: 'destructive',
    REFUNDED: 'warning',
  } as const;

  const typeLabels = {
    SUBSCRIPTION: 'Subscription',
    CREDIT_BOOST: 'Credit Boost',
  } as const;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Orders</h1>

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
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.user?.email || order.userId}</TableCell>
                  <TableCell>{typeLabels[order.type]}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[order.status]}>{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    ${(order.amount / 100).toFixed(2)} {order.currency}
                  </TableCell>
                  <TableCell>{order.provider}</TableCell>
                  <TableCell>{format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm')}</TableCell>
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
