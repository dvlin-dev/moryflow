/**
 * Tool 性能分析页面
 * 显示 Tool 调用统计和失败分析
 */

import { useState } from 'react';
import { PageHeader, SimplePagination } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TriangleAlert, TrendingDown } from 'lucide-react';
import { usePagination } from '@/hooks';
import {
  FailedToolTable,
  SpanDetailDialog,
  useFailedTools,
  useToolStats,
  type AgentSpan,
  resolveAgentTraceListViewState,
} from '@/features/agent-traces';
import { calculateToolAnalyticsSummary } from './tool-analytics/metrics';
import {
  ToolAnalyticsOverviewCards,
  ToolStatsTable,
} from './tool-analytics/components';

const PAGE_SIZE = 20;

const DAYS_OPTIONS = [
  { value: '7', label: '最近 7 天' },
  { value: '14', label: '最近 14 天' },
  { value: '30', label: '最近 30 天' },
];

export default function ToolAnalyticsPage() {
  const [days, setDays] = useState('7');
  const [selectedSpan, setSelectedSpan] = useState<AgentSpan | null>(null);
  const { page, setPage, getTotalPages } = usePagination({ pageSize: PAGE_SIZE });

  const {
    data: toolStats,
    isLoading: toolsLoading,
    error: toolsError,
  } = useToolStats({
    days: Number.parseInt(days, 10),
  });
  const {
    data: failedData,
    isLoading: failedLoading,
    error: failedError,
  } = useFailedTools({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const tools = toolStats ?? [];
  const failedTools = failedData?.spans ?? [];
  const totalPages = getTotalPages(failedData?.pagination.total ?? 0);
  const summary = calculateToolAnalyticsSummary(tools);
  const failedToolsViewState = resolveAgentTraceListViewState({
    isLoading: failedLoading,
    error: failedError,
    count: failedTools.length,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool 分析"
        description="分析 Tool 性能并识别问题"
        action={
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <ToolAnalyticsOverviewCards
        isLoading={toolsLoading}
        summary={summary}
        toolCount={tools.length}
      />

      {summary.problemTools.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-800">
              <TriangleAlert className="h-4 w-4" />
              {summary.problemTools.length} 个 Tool 失败率较高
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.problemTools.map((tool) => {
                const failureRate = (tool.failedCount / tool.totalCalls) * 100;
                return (
                  <Badge key={tool.name} variant="outline" className="border-yellow-400">
                    {tool.name} ({failureRate.toFixed(1)}%)
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tool 性能统计</CardTitle>
        </CardHeader>
        <CardContent>
          <ToolStatsTable tools={tools} isLoading={toolsLoading} error={toolsError} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            最近失败记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FailedToolTable
            spans={failedTools}
            isLoading={failedLoading}
            error={failedError}
            onViewDetail={setSelectedSpan}
          />
          {failedToolsViewState === 'ready' && totalPages > 1 && (
            <div className="mt-4">
              <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <SpanDetailDialog
        span={selectedSpan}
        open={!!selectedSpan}
        onOpenChange={() => setSelectedSpan(null)}
      />
    </div>
  );
}
