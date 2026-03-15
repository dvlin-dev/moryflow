import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryPage } from './index';
import { resetMemoryWorkbenchStore } from './memory-workbench-store';

const mockUseWorkspaceNav = vi.fn();
const mockUseWorkspaceVault = vi.fn();
const mockUseWorkspaceTree = vi.fn();
const mockUseChatSessions = vi.fn();

vi.mock('../../context', () => ({
  useWorkspaceNav: () => mockUseWorkspaceNav(),
  useWorkspaceVault: () => mockUseWorkspaceVault(),
  useWorkspaceTree: () => mockUseWorkspaceTree(),
}));

vi.mock('@/components/chat-pane/hooks', () => ({
  useChatSessions: () => mockUseChatSessions(),
}));

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ nodes, edges: _edges }: { nodes: unknown[]; edges: unknown[] }) => (
    <div data-testid="react-flow">
      {(nodes as { id: string; data: { label: string } }[]).map((n) => (
        <div key={n.id}>{n.data.label}</div>
      ))}
    </div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}));

vi.mock('d3-force', () => ({
  forceSimulation: () => ({
    force: function () {
      return this;
    },
    stop: function () {
      return this;
    },
    tick: function () {
      return this;
    },
  }),
  forceLink: () => {
    const f = Object.assign(() => f, {
      id: function () {
        return f;
      },
    });
    return f;
  },
  forceManyBody: () => ({
    strength: function () {
      return this;
    },
  }),
  forceCenter: () => ({}),
  forceCollide: () => ({}),
}));

describe('MemoryPage', () => {
  beforeEach(() => {
    resetMemoryWorkbenchStore();
    mockUseWorkspaceNav.mockReturnValue({
      destination: 'memory',
      go: vi.fn(),
      setSidebarMode: vi.fn(),
    });
    mockUseWorkspaceVault.mockReturnValue({
      vault: {
        path: '/vaults/alpha',
      },
    });
    mockUseWorkspaceTree.mockReturnValue({
      openFileFromTree: vi.fn(),
    });
    mockUseChatSessions.mockReturnValue({
      selectSession: vi.fn(),
    });

    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getOverview: vi.fn(async () => ({
          scope: {
            workspaceId: 'workspace-1',
            workspaceName: 'Workspace',
            localPath: '/vaults/alpha',
            vaultId: 'vault-1',
            projectId: 'vault-1',
          },
          binding: {
            loggedIn: true,
            bound: true,
          },
          sync: {
            engineStatus: 'idle',
            lastSyncAt: null,
            storageUsedBytes: 1024,
          },
          indexing: {
            sourceCount: 6,
            indexedSourceCount: 5,
            pendingSourceCount: 1,
            failedSourceCount: 0,
            lastIndexedAt: '2026-03-11T12:00:00.000Z',
          },
          facts: {
            manualCount: 2,
            derivedCount: 5,
          },
          graph: {
            entityCount: 4,
            relationCount: 3,
            projectionStatus: 'ready',
            lastProjectedAt: '2026-03-11T12:30:00.000Z',
          },
        })),
        search: vi.fn(async () => ({
          scope: {
            vaultId: 'vault-1',
            projectId: 'vault-1',
          },
          query: 'alpha',
          groups: {
            files: {
              items: [
                {
                  id: 'source-1',
                  fileId: 'file-1',
                  vaultId: 'vault-1',
                  sourceId: 'source-1',
                  title: 'Alpha.md',
                  path: 'Docs/Alpha.md',
                  localPath: '/vaults/alpha/Docs/Alpha.md',
                  disabled: false,
                  snippet: 'alpha snippet',
                  score: 0.91,
                },
              ],
              returnedCount: 1,
              hasMore: false,
            },
            facts: {
              items: [
                {
                  id: 'fact-1',
                  text: 'Remember alpha',
                  kind: 'manual',
                  readOnly: false,
                  metadata: { pinned: true },
                  score: 0.82,
                  sourceId: null,
                },
              ],
              returnedCount: 1,
              hasMore: false,
            },
          },
        })),
        listFacts: vi.fn(async () => ({
          scope: {
            vaultId: 'vault-1',
            projectId: 'vault-1',
          },
          page: 1,
          pageSize: 20,
          hasMore: false,
          items: [
            {
              id: 'fact-1',
              text: 'Remember alpha',
              kind: 'manual',
              readOnly: false,
              metadata: null,
              categories: ['project'],
              sourceId: null,
              sourceRevisionId: null,
              derivedKey: null,
              expirationDate: null,
              createdAt: '2026-03-11T12:00:00.000Z',
              updatedAt: '2026-03-11T12:00:00.000Z',
            },
          ],
        })),
        getFactDetail: vi.fn(async () => ({
          id: 'fact-1',
          text: 'Remember alpha',
          kind: 'manual',
          readOnly: false,
          metadata: { pinned: true },
          categories: ['project'],
          sourceId: null,
          sourceRevisionId: null,
          derivedKey: null,
          expirationDate: null,
          createdAt: '2026-03-11T12:00:00.000Z',
          updatedAt: '2026-03-11T12:00:00.000Z',
        })),
        createFact: vi.fn(async () => ({
          id: 'fact-2',
          text: 'Fresh note',
          kind: 'manual',
          readOnly: false,
          metadata: null,
          categories: [],
          sourceId: null,
          sourceRevisionId: null,
          derivedKey: null,
          expirationDate: null,
          createdAt: '2026-03-11T13:00:00.000Z',
          updatedAt: '2026-03-11T13:00:00.000Z',
        })),
        updateFact: vi.fn(async () => ({
          id: 'fact-1',
          text: 'Remember alpha updated',
          kind: 'manual',
          readOnly: false,
          metadata: { pinned: true },
          categories: ['project'],
          sourceId: null,
          sourceRevisionId: null,
          derivedKey: null,
          expirationDate: null,
          createdAt: '2026-03-11T12:00:00.000Z',
          updatedAt: '2026-03-11T13:10:00.000Z',
        })),
        deleteFact: vi.fn(async () => undefined),
        batchDeleteFacts: vi.fn(async () => ({
          deletedCount: 1,
        })),
        getFactHistory: vi.fn(async () => ({
          scope: {
            vaultId: 'vault-1',
            projectId: 'vault-1',
          },
          items: [
            {
              id: 'history-1',
              factId: 'fact-1',
              event: 'ADD',
              oldText: null,
              newText: 'Remember alpha',
              metadata: null,
              input: null,
              createdAt: '2026-03-11T12:00:00.000Z',
              userId: 'user-1',
            },
          ],
        })),
        feedbackFact: vi.fn(async () => ({
          id: 'feedback-1',
          feedback: 'positive',
          reason: 'useful',
        })),
        queryGraph: vi.fn(async () => ({
          scope: {
            vaultId: 'vault-1',
            projectId: 'vault-1',
          },
          entities: [
            {
              id: 'entity-1',
              entityType: 'person',
              canonicalName: 'Alice',
              aliases: ['A'],
              metadata: { team: 'alpha' },
              lastSeenAt: '2026-03-11T12:10:00.000Z',
            },
          ],
          relations: [
            {
              id: 'relation-1',
              relationType: 'works_on',
              confidence: 0.94,
              from: {
                id: 'entity-1',
                entityType: 'person',
                canonicalName: 'Alice',
                aliases: ['A'],
              },
              to: {
                id: 'entity-2',
                entityType: 'project',
                canonicalName: 'Moryflow',
                aliases: [],
              },
            },
          ],
          evidenceSummary: {
            observationCount: 2,
            sourceCount: 1,
            memoryFactCount: 1,
            latestObservedAt: '2026-03-11T12:10:00.000Z',
          },
        })),
        getEntityDetail: vi.fn(async () => ({
          entity: {
            id: 'entity-1',
            entityType: 'person',
            canonicalName: 'Alice',
            aliases: ['A'],
            metadata: { team: 'alpha' },
            lastSeenAt: '2026-03-11T12:10:00.000Z',
            incomingRelations: [],
            outgoingRelations: [
              {
                id: 'relation-1',
                relationType: 'works_on',
                confidence: 0.94,
                from: {
                  id: 'entity-1',
                  entityType: 'person',
                  canonicalName: 'Alice',
                  aliases: ['A'],
                },
                to: {
                  id: 'entity-2',
                  entityType: 'project',
                  canonicalName: 'Moryflow',
                  aliases: [],
                },
              },
            ],
          },
          evidenceSummary: {
            observationCount: 2,
            sourceCount: 1,
            memoryFactCount: 1,
            latestObservedAt: '2026-03-11T12:10:00.000Z',
          },
          recentObservations: [],
        })),
        createExport: vi.fn(async () => ({
          exportId: 'export-1',
        })),
        getExport: vi.fn(async () => ({
          scope: {
            vaultId: 'vault-1',
            projectId: 'vault-1',
          },
          items: [
            {
              id: 'fact-1',
              text: 'Remember alpha',
              kind: 'manual',
              readOnly: false,
              metadata: null,
              categories: [],
              sourceId: null,
              sourceRevisionId: null,
              derivedKey: null,
              expirationDate: null,
              createdAt: '2026-03-11T12:00:00.000Z',
              updatedAt: '2026-03-11T12:00:00.000Z',
            },
          ],
        })),
      },
    } as typeof window.desktopAPI;
  });

  it('renders dashboard header with stats and fact panel', async () => {
    render(<MemoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Memory')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('7 facts')).toBeInTheDocument();
    });
    expect(screen.getByText('4 entities')).toBeInTheDocument();
    expect(screen.getByText('Memories')).toBeInTheDocument();
    expect(screen.getByText('Connections')).toBeInTheDocument();
  });

  it('shows facts in the memory panel after loading', async () => {
    render(<MemoryPage />);

    await waitFor(() => {
      expect(window.desktopAPI.memory.listFacts).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Remember alpha')).toBeInTheDocument();
    });
  });

  it('creates a fact from the dashboard panel input', async () => {
    render(<MemoryPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a memory...')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Add a memory...'), {
      target: { value: 'Fresh note' },
    });
    fireEvent.click(screen.getAllByRole('button').find((b) => b.querySelector('.lucide-plus'))!);

    await waitFor(() => {
      expect(window.desktopAPI.memory.createFact).toHaveBeenCalledWith({
        text: 'Fresh note',
      });
    });
  });

  it('opens the search sheet with search functionality', async () => {
    render(<MemoryPage />);

    // Wait for the overview to load before interacting
    await waitFor(() => {
      expect(screen.getByText('7 facts')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button').find((b) => b.querySelector('.lucide-search'))!);

    await waitFor(() => {
      expect(screen.getByText('Search Memory')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search memory files or facts...'), {
      target: { value: 'alpha' },
    });

    await waitFor(() => {
      expect(window.desktopAPI.memory.search).toHaveBeenCalledWith({
        query: 'alpha',
        limitPerGroup: 10,
        includeGraphContext: true,
      });
    });

    expect(screen.getByText('Alpha.md')).toBeInTheDocument();
    expect(screen.getAllByText('Remember alpha').length).toBeGreaterThan(0);
  });

  it('opens the workbench sheet in advanced mode with all tabs', async () => {
    render(<MemoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Memory')).toBeInTheDocument();
    });

    fireEvent.pointerDown(
      screen.getAllByRole('button').find((b) => b.querySelector('.lucide-ellipsis'))!
    );

    await waitFor(() => {
      expect(screen.getByText('Advanced mode')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Advanced mode'));

    await waitFor(() => {
      expect(screen.getByText('Advanced Workbench')).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Facts' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Graph' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Exports' })).toBeInTheDocument();
  });

  it('renders empty state when error and no overview', async () => {
    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getOverview: vi.fn(async () => {
          throw new Error('Network failure');
        }),
      },
    } as typeof window.desktopAPI;

    render(<MemoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Memory unavailable')).toBeInTheDocument();
    });
    expect(screen.getByText('Network failure')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders disabled state when memory is not bound', async () => {
    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
        getOverview: vi.fn(async () => ({
          scope: {
            workspaceId: null,
            workspaceName: null,
            localPath: null,
            vaultId: null,
            projectId: null,
          },
          binding: {
            loggedIn: false,
            bound: false,
            disabledReason: 'login_required' as const,
          },
          sync: {
            engineStatus: 'idle',
            lastSyncAt: null,
            storageUsedBytes: 0,
          },
          indexing: {
            sourceCount: 0,
            indexedSourceCount: 0,
            pendingSourceCount: 0,
            failedSourceCount: 0,
            lastIndexedAt: null,
          },
          facts: {
            manualCount: 0,
            derivedCount: 0,
          },
          graph: {
            entityCount: 0,
            relationCount: 0,
            projectionStatus: 'idle',
            lastProjectedAt: null,
          },
        })),
      },
    } as typeof window.desktopAPI;

    render(<MemoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Log in to enable Memory')).toBeInTheDocument();
    });
  });

  it('shows connections panel with graph entities', async () => {
    render(<MemoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Connections')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('4 entities · 3 relations')).toBeInTheDocument();
    });
  });
});
