import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DesktopApi } from '@shared/ipc';
import { useNavigation } from './use-navigation';

describe('useNavigation', () => {
  let getLastAgentSub: ReturnType<typeof vi.fn>;
  let setLastAgentSub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getLastAgentSub = vi.fn().mockResolvedValue('chat');
    setLastAgentSub = vi.fn().mockResolvedValue(undefined);

    window.desktopAPI = {
      workspace: {
        getLastAgentSub,
        setLastAgentSub,
      },
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads stored agentSub and persists on setSub', async () => {
    getLastAgentSub.mockResolvedValue('workspace');

    const { result } = renderHook(() => useNavigation());

    await waitFor(() => expect(result.current.agentSub).toBe('workspace'));
    expect(result.current.destination).toBe('agent');
    expect(result.current.agentSub).toBe('workspace');

    act(() => {
      result.current.go('sites');
    });
    expect(result.current.destination).toBe('sites');

    act(() => {
      result.current.setSub('chat');
    });
    expect(result.current.destination).toBe('agent');
    expect(result.current.agentSub).toBe('chat');
    await waitFor(() => expect(setLastAgentSub).toHaveBeenCalledWith('chat'));
  });

  it('supports Cmd/Ctrl+1/2/3/4 shortcuts', async () => {
    const { result } = renderHook(() => useNavigation());
    await waitFor(() => expect(getLastAgentSub).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true, key: '2' }));
    });
    await waitFor(() => expect(result.current.agentSub).toBe('workspace'));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: '3' }));
    });
    await waitFor(() => expect(result.current.destination).toBe('skills'));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: '4' }));
    });
    await waitFor(() => expect(result.current.destination).toBe('sites'));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true, key: '1' }));
    });
    await waitFor(() => expect(result.current.agentSub).toBe('chat'));
    await waitFor(() => expect(result.current.destination).toBe('agent'));
  });
});
