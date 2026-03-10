import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DesktopApi } from '@shared/ipc';
import { useNavigation } from './use-navigation';

describe('useNavigation', () => {
  let getLastSidebarMode: ReturnType<typeof vi.fn>;
  let setLastSidebarMode: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getLastSidebarMode = vi.fn().mockResolvedValue('chat');
    setLastSidebarMode = vi.fn().mockResolvedValue(undefined);

    window.desktopAPI = {
      workspace: {
        getLastSidebarMode,
        setLastSidebarMode,
      },
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('boots into home mode and persists on setSidebarMode', async () => {
    const { result } = renderHook(() => useNavigation());

    await waitFor(() => expect(result.current.sidebarMode).toBe('home'));
    expect(result.current.destination).toBe('agent');
    expect(result.current.sidebarMode).toBe('home');
    expect(getLastSidebarMode).not.toHaveBeenCalled();

    act(() => {
      result.current.go('sites');
    });
    expect(result.current.destination).toBe('sites');
    expect(result.current.sidebarMode).toBe('home');

    act(() => {
      result.current.go('remote-agents');
    });
    expect(result.current.destination).toBe('remote-agents');
    expect(result.current.sidebarMode).toBe('home');

    act(() => {
      result.current.setSidebarMode('chat');
    });
    expect(result.current.destination).toBe('agent');
    expect(result.current.sidebarMode).toBe('chat');
    await waitFor(() => expect(setLastSidebarMode).toHaveBeenCalledWith('chat'));
  });

  it('supports Cmd/Ctrl+1/2/3/4 shortcuts', async () => {
    const { result } = renderHook(() => useNavigation());
    await waitFor(() => expect(result.current.sidebarMode).toBe('home'));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true, key: '2' }));
    });
    await waitFor(() => expect(result.current.sidebarMode).toBe('home'));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: '3' }));
    });
    await waitFor(() => expect(result.current.destination).toBe('skills'));
    expect(result.current.sidebarMode).toBe('home');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: '4' }));
    });
    await waitFor(() => expect(result.current.destination).toBe('sites'));
    expect(result.current.sidebarMode).toBe('home');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true, key: '1' }));
    });
    await waitFor(() => expect(result.current.sidebarMode).toBe('chat'));
    await waitFor(() => expect(result.current.destination).toBe('agent'));
  });

  it('does not override module navigation when bootstrap resolves late', async () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.go('skills');
    });
    expect(result.current.destination).toBe('skills');
    expect(result.current.sidebarMode).toBe('home');
    expect(result.current.destination).toBe('skills');
    expect(result.current.sidebarMode).toBe('home');
  });
});
