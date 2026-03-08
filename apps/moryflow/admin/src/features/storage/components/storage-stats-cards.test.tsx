import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StorageStatsCards } from './storage-stats-cards';

describe('StorageStatsCards', () => {
  it('不再展示已下线的向量化统计卡片', () => {
    render(
      <StorageStatsCards
        isLoading={false}
        data={{
          storage: {
            totalUsed: 1024,
            userCount: 3,
            vaultCount: 4,
            fileCount: 5,
            deviceCount: 6,
          },
        }}
      />
    );

    expect(screen.getByText('总存储使用')).toBeInTheDocument();
    expect(screen.getByText('活跃用户')).toBeInTheDocument();
    expect(screen.queryByText('向量化文件')).not.toBeInTheDocument();
  });
});
