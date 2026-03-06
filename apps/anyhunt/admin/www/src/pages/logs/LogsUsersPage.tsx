/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Request Logs 用户行为分析页
 */

import { useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '@moryflow/ui';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import { ListEmptyState, ListErrorState, ListLoadingRows } from '@/components/list-state';
import {
  LogErrorRateBadge,
  getQueryErrorMessage,
  toIsoDateTimeOrUndefined,
  useRequestLogsUsers,
} from '@/features/logs';

type LogsUsersSectionState = 'loading' | 'error' | 'empty' | 'ready';

function resolveLogsUsersSectionState(params: {
  isLoading: boolean;
  isError: boolean;
  itemCount: number;
}): LogsUsersSectionState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError) {
    return 'error';
  }

  if (params.itemCount === 0) {
    return 'empty';
  }

  return 'ready';
}

export default function LogsUsersPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [submitted, setSubmitted] = useState<{ from?: string; to?: string }>({});
  const { data, isLoading, isError, error } = useRequestLogsUsers(submitted);

  const usersState = resolveLogsUsersSectionState({
    isLoading,
    isError,
    itemCount: data?.topUsers.length ?? 0,
  });
  const trendState = resolveLogsUsersSectionState({
    isLoading,
    isError,
    itemCount: data?.activeUsersDaily.length ?? 0,
  });

  const renderTopUsersContent = () => {
    switch (usersState) {
      case 'loading':
        return <ListLoadingRows rows={4} />;
      case 'error':
        return (
          <ListErrorState
            message={getQueryErrorMessage(error, 'Failed to load user activity data')}
          />
        );
      case 'empty':
        return <ListEmptyState message="No user activity data" />;
      case 'ready':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead>Error Rate</TableHead>
                <TableHead className="text-right">Avg Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.topUsers ?? []).map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <span className="font-mono text-xs">{user.userId}</span>
                  </TableCell>
                  <TableCell>{user.requestCount}</TableCell>
                  <TableCell>{user.errorCount}</TableCell>
                  <TableCell>
                    <LogErrorRateBadge errorRate={user.errorRate} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {user.avgDurationMs} ms
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

  const renderTrendContent = () => {
    switch (trendState) {
      case 'loading':
        return <ListLoadingRows rows={4} rowClassName="h-10 w-full" />;
      case 'error':
        return (
          <ListErrorState
            message={getQueryErrorMessage(error, 'Failed to load active user trend')}
            className="py-8 text-center"
          />
        );
      case 'empty':
        return <ListEmptyState message="No active user trend" className="py-8 text-center" />;
      case 'ready':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date (UTC)</TableHead>
                <TableHead className="text-right">Active Users</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.activeUsersDaily ?? []).map((item) => (
                <TableRow key={item.date}>
                  <TableCell className="font-mono text-xs">{item.date}</TableCell>
                  <TableCell className="text-right">{item.activeUsers}</TableCell>
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
    <div className="space-y-6">
      <PageHeader title="User Analysis" description="基于请求日志的用户行为统计" />

      <Card>
        <CardHeader>
          <CardTitle>Time Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              type="datetime-local"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Input
              type="datetime-local"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
            <Button
              variant="outline"
              onClick={() =>
                setSubmitted({
                  from: toIsoDateTimeOrUndefined(from),
                  to: toIsoDateTimeOrUndefined(to),
                })
              }
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Users</CardTitle>
        </CardHeader>
        <CardContent>{renderTopUsersContent()}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Active Users</CardTitle>
        </CardHeader>
        <CardContent>{renderTrendContent()}</CardContent>
      </Card>
    </div>
  );
}
