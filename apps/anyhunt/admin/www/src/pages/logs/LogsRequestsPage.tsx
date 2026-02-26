/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Request Logs 明细页（筛选 + 概览 + 分页）
 */

import { RotateCcw, Search } from 'lucide-react';
import { PageHeader } from '@moryflow/ui';
import {
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
} from '@moryflow/ui';
import {
  RequestLogsListContent,
  RequestLogsOverviewCards,
  getQueryErrorMessage,
  resolveRequestLogsListState,
  useRequestLogs,
  useRequestLogsFilters,
  useRequestLogsOverview,
} from '@/features/logs';
import { ListErrorState } from '@/components/list-state';

export default function LogsRequestsPage() {
  const { query, filters, setFilters, applyFilters, resetFilters, setPage } =
    useRequestLogsFilters();
  const { data, isLoading, isError, error } = useRequestLogs(query);
  const overview = useRequestLogsOverview({
    from: query.from,
    to: query.to,
  });

  const state = resolveRequestLogsListState({
    isLoading,
    hasError: isError,
    itemCount: data?.items.length ?? 0,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Request Logs" description="统一请求日志明细与错误排查（30 天保留）" />

      <RequestLogsOverviewCards overview={overview.data} />

      {overview.isError ? (
        <ListErrorState
          message={getQueryErrorMessage(overview.error, 'Failed to load overview metrics')}
          className="py-0"
          messageClassName="text-sm text-destructive"
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5">
            <Input
              type="datetime-local"
              value={filters.from}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  from: event.target.value,
                }))
              }
              placeholder="From"
            />
            <Input
              type="datetime-local"
              value={filters.to}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  to: event.target.value,
                }))
              }
              placeholder="To"
            />
            <Input
              placeholder="Route Group"
              value={filters.routeGroup}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  routeGroup: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Status Code"
              value={filters.statusCode}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  statusCode: event.target.value,
                }))
              }
            />
            <Select
              value={filters.errorOnly}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  errorOnly: value as 'all' | 'errors',
                }))
              }
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
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  pathLike: event.target.value,
                }))
              }
            />
            <Input
              placeholder="User ID"
              value={filters.userId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  userId: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Client IP"
              value={filters.clientIp}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  clientIp: event.target.value,
                }))
              }
            />
            <div className="flex gap-2 md:col-span-2">
              <Button variant="outline" onClick={applyFilters} className="w-full">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={resetFilters} className="w-full">
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
          <RequestLogsListContent state={state} data={data} error={error} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
