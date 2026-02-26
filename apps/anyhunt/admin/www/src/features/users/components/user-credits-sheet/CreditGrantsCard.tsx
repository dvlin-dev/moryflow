/**
 * [PROPS]: grants 状态、记录数据与重试回调
 * [EMITS]: onRetry
 * [POS]: user credits 面板充值记录卡片
 */

import { ListEmptyState, ListLoadingRows } from '@/components/list-state';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import { formatRelativeTime } from '@moryflow/ui/lib';
import type { CreditGrantRecord } from '../../types';
import type { CreditGrantsState } from './types';

export interface CreditGrantsCardProps {
  state: CreditGrantsState;
  grants: CreditGrantRecord[] | undefined;
  onRetry: () => void;
}

function renderCreditGrantsByState({
  state,
  grants,
  onRetry,
}: CreditGrantsCardProps): React.ReactNode {
  switch (state) {
    case 'loading':
      return <ListLoadingRows rows={3} rowClassName="h-10 w-full" containerClassName="space-y-2" />;
    case 'error':
      return (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Failed to load grants.</div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      );
    case 'empty':
      return (
        <ListEmptyState
          message="No grants yet."
          className="py-4 text-left"
          messageClassName="text-sm text-muted-foreground"
        />
      );
    case 'ready':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grants?.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground text-sm">
                  {formatRelativeTime(row.createdAt)}
                </TableCell>
                <TableCell className="font-medium">+{row.amount}</TableCell>
                <TableCell className="text-sm">
                  {row.balanceBefore} → {row.balanceAfter}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.reason || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    default:
      return null;
  }
}

export function CreditGrantsCard(props: CreditGrantsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent grants</CardTitle>
      </CardHeader>
      <CardContent>{renderCreditGrantsByState(props)}</CardContent>
    </Card>
  );
}
