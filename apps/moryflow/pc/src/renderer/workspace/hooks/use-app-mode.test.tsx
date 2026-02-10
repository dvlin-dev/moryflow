import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DesktopApi } from '@shared/ipc';
import { useAppMode } from './use-app-mode';

describe('useAppMode', () => {
  let getLastMode: ReturnType<typeof vi.fn>;
  let setLastMode: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getLastMode = vi.fn().mockResolvedValue('chat');
    setLastMode = vi.fn().mockResolvedValue(undefined);

    window.desktopAPI = {
      workspace: {
        getLastMode,
        setLastMode,
      },
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads stored mode and persists on setMode', async () => {
    getLastMode.mockResolvedValue('sites');

    const { result } = renderHook(() => useAppMode());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.mode).toBe('sites');

    act(() => {
      result.current.setMode('workspace');
    });

    expect(result.current.mode).toBe('workspace');
    await waitFor(() => expect(setLastMode).toHaveBeenCalledWith('workspace'));
  });

  it('supports Cmd/Ctrl+1/2/3 shortcuts', async () => {
    const { result } = renderHook(() => useAppMode());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true, key: '2' }));
    });
    await waitFor(() => expect(result.current.mode).toBe('workspace'));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: '3' }));
    });
    await waitFor(() => expect(result.current.mode).toBe('sites'));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true, key: '1' }));
    });
    await waitFor(() => expect(result.current.mode).toBe('chat'));
  });
});
