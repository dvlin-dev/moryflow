import type { ToolStat } from '@/features/agent-traces';

export interface ToolAnalyticsSummary {
  totalCalls: number;
  totalFailed: number;
  overallFailureRate: number;
  avgDuration: number;
  problemTools: ToolStat[];
}

function calculateFailureRate(total: number, failed: number): number {
  if (total <= 0) {
    return 0;
  }
  return (failed / total) * 100;
}

export function calculateToolAnalyticsSummary(tools: ToolStat[]): ToolAnalyticsSummary {
  const totalCalls = tools.reduce((sum, tool) => sum + tool.totalCalls, 0);
  const totalFailed = tools.reduce((sum, tool) => sum + tool.failedCount, 0);
  const overallFailureRate = calculateFailureRate(totalCalls, totalFailed);
  const avgDuration =
    tools.length > 0
      ? tools.reduce((sum, tool) => sum + (tool.avgDuration ?? 0), 0) / tools.length
      : 0;
  const problemTools = tools.filter((tool) => {
    const failureRate = calculateFailureRate(tool.totalCalls, tool.failedCount);
    return failureRate > 5 && tool.totalCalls >= 10;
  });

  return {
    totalCalls,
    totalFailed,
    overallFailureRate,
    avgDuration,
    problemTools,
  };
}
