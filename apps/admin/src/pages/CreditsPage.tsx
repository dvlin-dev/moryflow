/**
 * 积分流水页面
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
import type { CreditTransaction, PaginatedResponse } from '@/types';

export default function CreditsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['credits', page],
    queryFn: () =>
      api.get<PaginatedResponse<CreditTransaction>>(`/admin/credits?page=${page}&limit=20`),
  });

  const typeColors = {
    SUBSCRIPTION: 'default',
    PURCHASED: 'success',
    BONUS: 'warning',
    CONSUMPTION: 'destructive',
  } as const;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Credit Transactions</h1>

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
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{tx.user?.email || tx.userId}</TableCell>
                  <TableCell>
                    <Badge variant={typeColors[tx.type]}>{tx.type}</Badge>
                  </TableCell>
                  <TableCell className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {tx.amount >= 0 ? '+' : ''}
                    {tx.amount}
                  </TableCell>
                  <TableCell>{tx.balance}</TableCell>
                  <TableCell className="max-w-xs truncate">{tx.reason || '-'}</TableCell>
                  <TableCell>{format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm')}</TableCell>
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
