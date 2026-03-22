import { render, screen } from '@testing-library/react';
import { z } from 'zod';
import { describe, it, expect, vi } from 'vitest';
import MemoxPlaygroundPage from './MemoxPlaygroundPage';

vi.mock('@/features/api-keys', () => {
  const apiKeySelection = {
    effectiveKeyId: '',
    apiKeyValue: '',
    apiKeyDisplay: 'No API key selected',
  };

  return {
    useApiKeys: () => ({ data: [], isLoading: false }),
    resolveActiveApiKeySelection: () => apiKeySelection,
  };
});

vi.mock('@/features/memox', () => {
  const createMemorySchema = z.object({});
  const searchMemorySchema = z.object({});

  return {
    createMemorySchema,
    searchMemorySchema,
    createMemoryDefaults: {},
    searchMemoryDefaults: {},
    useCreateMemory: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useSearchMemories: () => ({ mutateAsync: vi.fn(), isPending: false }),
    buildCreateMemoryRequest: () => ({ request: {} }),
    buildSearchMemoryRequest: () => ({ request: {} }),
    buildCreateCodeExampleBody: () => '',
    buildSearchCodeExampleBody: () => '',
    mapCreateMemoryResponseToMemory: () => null,
    MemoxPlaygroundRequestCard: () => <div data-testid="memox-request-card" />,
    MemoxPlaygroundResultPanel: () => <div data-testid="memox-result-panel" />,
  };
});

describe('MemoxPlaygroundPage', () => {
  it('renders without form field context errors', () => {
    expect(() => render(<MemoxPlaygroundPage />)).not.toThrow();
    expect(screen.getByText('Memox Playground')).toBeInTheDocument();
    expect(screen.getByTestId('memox-request-card')).toBeInTheDocument();
    expect(screen.getByTestId('memox-result-panel')).toBeInTheDocument();
  }, 15_000);
});
