/**
 * [PROPS]: overview
 * [EMITS]: none
 * [POS]: Request Logs 概览指标卡片
 */

import { Card, CardContent } from '@moryflow/ui';
import type { RequestLogOverview } from '../types';

export interface RequestLogsOverviewCardsProps {
  overview: RequestLogOverview | undefined;
}

export function RequestLogsOverviewCards({ overview }: RequestLogsOverviewCardsProps) {
  const totalRequests = overview?.totalRequests ?? 0;
  const errorRequests = overview?.errorRequests ?? 0;
  const errorRate = overview ? `${(overview.errorRate * 100).toFixed(2)}%` : '0.00%';
  const p95Duration = `${overview?.p95DurationMs ?? 0} ms`;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total Requests</p>
          <p className="text-3xl font-bold">{totalRequests}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Errors</p>
          <p className="text-3xl font-bold">{errorRequests}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Error Rate</p>
          <p className="text-3xl font-bold">{errorRate}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">P95 Duration</p>
          <p className="text-3xl font-bold">{p95Duration}</p>
        </CardContent>
      </Card>
    </div>
  );
}
