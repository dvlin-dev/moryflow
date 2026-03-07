import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { UserStorageCard } from './user-storage-card';

vi.mock('../hooks', () => ({
  useUserStorageDetail: vi.fn(() => ({
    data: {
      usage: {
        storageUsed: 1024,
        storageLimit: 2048,
      },
      vaults: [
        {
          id: 'vault-1',
          name: 'Personal',
          fileCount: 3,
          totalSize: 1024,
          deviceCount: 1,
          createdAt: '2026-03-07T00:00:00.000Z',
        },
      ],
    },
    isLoading: false,
  })),
}));

describe('UserStorageCard', () => {
  it('只展示当前存储事实，不再展示向量化用量', () => {
    render(
      <MemoryRouter>
        <UserStorageCard userId="user-1" />
      </MemoryRouter>
    );

    expect(screen.getByText('存储用量')).toBeInTheDocument();
    expect(screen.getByText('Vault 列表 (1)')).toBeInTheDocument();
    expect(screen.queryByText('向量化用量')).not.toBeInTheDocument();
  });
});
