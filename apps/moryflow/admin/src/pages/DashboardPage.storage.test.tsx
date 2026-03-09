import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';

vi.mock('@/features/dashboard', () => ({
  useStats: vi.fn(() => ({
    data: {
      totalUsers: 10,
      totalCreditsUsed: 20,
      totalApiCalls: 30,
      usersByTier: {
        free: 7,
        starter: 1,
        basic: 1,
        pro: 1,
      },
    },
    isLoading: false,
  })),
  useHealth: vi.fn(() => ({
    data: { status: 'ok' },
    isLoading: false,
  })),
  StatsCard: ({ title, value }: { title: string; value: string | number }) => (
    <div>
      <span>{title}</span>
      <span>{String(value)}</span>
    </div>
  ),
  HealthCard: () => <div>Health</div>,
  TierDistribution: () => <div>Tier</div>,
}));

vi.mock('@/features/storage', () => ({
  useStorageStats: vi.fn(() => ({
    data: {
      storage: {
        totalUsed: 1024,
        userCount: 3,
        vaultCount: 4,
        fileCount: 5,
        deviceCount: 6,
      },
    },
    isLoading: false,
  })),
  formatBytes: vi.fn((value: number) => `${value} B`),
}));

describe('DashboardPage storage overview', () => {
  it('云同步概览不再渲染向量化卡片', () => {
    render(<DashboardPage />);

    expect(screen.getByText('存储使用')).toBeInTheDocument();
    expect(screen.getByText('同步文件数')).toBeInTheDocument();
    expect(screen.queryByText('向量化文件')).not.toBeInTheDocument();
  });
});
