import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DesktopApi } from '@shared/ipc';
import { useRecentFiles } from './use-recent-files';

const vaultPath = '/vault';

const allFiles = [
  { path: '/vault/a.md', name: 'a.md', extension: 'md', mtime: 100 },
  { path: '/vault/b.md', name: 'b.md', extension: 'md', mtime: 200 },
  { path: '/vault/c.md', name: 'c.md', extension: 'md', mtime: 300 },
];

describe('useRecentFiles', () => {
  beforeEach(() => {
    window.desktopAPI = {
      workspace: {
        getRecentFiles: vi.fn(),
      },
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns MRU files when available', async () => {
    window.desktopAPI.workspace.getRecentFiles = vi
      .fn()
      .mockResolvedValue(['/vault/b.md', '/vault/a.md']);

    const { result } = renderHook(() => useRecentFiles(vaultPath, allFiles));

    await waitFor(() => expect(result.current.recentFiles).toHaveLength(2));
    expect(window.desktopAPI.workspace.getRecentFiles).toHaveBeenCalledWith(vaultPath);
    expect(result.current.recentFiles.map((file) => file.path)).toEqual([
      '/vault/b.md',
      '/vault/a.md',
    ]);
  });

  it('falls back to mtime order when MRU is empty', async () => {
    window.desktopAPI.workspace.getRecentFiles = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useRecentFiles(vaultPath, allFiles));

    await waitFor(() => expect(result.current.recentFiles).toHaveLength(3));
    expect(result.current.recentFiles.map((file) => file.path)).toEqual([
      '/vault/c.md',
      '/vault/b.md',
      '/vault/a.md',
    ]);
  });
});
