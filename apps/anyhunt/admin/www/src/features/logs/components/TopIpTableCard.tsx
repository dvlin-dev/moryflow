/**
 * [PROPS]: title/items/isLoading/error
 * [EMITS]: none
 * [POS]: Logs IP 页面复用榜单卡片
 */

import {
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
import { ListEmptyState, ListErrorState, ListLoadingRows } from '@/components/list-state';
import { getQueryErrorMessage } from '../utils';
import { LogErrorRateBadge } from './LogErrorRateBadge';

export type TopIpItem = {
  clientIp: string;
  requestCount: number;
  errorCount: number;
  errorRate: number;
};

type TopIpTableState = 'loading' | 'error' | 'empty' | 'ready';

function resolveTopIpTableState(params: {
  isLoading: boolean;
  hasError: boolean;
  itemCount: number;
}): TopIpTableState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.hasError) {
    return 'error';
  }

  if (params.itemCount === 0) {
    return 'empty';
  }

  return 'ready';
}

export interface TopIpTableCardProps {
  title: string;
  items: TopIpItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  emptyMessage: string;
  errorFallbackMessage: string;
}

export function TopIpTableCard({
  title,
  items,
  isLoading,
  isError,
  error,
  emptyMessage,
  errorFallbackMessage,
}: TopIpTableCardProps) {
  const state = resolveTopIpTableState({
    isLoading,
    hasError: isError,
    itemCount: items?.length ?? 0,
  });

  const renderContentByState = () => {
    switch (state) {
      case 'loading':
        return <ListLoadingRows rows={4} containerClassName="space-y-3" />;
      case 'error':
        return (
          <ListErrorState
            message={getQueryErrorMessage(error, errorFallbackMessage)}
            className="py-8 text-center"
          />
        );
      case 'empty':
        return <ListEmptyState message={emptyMessage} className="py-8 text-center" />;
      case 'ready':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead className="text-right">Error Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item) => (
                <TableRow key={item.clientIp}>
                  <TableCell className="font-mono text-xs">{item.clientIp}</TableCell>
                  <TableCell>{item.requestCount}</TableCell>
                  <TableCell>{item.errorCount}</TableCell>
                  <TableCell className="text-right">
                    <LogErrorRateBadge errorRate={item.errorRate} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{renderContentByState()}</CardContent>
    </Card>
  );
}
