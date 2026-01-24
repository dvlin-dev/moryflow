import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DesktopApi } from '@shared/ipc';
import { useDocumentState } from './use-document-state';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useDocumentState', () => {
  const vault = { path: '/vault' };

  let readFile: ReturnType<typeof vi.fn>;
  let writeFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    readFile = vi.fn().mockResolvedValue({ content: 'Hello', mtime: 100 });
    writeFile = vi.fn().mockResolvedValue({ mtime: 200 });

    window.desktopAPI = {
      files: {
        read: readFile,
        write: writeFile,
      },
      workspace: {
        getOpenTabs: vi.fn().mockResolvedValue([]),
        getLastOpenedFile: vi.fn().mockResolvedValue(null),
        setOpenTabs: vi.fn(),
        setLastOpenedFile: vi.fn(),
      },
      events: {},
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('auto-saves edited content after debounce', async () => {
    const { result } = renderHook(() => useDocumentState({ vault }));

    await act(async () => {
      await result.current.loadDocument({
        id: 'doc-1',
        name: 'note.md',
        path: '/vault/note.md',
      });
    });

    expect(readFile).toHaveBeenCalledWith('/vault/note.md');
    await waitFor(() => expect(result.current.activeDoc).not.toBeNull());

    act(() => {
      result.current.handleEditorChange('Updated content');
    });

    expect(result.current.saveState).toBe('dirty');

    await waitFor(() => expect(writeFile).toHaveBeenCalled());
    expect(result.current.saveState).toBe('idle');
  });
});
