/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Request Logs IP 监控页
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
  TopIpTableCard,
  getQueryErrorMessage,
  toIsoDateTimeOrUndefined,
  useRequestLogsIp,
} from '@/features/logs';

type IpTrendState = 'loading' | 'error' | 'empty' | 'ready';

function resolveIpTrendState(params: {
  isLoading: boolean;
  isError: boolean;
  itemCount: number;
}): IpTrendState {
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

export default function LogsIpPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [clientIp, setClientIp] = useState('');
  const [submitted, setSubmitted] = useState<{
    from?: string;
    to?: string;
    clientIp?: string;
  }>({});

  const { data, isLoading, isError, error } = useRequestLogsIp(submitted);
  const trendState = resolveIpTrendState({
    isLoading,
    isError,
    itemCount: data?.ipTrend.length ?? 0,
  });

  const renderTrendContent = () => {
    switch (trendState) {
      case 'loading':
        return <ListLoadingRows rows={4} rowClassName="h-10 w-full" />;
      case 'error':
        return (
          <ListErrorState
            message={getQueryErrorMessage(error, 'Failed to load IP trend')}
            className="py-8 text-center"
          />
        );
      case 'empty':
        return (
          <ListEmptyState
            message="Input a client IP to view trend data"
            className="py-8 text-center"
          />
        );
      case 'ready':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date (UTC)</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead className="text-right">Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.ipTrend ?? []).map((item) => (
                <TableRow key={item.date}>
                  <TableCell className="font-mono text-xs">{item.date}</TableCell>
                  <TableCell>{item.requestCount}</TableCell>
                  <TableCell className="text-right">{item.errorCount}</TableCell>
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
      <PageHeader title="IP Monitor" description="来源 IP 请求量与错误率监控" />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
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
            <Input
              placeholder="Client IP (for trend)"
              value={clientIp}
              onChange={(event) => setClientIp(event.target.value)}
            />
            <Button
              variant="outline"
              onClick={() =>
                setSubmitted({
                  from: toIsoDateTimeOrUndefined(from),
                  to: toIsoDateTimeOrUndefined(to),
                  clientIp: clientIp || undefined,
                })
              }
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopIpTableCard
          title="Top IP by Requests"
          items={data?.topIpByRequests}
          isLoading={isLoading}
          isError={isError}
          error={error}
          emptyMessage="No IP data"
          errorFallbackMessage="Failed to load IP request ranking"
        />
        <TopIpTableCard
          title="Top IP by Error Rate"
          items={data?.topIpByErrorRate}
          isLoading={isLoading}
          isError={isError}
          error={error}
          emptyMessage="No high-error IP found"
          errorFallbackMessage="Failed to load IP error ranking"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IP Trend {submitted.clientIp ? `(${submitted.clientIp})` : ''}</CardTitle>
        </CardHeader>
        <CardContent>{renderTrendContent()}</CardContent>
      </Card>
    </div>
  );
}
