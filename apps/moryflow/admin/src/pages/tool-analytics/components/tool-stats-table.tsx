import { TableSkeleton } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CircleX, Wrench } from 'lucide-react';
import { formatDuration, formatNumber } from '@/lib/format';
import type { ToolStat } from '@/features/agent-traces';
import { resolveAgentTraceListViewState } from '@/features/agent-traces';

interface ToolStatsTableProps {
  tools: ToolStat[];
  isLoading: boolean;
  error: unknown;
}

type FailureRateLevel = 'success' | 'warning' | 'danger';

const TABLE_COLUMNS = [
  { width: 'w-48' },
  { width: 'w-24' },
  { width: 'w-24' },
  { width: 'w-24' },
  { width: 'w-28' },
  { width: 'w-24' },
  { width: 'w-24' },
];

function getFailureRateLevel(rate: number): FailureRateLevel {
  if (rate <= 5) {
    return 'success';
  }
  if (rate <= 15) {
    return 'warning';
  }
  return 'danger';
}

function getFailureRateBarClass(level: FailureRateLevel): string {
  switch (level) {
    case 'success':
      return '[&>div]:bg-green-500';
    case 'warning':
      return '[&>div]:bg-yellow-500';
    case 'danger':
      return '[&>div]:bg-red-500';
    default:
      return '';
  }
}

function getFailureRateBadge(level: FailureRateLevel) {
  switch (level) {
    case 'success':
      return <Badge className="bg-green-100 text-green-800">健康</Badge>;
    case 'warning':
      return <Badge className="bg-yellow-100 text-yellow-800">警告</Badge>;
    case 'danger':
      return <Badge className="bg-red-100 text-red-800">严重</Badge>;
    default:
      return null;
  }
}

function ToolStatsRow({ tool }: { tool: ToolStat }) {
  const failureRate = tool.totalCalls > 0 ? (tool.failedCount / tool.totalCalls) * 100 : 0;
  const level = getFailureRateLevel(failureRate);

  return (
    <TableRow key={tool.name}>
      <TableCell className="font-mono">{tool.name}</TableCell>
      <TableCell className="text-right">{formatNumber(tool.totalCalls)}</TableCell>
      <TableCell className="text-right text-green-600">{formatNumber(tool.successCount)}</TableCell>
      <TableCell className="text-right text-red-600">{formatNumber(tool.failedCount)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={failureRate} className={`h-2 w-20 ${getFailureRateBarClass(level)}`} />
          <span className="text-sm font-mono">{failureRate.toFixed(1)}%</span>
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">{formatDuration(tool.avgDuration)}</TableCell>
      <TableCell>{getFailureRateBadge(level)}</TableCell>
    </TableRow>
  );
}

export function ToolStatsTable({ tools, isLoading, error }: ToolStatsTableProps) {
  const viewState = resolveAgentTraceListViewState({
    isLoading,
    error,
    count: tools.length,
  });

  const renderRowsByState = () => {
    switch (viewState) {
      case 'loading':
        return <TableSkeleton columns={TABLE_COLUMNS} rows={6} />;
      case 'error':
        return (
          <TableRow>
            <TableCell colSpan={7} className="py-12 text-center text-destructive">
              Tool 统计加载失败，请稍后重试
            </TableCell>
          </TableRow>
        );
      case 'empty':
        return (
          <TableRow>
            <TableCell colSpan={7} className="py-12 text-center">
              <Wrench className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">暂无 Tool 数据</p>
            </TableCell>
          </TableRow>
        );
      case 'ready':
        return tools.map((tool) => <ToolStatsRow key={tool.name} tool={tool} />);
      default:
        return (
          <TableRow>
            <TableCell colSpan={7} className="py-12 text-center">
              <CircleX className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">暂无 Tool 数据</p>
            </TableCell>
          </TableRow>
        );
    }
  };

  return (
    <div className="rounded-lg border">
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
        <TableBody>{renderRowsByState()}</TableBody>
      </Table>
    </div>
  );
}
