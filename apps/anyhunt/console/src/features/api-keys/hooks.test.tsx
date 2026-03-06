import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApiKeys, useCreateApiKey, useDeleteApiKey, useUpdateApiKey } from './hooks';

const createApiKeyMock = vi.fn();
const deleteApiKeyMock = vi.fn();
const getApiKeysMock = vi.fn();
const removeStoredApiKeyPlaintextMock = vi.fn();
const saveStoredApiKeyPlaintextMock = vi.fn();
const pruneStoredApiKeyPlaintextsMock = vi.fn();
const resolveStoredApiKeyPlaintextMock = vi.fn();
const toastErrorMock = vi.fn();
const toastInfoMock = vi.fn();
const toastSuccessMock = vi.fn();
const updateApiKeyMock = vi.fn();

vi.mock('./api', () => ({
  createApiKey: (...args: unknown[]) => createApiKeyMock(...args),
  deleteApiKey: (...args: unknown[]) => deleteApiKeyMock(...args),
  getApiKeys: (...args: unknown[]) => getApiKeysMock(...args),
  updateApiKey: (...args: unknown[]) => updateApiKeyMock(...args),
}));

vi.mock('./local-key-store', () => ({
  pruneStoredApiKeyPlaintexts: (...args: unknown[]) => pruneStoredApiKeyPlaintextsMock(...args),
  removeStoredApiKeyPlaintext: (...args: unknown[]) => removeStoredApiKeyPlaintextMock(...args),
  resolveStoredApiKeyPlaintext: (...args: unknown[]) => resolveStoredApiKeyPlaintextMock(...args),
  saveStoredApiKeyPlaintext: (...args: unknown[]) => saveStoredApiKeyPlaintextMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
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

describe('api key hooks', () => {
  beforeEach(() => {
    createApiKeyMock.mockReset();
    deleteApiKeyMock.mockReset();
    getApiKeysMock.mockReset();
    removeStoredApiKeyPlaintextMock.mockReset();
    saveStoredApiKeyPlaintextMock.mockReset();
    pruneStoredApiKeyPlaintextsMock.mockReset();
    resolveStoredApiKeyPlaintextMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
    toastSuccessMock.mockReset();
    updateApiKeyMock.mockReset();
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

  it('在本地存储不可用时仍返回服务端 API keys 列表', async () => {
    getApiKeysMock.mockResolvedValue([
      { id: 'key_1', name: 'Primary', isActive: true, keyPreview: 'ah_****_1' },
      { id: 'key_2', name: 'Backup', isActive: false, keyPreview: 'ah_****_2' },
    ]);
    pruneStoredApiKeyPlaintextsMock.mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    resolveStoredApiKeyPlaintextMock.mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      {
        id: 'key_1',
        name: 'Primary',
        isActive: true,
        keyPreview: 'ah_****_1',
        plainKey: null,
      },
      {
        id: 'key_2',
        name: 'Backup',
        isActive: false,
        keyPreview: 'ah_****_2',
        plainKey: null,
      },
    ]);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('更新 API Key 时本地明文删除失败也不影响成功链路', async () => {
    updateApiKeyMock.mockResolvedValue({
      id: 'key_1',
      isActive: false,
      keyPreview: 'ah_****_1',
      name: 'Primary',
    });
    removeStoredApiKeyPlaintextMock.mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    const { result } = renderHook(() => useUpdateApiKey(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        id: 'key_1',
        data: { isActive: false },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(removeStoredApiKeyPlaintextMock).toHaveBeenCalledWith('key_1');
    expect(toastSuccessMock).toHaveBeenCalledWith('Updated successfully');
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('删除 API Key 时本地明文删除失败也不影响成功链路', async () => {
    deleteApiKeyMock.mockResolvedValue(undefined);
    removeStoredApiKeyPlaintextMock.mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    const { result } = renderHook(() => useDeleteApiKey(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('key_1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(removeStoredApiKeyPlaintextMock).toHaveBeenCalledWith('key_1');
    expect(toastSuccessMock).toHaveBeenCalledWith('Deleted successfully');
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
