import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearchPanel } from './index';

const mockUseGlobalSearch = vi.fn();

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./use-global-search', () => ({
  useGlobalSearch: () => mockUseGlobalSearch(),
}));

describe('GlobalSearchPanel', () => {
  const baseState = {
    query: 'alpha',
    setQuery: vi.fn(),
    loading: false,
    error: null,
    memoryUnavailable: null,
    files: [
      {
        type: 'file' as const,
        docId: 'file-1',
        vaultPath: '/vault',
        filePath: '/vault/Alpha.md',
        relativePath: 'Alpha.md',
        fileName: 'Alpha.md',
        score: 1,
        snippet: 'local alpha',
        updatedAt: 1,
      },
    ],
    threads: [
      {
        type: 'thread' as const,
        docId: 'thread-1',
        vaultPath: '/vault',
        sessionId: 'session-1',
        title: 'Alpha thread',
        score: 1,
        snippet: 'thread alpha',
        updatedAt: 1,
      },
    ],
    memoryFiles: [
      {
        id: 'memory-file-1',
        fileId: 'remote-file-1',
        vaultId: 'vault-1',
        sourceId: 'source-1',
        title: 'Remote Alpha',
        path: 'Docs/Remote Alpha.md',
        localPath: '/vault/Docs/Remote Alpha.md',
        disabled: false,
        snippet: 'remote alpha',
        score: 0.92,
      },
    ],
    memoryFacts: [
      {
        id: 'fact-1',
        text: 'Remember alpha',
        kind: 'manual' as const,
        readOnly: false,
        metadata: null,
        score: 0.87,
        sourceId: null,
      },
    ],
    hasEnoughQuery: true,
  };

  beforeEach(() => {
    mockUseGlobalSearch.mockReturnValue(baseState);
  });

  it('renders local and memory groups and routes memory fact hits separately', async () => {
    const onOpenFile = vi.fn();
    const onOpenThread = vi.fn();
    const onOpenMemoryFile = vi.fn();
    const onOpenMemoryFact = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <GlobalSearchPanel
        open
        onOpenChange={onOpenChange}
        onOpenFile={onOpenFile}
        onOpenThread={onOpenThread}
        onOpenMemoryFile={onOpenMemoryFile}
        onOpenMemoryFact={onOpenMemoryFact}
      />
    );

    expect(screen.getByText('globalSearchThreads')).toBeInTheDocument();
    expect(screen.getByText('globalSearchFiles')).toBeInTheDocument();
    expect(screen.getByText('globalSearchMemoryFiles')).toBeInTheDocument();
    expect(screen.getByText('globalSearchFacts')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Remember alpha'));

    expect(onOpenMemoryFact).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'fact-1',
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders memory unavailable state without hiding local results', () => {
    mockUseGlobalSearch.mockReturnValue({
      ...baseState,
      memoryFiles: [],
      memoryFacts: [],
      memoryUnavailable: 'Memory search unavailable',
    });

    render(
      <GlobalSearchPanel
        open
        onOpenChange={vi.fn()}
        onOpenFile={vi.fn()}
        onOpenThread={vi.fn()}
        onOpenMemoryFile={vi.fn()}
        onOpenMemoryFact={vi.fn()}
      />
    );

    expect(screen.getByText('Memory search unavailable')).toBeInTheDocument();
    expect(screen.getByText('globalSearchFiles')).toBeInTheDocument();
  });

  it('disables memory files that are not available locally', () => {
    const onOpenMemoryFile = vi.fn();
    mockUseGlobalSearch.mockReturnValue({
      ...baseState,
      memoryFiles: [
        {
          id: 'memory-file-2',
          fileId: 'remote-file-2',
          vaultId: 'vault-1',
          sourceId: 'source-2',
          title: 'Remote Beta',
          path: 'Docs/Remote Beta.md',
          localPath: null,
          disabled: true,
          snippet: '',
          score: 0.42,
        },
      ],
    });

    render(
      <GlobalSearchPanel
        open
        onOpenChange={vi.fn()}
        onOpenFile={vi.fn()}
        onOpenThread={vi.fn()}
        onOpenMemoryFile={onOpenMemoryFile}
        onOpenMemoryFact={vi.fn()}
      />
    );

    const item = screen.getByRole('option', { name: /Remote Beta/i });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(item);
    expect(onOpenMemoryFile).not.toHaveBeenCalled();
    expect(screen.getByText('globalSearchNotAvailableLocally')).toBeInTheDocument();
  });
});
