/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Request Logs 用户行为分析页
 */

import { useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '@moryflow/ui';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import {
  getQueryErrorMessage,
  toIsoDateTimeOrUndefined,
  useRequestLogsUsers,
} from '@/features/logs';

export default function LogsUsersPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [submitted, setSubmitted] = useState<{ from?: string; to?: string }>({});

  const { data, isLoading, isError, error } = useRequestLogsUsers(submitted);

  return (
    <div className="space-y-6">
      <PageHeader title="User Analysis" description="基于请求日志的用户行为统计" />

      <Card>
        <CardHeader>
          <CardTitle>Time Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
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
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-destructive">
              {getQueryErrorMessage(error, 'Failed to load user activity data')}
            </div>
          ) : !data?.topUsers.length ? (
            <div className="py-12 text-center text-muted-foreground">No user activity data</div>
          ) : (
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
                {data.topUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <span className="font-mono text-xs">{user.userId}</span>
                    </TableCell>
                    <TableCell>{user.requestCount}</TableCell>
                    <TableCell>{user.errorCount}</TableCell>
                    <TableCell>
                      <Badge variant={user.errorRate >= 0.2 ? 'destructive' : 'secondary'}>
                        {(user.errorRate * 100).toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {user.avgDurationMs} ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-destructive">
              {getQueryErrorMessage(error, 'Failed to load active user trend')}
            </div>
          ) : !data?.activeUsersDaily.length ? (
            <div className="py-8 text-center text-muted-foreground">No active user trend</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date (UTC)</TableHead>
                  <TableHead className="text-right">Active Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.activeUsersDaily.map((item) => (
                  <TableRow key={item.date}>
                    <TableCell className="font-mono text-xs">{item.date}</TableCell>
                    <TableCell className="text-right">{item.activeUsers}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
