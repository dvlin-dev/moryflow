import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DesktopApi } from '@shared/ipc';
import { useSitePublish } from './use-site-publish';

describe('useSitePublish', () => {
  let list: ReturnType<typeof vi.fn>;
  let onProgress: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    list = vi.fn().mockResolvedValue([]);
    onProgress = vi.fn().mockReturnValue(() => undefined);

    window.desktopAPI = {
      sitePublish: {
        list,
        onProgress,
      },
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch sites list on mount by default', async () => {
    renderHook(() => useSitePublish());

    await waitFor(() => expect(onProgress).toHaveBeenCalledTimes(1));
    expect(list).not.toHaveBeenCalled();
  });

  it('fetches sites list on mount when autoRefresh is enabled', async () => {
    renderHook(() => useSitePublish({ autoRefresh: true }));

    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
  });
});
