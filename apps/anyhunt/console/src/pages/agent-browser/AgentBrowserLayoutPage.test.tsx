import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import AgentBrowserLayoutPage from './AgentBrowserLayoutPage';

type MockApiKey = {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
};

type MockApiKeySelectorProps = {
  apiKeys: MockApiKey[];
  selectedKeyId: string;
  onKeyChange: (keyId: string) => void;
  disabled?: boolean;
};

let mockApiKeys: MockApiKey[] = [];
let latestOutletContext: unknown = null;
let latestSelectorProps: MockApiKeySelectorProps | null = null;

const useMatchMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useMatch: (...args: unknown[]) => useMatchMock(...args),
    Outlet: ({ context }: { context: unknown }) => {
      latestOutletContext = context;
      return <div data-testid="agent-browser-outlet" />;
    },
  };
});

vi.mock('@/features/api-keys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/api-keys')>();

  return {
    ...actual,
    useApiKeys: () => ({
      data: mockApiKeys,
      isLoading: false,
    }),
  };
});

vi.mock('@/features/playground-shared', () => ({
  ApiKeySelector: (props: MockApiKeySelectorProps) => {
    latestSelectorProps = props;
    return <div data-testid="api-key-selector-proxy" />;
  },
}));

vi.mock('@/features/agent-browser-playground', () => ({
  PlaygroundErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('AgentBrowserLayoutPage', () => {
  beforeEach(() => {
    mockApiKeys = [];
    latestOutletContext = null;
    latestSelectorProps = null;
    useMatchMock.mockReset();
    useMatchMock.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it('uses active API key in outlet context when active key exists', () => {
    mockApiKeys = [
      { id: 'inactive-key', name: 'Inactive', key: 'ah_inactive_123', isActive: false },
      { id: 'active-key', name: 'Active', key: 'ah_active_456', isActive: true },
    ];

    render(<AgentBrowserLayoutPage />);

    expect(screen.getByTestId('agent-browser-outlet')).toBeInTheDocument();
    expect(latestSelectorProps?.selectedKeyId).toBe('active-key');
    expect(latestSelectorProps?.disabled).toBe(false);

    const outletContext = latestOutletContext as { apiKey: string; hasApiKeys: boolean };
    expect(outletContext.apiKey).toBe('ah_active_456');
    expect(outletContext.hasApiKeys).toBe(true);
  });

  it('does not expose inactive key as available when no active keys exist', () => {
    mockApiKeys = [{ id: 'inactive-key', name: 'Inactive', key: 'ah_inactive_123', isActive: false }];

    render(<AgentBrowserLayoutPage />);

    expect(screen.getByTestId('agent-browser-outlet')).toBeInTheDocument();
    expect(latestSelectorProps?.selectedKeyId).toBe('');
    expect(latestSelectorProps?.disabled).toBe(true);

    const outletContext = latestOutletContext as { apiKey: string; hasApiKeys: boolean };
    expect(outletContext.apiKey).toBe('');
    expect(outletContext.hasApiKeys).toBe(false);
  });
});
