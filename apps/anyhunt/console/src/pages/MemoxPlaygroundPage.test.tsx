import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MemoxPlaygroundPage from './MemoxPlaygroundPage';

vi.mock('@/features/api-keys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/api-keys')>();

  return {
    ...actual,
    useApiKeys: () => ({ data: [], isLoading: false }),
  };
});

vi.mock('@/features/memox', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/memox')>();

  return {
    ...actual,
    useCreateMemory: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useSearchMemories: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

describe('MemoxPlaygroundPage', () => {
  it('renders without form field context errors', () => {
    expect(() => render(<MemoxPlaygroundPage />)).not.toThrow();
    expect(screen.getByText('Memox Playground')).toBeInTheDocument();
  });
});
