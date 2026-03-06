import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateApiKey } from './hooks';

const createApiKeyMock = vi.fn();
const saveStoredApiKeyPlaintextMock = vi.fn();
const toastErrorMock = vi.fn();
const toastInfoMock = vi.fn();

vi.mock('./api', () => ({
  createApiKey: (...args: unknown[]) => createApiKeyMock(...args),
  getApiKeys: vi.fn(),
  updateApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
}));

vi.mock('./local-key-store', () => ({
  pruneStoredApiKeyPlaintexts: vi.fn(),
  removeStoredApiKeyPlaintext: vi.fn(),
  resolveStoredApiKeyPlaintext: vi.fn(),
  saveStoredApiKeyPlaintext: (...args: unknown[]) => saveStoredApiKeyPlaintextMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
    success: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCreateApiKey', () => {
  beforeEach(() => {
    createApiKeyMock.mockReset();
    saveStoredApiKeyPlaintextMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
  });

  it('在本地明文存储失败时仍会执行调用方 onSuccess', async () => {
    createApiKeyMock.mockResolvedValue({
      id: 'key_123',
      plainKey: 'ah_secret_123',
      keyPreview: 'ah_****_123',
      isActive: true,
      name: 'Test Key',
      createdAt: '<PRIVATE_DATE>',
      updatedAt: '<PRIVATE_DATE>',
    });
    saveStoredApiKeyPlaintextMock.mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCreateApiKey(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(
        { name: 'Test Key' },
        {
          onSuccess,
        }
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    const [resultArg, variablesArg, contextArg] = onSuccess.mock.calls[0];
    expect(resultArg).toMatchObject({
      id: 'key_123',
      plainKey: 'ah_secret_123',
    });
    expect(variablesArg).toEqual({ name: 'Test Key' });
    expect(contextArg).toBeUndefined();

    expect(saveStoredApiKeyPlaintextMock).toHaveBeenCalledWith('key_123', 'ah_secret_123');
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(toastInfoMock).toHaveBeenCalledWith(
      'Local browser storage is unavailable. Copy this key now; this browser may require a rotate later.'
    );
  });
});
