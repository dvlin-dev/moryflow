/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Request Logs IP 监控页
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
import { getQueryErrorMessage, toIsoDateTimeOrUndefined, useRequestLogsIp } from '@/features/logs';

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

  return (
    <div className="space-y-6">
      <PageHeader title="IP Monitor" description="来源 IP 请求量与错误率监控" />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            <Input
              placeholder="Client IP (for trend)"
              value={clientIp}
              onChange={(e) => setClientIp(e.target.value)}
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
        <Card>
          <CardHeader>
            <CardTitle>Top IP by Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="py-8 text-center text-destructive">
                {getQueryErrorMessage(error, 'Failed to load IP request ranking')}
              </div>
            ) : !data?.topIpByRequests.length ? (
              <div className="py-8 text-center text-muted-foreground">No IP data</div>
            ) : (
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
                  {data.topIpByRequests.map((item) => (
                    <TableRow key={item.clientIp}>
                      <TableCell className="font-mono text-xs">{item.clientIp}</TableCell>
                      <TableCell>{item.requestCount}</TableCell>
                      <TableCell>{item.errorCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.errorRate >= 0.2 ? 'destructive' : 'secondary'}>
                          {(item.errorRate * 100).toFixed(2)}%
                        </Badge>
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
            <CardTitle>Top IP by Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="py-8 text-center text-destructive">
                {getQueryErrorMessage(error, 'Failed to load IP error ranking')}
              </div>
            ) : !data?.topIpByErrorRate.length ? (
              <div className="py-8 text-center text-muted-foreground">No high-error IP found</div>
            ) : (
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
                  {data.topIpByErrorRate.map((item) => (
                    <TableRow key={item.clientIp}>
                      <TableCell className="font-mono text-xs">{item.clientIp}</TableCell>
                      <TableCell>{item.requestCount}</TableCell>
                      <TableCell>{item.errorCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.errorRate >= 0.2 ? 'destructive' : 'secondary'}>
                          {(item.errorRate * 100).toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IP Trend {submitted.clientIp ? `(${submitted.clientIp})` : ''}</CardTitle>
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
              {getQueryErrorMessage(error, 'Failed to load IP trend')}
            </div>
          ) : !data?.ipTrend.length ? (
            <div className="py-8 text-center text-muted-foreground">
              Input a client IP to view trend data
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date (UTC)</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.ipTrend.map((item) => (
                  <TableRow key={item.date}>
                    <TableCell className="font-mono text-xs">{item.date}</TableCell>
                    <TableCell>{item.requestCount}</TableCell>
                    <TableCell className="text-right">{item.errorCount}</TableCell>
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
