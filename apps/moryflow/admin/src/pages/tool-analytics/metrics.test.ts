import { describe, expect, it } from 'vitest';
import { calculateToolAnalyticsSummary } from './metrics';

describe('calculateToolAnalyticsSummary', () => {
  it('空数据时返回零值', () => {
    expect(calculateToolAnalyticsSummary([])).toEqual({
      totalCalls: 0,
      totalFailed: 0,
      overallFailureRate: 0,
      avgDuration: 0,
      problemTools: [],
    });
  });

  it('正确聚合总调用/失败/失败率/平均耗时', () => {
    const summary = calculateToolAnalyticsSummary([
      { name: 'a', totalCalls: 100, successCount: 90, failedCount: 10, successRate: 90, avgDuration: 1000 },
      { name: 'b', totalCalls: 50, successCount: 49, failedCount: 1, successRate: 98, avgDuration: 500 },
    ]);

    expect(summary.totalCalls).toBe(150);
    expect(summary.totalFailed).toBe(11);
    expect(summary.overallFailureRate).toBeCloseTo(11 / 150 * 100, 5);
    expect(summary.avgDuration).toBe(750);
  });

  it('只识别失败率>5% 且调用>=10 的问题 tool', () => {
    const summary = calculateToolAnalyticsSummary([
      { name: 'high', totalCalls: 20, successCount: 16, failedCount: 4, successRate: 80, avgDuration: 1000 },
      { name: 'low-count', totalCalls: 5, successCount: 4, failedCount: 1, successRate: 80, avgDuration: 1000 },
      { name: 'healthy', totalCalls: 100, successCount: 98, failedCount: 2, successRate: 98, avgDuration: 1000 },
    ]);

    expect(summary.problemTools.map((tool) => tool.name)).toEqual(['high']);
  });
});
