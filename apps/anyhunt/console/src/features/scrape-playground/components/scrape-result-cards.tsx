/**
 * [PROPS]: ScrapeResult 各卡片 props
 * [EMITS]: none
 * [POS]: Scrape 结果摘要/错误/计时卡片
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { CircleCheck, Globe, Timer, X } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@moryflow/ui';
import type { ScrapeErrorResponse, ScrapeResultResponse, ScrapeTimings } from '@/features/playground-shared';

interface ScrapeErrorCardProps {
  error: ScrapeErrorResponse['error'];
}

export function ScrapeErrorCard({ error }: ScrapeErrorCardProps) {
  return (
    <Card className="border-destructive">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <X className="h-5 w-5" />
          Scrape Failed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-destructive/10 p-4">
          <p className="font-mono text-sm">
            {error.code}: {error.message}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ScrapeSummaryCardProps {
  data: ScrapeResultResponse;
}

export function ScrapeSummaryCard({ data }: ScrapeSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleCheck className="h-5 w-5 text-green-600" />
          Scrape Successful
          {data.fromCache && (
            <Badge variant="secondary" className="ml-2">
              From Cache
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline truncate max-w-md"
          >
            {data.url}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

interface ScrapeTimingCardProps {
  timings: ScrapeTimings;
}

function TimingBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value?: number;
  total: number;
  color: string;
}) {
  if (value === undefined || value === null) {
    return null;
  }

  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}ms</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function ScrapeTimingCard({ timings }: ScrapeTimingCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4" />
          Timing Breakdown
          <span className="text-muted-foreground font-normal text-sm ml-auto">
            Total: {timings.totalMs}ms
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <TimingBar
            label="Queue Wait"
            value={timings.queueWaitMs}
            total={timings.totalMs || 1}
            color="bg-slate-400"
          />
          <TimingBar
            label="Fetch"
            value={timings.fetchMs}
            total={timings.totalMs || 1}
            color="bg-blue-500"
          />
          <TimingBar
            label="Render"
            value={timings.renderMs}
            total={timings.totalMs || 1}
            color="bg-green-500"
          />
          <TimingBar
            label="Transform"
            value={timings.transformMs}
            total={timings.totalMs || 1}
            color="bg-amber-500"
          />
          <TimingBar
            label="Screenshot"
            value={timings.screenshotMs}
            total={timings.totalMs || 1}
            color="bg-purple-500"
          />
        </div>
      </CardContent>
    </Card>
  );
}
