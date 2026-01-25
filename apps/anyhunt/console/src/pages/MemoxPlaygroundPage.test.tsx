import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MemoxPlaygroundPage from './MemoxPlaygroundPage';

vi.mock('@/features/api-keys', () => ({
  useApiKeys: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/features/memox', () => ({
  useCreateMemory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSearchMemories: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('MemoxPlaygroundPage', () => {
  it('renders without form field context errors', () => {
    expect(() => render(<MemoxPlaygroundPage />)).not.toThrow();
    expect(screen.getByText('Memox Playground')).toBeInTheDocument();
  });
});
