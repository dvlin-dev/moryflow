/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Request Logs 明细页（筛选 + 概览 + 分页）
 */

import { useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { PageHeader, SimplePagination } from '@moryflow/ui';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import { formatRelativeTime } from '@moryflow/ui/lib';
import {
  useRequestLogs,
  useRequestLogsOverview,
  type RequestLogListQuery,
  getQueryErrorMessage,
  toIsoDateTimeOrUndefined,
  toStatusCodeOrUndefined,
} from '@/features/logs';

function statusVariant(statusCode: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (statusCode >= 500) return 'destructive';
  if (statusCode >= 400) return 'secondary';
  return 'default';
}

export default function LogsRequestsPage() {
  const [query, setQuery] = useState<RequestLogListQuery>({ page: 1, limit: 20 });
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    routeGroup: '',
    statusCode: '',
    pathLike: '',
    userId: '',
    clientIp: '',
    errorOnly: 'all',
  });

  const listQuery: RequestLogListQuery = query;

  const { data, isLoading, isError, error } = useRequestLogs(listQuery);
  const overviewQuery = {
    from: query.from,
    to: query.to,
  };
  const overview = useRequestLogsOverview(overviewQuery);

  const handleApplyFilters = () => {
    setQuery({
      page: 1,
      limit: query.limit,
      from: toIsoDateTimeOrUndefined(filters.from),
      to: toIsoDateTimeOrUndefined(filters.to),
      routeGroup: filters.routeGroup || undefined,
      statusCode: toStatusCodeOrUndefined(filters.statusCode),
      pathLike: filters.pathLike || undefined,
      userId: filters.userId || undefined,
      clientIp: filters.clientIp || undefined,
      errorOnly: filters.errorOnly === 'errors' ? true : undefined,
    });
  };

  const handleResetFilters = () => {
    setFilters({
      from: '',
      to: '',
      routeGroup: '',
      statusCode: '',
      pathLike: '',
      userId: '',
      clientIp: '',
      errorOnly: 'all',
    });
    setQuery({ page: 1, limit: query.limit });
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Request Logs" description="统一请求日志明细与错误排查（30 天保留）" />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className="text-3xl font-bold">{overview.data?.totalRequests ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Errors</p>
            <p className="text-3xl font-bold">{overview.data?.errorRequests ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Error Rate</p>
            <p className="text-3xl font-bold">
              {overview.data ? `${(overview.data.errorRate * 100).toFixed(2)}%` : '0.00%'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">P95 Duration</p>
            <p className="text-3xl font-bold">{overview.data?.p95DurationMs ?? 0} ms</p>
          </CardContent>
        </Card>
      </div>

      {overview.isError && (
        <div className="text-sm text-destructive">
          {getQueryErrorMessage(overview.error, 'Failed to load overview metrics')}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5">
            <Input
              type="datetime-local"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
              placeholder="From"
            />
            <Input
              type="datetime-local"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
              placeholder="To"
            />
            <Input
              placeholder="Route Group"
              value={filters.routeGroup}
              onChange={(e) => setFilters((prev) => ({ ...prev, routeGroup: e.target.value }))}
            />
            <Input
              placeholder="Status Code"
              value={filters.statusCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, statusCode: e.target.value }))}
            />
            <Select
              value={filters.errorOnly}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, errorOnly: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="errors">Errors Only</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Path Contains"
              value={filters.pathLike}
              onChange={(e) => setFilters((prev) => ({ ...prev, pathLike: e.target.value }))}
            />
            <Input
              placeholder="User ID"
              value={filters.userId}
              onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
            />
            <Input
              placeholder="Client IP"
              value={filters.clientIp}
              onChange={(e) => setFilters((prev) => ({ ...prev, clientIp: e.target.value }))}
            />
            <div className="flex gap-2 md:col-span-2">
              <Button variant="outline" onClick={handleApplyFilters} className="w-full">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleResetFilters} className="w-full">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-destructive">
              {getQueryErrorMessage(error, 'Failed to load request logs')}
            </div>
          ) : !data?.items.length ? (
            <div className="py-12 text-center text-muted-foreground">No request logs found</div>
          ) : (
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
                          <p
                            className="truncate text-xs text-foreground"
                            title={item.errorCode || ''}
                          >
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
                      <TableCell className="text-right font-mono text-xs">
                        {item.durationMs} ms
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.pagination.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <SimplePagination
                    page={data.pagination.page}
                    totalPages={data.pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
