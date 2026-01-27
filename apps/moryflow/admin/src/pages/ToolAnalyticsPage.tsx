/**
 * Tool 性能分析页面
 * 显示 Tool 调用统计和失败分析
 */

import { useState } from 'react';
import { PageHeader, SimplePagination } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TriangleAlert, TrendingDown, TrendingUp, Clock, View, Wrench } from 'lucide-react';
import { usePagination } from '@/hooks';
import { useToolStats, useFailedTools, SpanDetailDialog } from '@/features/agent-traces';
import type { AgentSpan } from '@/features/agent-traces';
import { formatDuration, formatNumber } from '@/lib/format';

const PAGE_SIZE = 20;

const DAYS_OPTIONS = [
  { value: '7', label: '最近 7 天' },
  { value: '14', label: '最近 14 天' },
  { value: '30', label: '最近 30 天' },
];

// 失败率分级
function getFailureRateLevel(rate: number): 'success' | 'warning' | 'danger' {
  if (rate <= 5) return 'success';
  if (rate <= 15) return 'warning';
  return 'danger';
}

const LEVEL_COLORS = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
};

const LEVEL_BADGES = {
  success: <Badge className="bg-green-100 text-green-800">健康</Badge>,
  warning: <Badge className="bg-yellow-100 text-yellow-800">警告</Badge>,
  danger: <Badge className="bg-red-100 text-red-800">严重</Badge>,
};

export default function ToolAnalyticsPage() {
  const [days, setDays] = useState('7');
  const [selectedSpan, setSelectedSpan] = useState<AgentSpan | null>(null);

  // 分页
  const { page, setPage, getTotalPages } = usePagination({ pageSize: PAGE_SIZE });

  // 数据查询
  const { data: toolStats, isLoading: toolsLoading } = useToolStats({
    days: parseInt(days),
  });

  const { data: failedData, isLoading: failedLoading } = useFailedTools({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const tools = toolStats ?? [];
  const failedTools = failedData?.spans ?? [];
  const totalPages = getTotalPages(failedData?.pagination.total ?? 0);

  // 汇总统计
  const totalCalls = tools.reduce((sum, t) => sum + t.totalCalls, 0);
  const totalFailed = tools.reduce((sum, t) => sum + t.failedCount, 0);
  const overallFailureRate = totalCalls > 0 ? (totalFailed / totalCalls) * 100 : 0;
  const avgDuration =
    tools.length > 0 ? tools.reduce((sum, t) => sum + (t.avgDuration ?? 0), 0) / tools.length : 0;

  // 问题 Tool（失败率 > 5%）
  const problemTools = tools.filter((t) => {
    const failureRate = (t.failedCount / t.totalCalls) * 100;
    return failureRate > 5 && t.totalCalls >= 10;
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
              {DAYS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* 概览卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tool 总数</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {toolsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{tools.length}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">调用总数</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {toolsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{formatNumber(totalCalls)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失败率</CardTitle>
            <TriangleAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {toolsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{overallFailureRate.toFixed(1)}%</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均耗时</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {toolsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{formatDuration(avgDuration)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 问题 Tool 提醒 */}
      {problemTools.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-800">
              <TriangleAlert className="h-4 w-4" />
              {problemTools.length} 个 Tool 失败率较高
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {problemTools.map((tool) => (
                <Badge key={tool.name} variant="outline" className="border-yellow-400">
                  {tool.name} ({((tool.failedCount / tool.totalCalls) * 100).toFixed(1)}%)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tool 统计表格 */}
      <Card>
        <CardHeader>
          <CardTitle>Tool 性能统计</CardTitle>
        </CardHeader>
        <CardContent>
          {toolsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="mx-auto h-12 w-12 mb-4" />
              <p>暂无 Tool 数据</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool 名称</TableHead>
                  <TableHead className="text-right">调用次数</TableHead>
                  <TableHead className="text-right">成功</TableHead>
                  <TableHead className="text-right">失败</TableHead>
                  <TableHead>失败率</TableHead>
                  <TableHead className="text-right">平均耗时</TableHead>
                  <TableHead>健康度</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => {
                  const failureRate = (tool.failedCount / tool.totalCalls) * 100;
                  const level = getFailureRateLevel(failureRate);

                  return (
                    <TableRow key={tool.name}>
                      <TableCell className="font-mono">{tool.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(tool.totalCalls)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatNumber(tool.successCount)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatNumber(tool.failedCount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={failureRate}
                            className={`w-20 h-2 ${LEVEL_COLORS[level]}`}
                          />
                          <span className="text-sm font-mono">{failureRate.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDuration(tool.avgDuration)}
                      </TableCell>
                      <TableCell>{LEVEL_BADGES[level]}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 最近失败记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            最近失败记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failedLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : failedTools.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TriangleAlert className="mx-auto h-12 w-12 mb-4" />
              <p>暂无失败记录</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>Tool 名称</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>错误类型</TableHead>
                    <TableHead className="text-right">耗时</TableHead>
                    <TableHead className="text-right">详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedTools.map((span) => (
                    <TableRow key={span.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(span.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono">{span.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {span.trace?.agentName ?? '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-red-600">
                          {span.errorType ?? 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDuration(span.duration)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedSpan(span)}>
                          <View className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4">
                  <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <SpanDetailDialog
        span={selectedSpan}
        open={!!selectedSpan}
        onOpenChange={() => setSelectedSpan(null)}
      />
    </div>
  );
}
