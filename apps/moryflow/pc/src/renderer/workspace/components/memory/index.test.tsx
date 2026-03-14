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

  it('renders workbench tabs and overview stats', async () => {
    render(<MemoryPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Facts' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Graph' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Exports' })).toBeInTheDocument();
    expect(screen.getByText('Workspace profile')).toBeInTheDocument();
    expect(screen.getByText('Memory status')).toBeInTheDocument();
    expect(screen.getByText('Sync status')).toBeInTheDocument();
    expect(screen.queryByText('Workspace binding')).not.toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('supports search, facts, graph and exports workflows from one workbench', async () => {
    render(<MemoryPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Search' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Search' }));
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
    expect(screen.getByText('Remember alpha')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remember alpha' }));

    await waitFor(() => {
      expect(window.desktopAPI.memory.getFactDetail).toHaveBeenCalledWith('fact-1');
    });
    expect(screen.getAllByText('Remember alpha').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: 'Facts' }));

    await waitFor(() => {
      expect(window.desktopAPI.memory.listFacts).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText('Write a manual fact...'), {
      target: { value: 'Fresh note' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add fact' }));

    await waitFor(() => {
      expect(window.desktopAPI.memory.createFact).toHaveBeenCalledWith({
        text: 'Fresh note',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remember alpha' }));
    await waitFor(() => {
      expect(window.desktopAPI.memory.getFactHistory).toHaveBeenCalledWith('fact-1');
    });

    fireEvent.change(screen.getByDisplayValue('Remember alpha'), {
      target: { value: 'Remember alpha updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => {
      expect(window.desktopAPI.memory.updateFact).toHaveBeenCalledWith({
        factId: 'fact-1',
        text: 'Remember alpha updated',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mark useful' }));
    await waitFor(() => {
      expect(window.desktopAPI.memory.feedbackFact).toHaveBeenCalledWith({
        factId: 'fact-1',
        feedback: 'positive',
      });
    });

    fireEvent.click(screen.getByLabelText('Select Remember alpha'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    await waitFor(() => {
      expect(window.desktopAPI.memory.batchDeleteFacts).toHaveBeenCalledWith({
        factIds: ['fact-1'],
      });
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Graph' }));
    await waitFor(() => {
      expect(window.desktopAPI.memory.queryGraph).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Alice' }));
    await waitFor(() => {
      expect(window.desktopAPI.memory.getEntityDetail).toHaveBeenCalledWith({
        entityId: 'entity-1',
      });
    });
    expect(screen.getByText('works_on')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Exports' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create facts export' }));

    await waitFor(() => {
      expect(window.desktopAPI.memory.createExport).toHaveBeenCalled();
      expect(window.desktopAPI.memory.getExport).toHaveBeenCalledWith('export-1');
    });
    expect(screen.getByText('Export ready')).toBeInTheDocument();
  });

  it('disables memory files in workbench search when they are not available locally', async () => {
    const openFileFromTree = vi.fn();
    mockUseWorkspaceTree.mockReturnValue({
      openFileFromTree,
    });
    window.desktopAPI = {
      ...window.desktopAPI,
      memory: {
        ...window.desktopAPI?.memory,
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
                  id: 'source-2',
                  fileId: 'file-2',
                  vaultId: 'vault-1',
                  sourceId: 'source-2',
                  title: 'Remote only',
                  path: 'Docs/Remote only.md',
                  localPath: undefined,
                  disabled: true,
                  snippet: '',
                  score: 0.4,
                },
              ],
              returnedCount: 1,
              hasMore: false,
            },
            facts: {
              items: [],
              returnedCount: 0,
              hasMore: false,
            },
          },
        })),
      },
    } as typeof window.desktopAPI;

    render(<MemoryPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Search' }));
    fireEvent.change(screen.getByPlaceholderText('Search memory files or facts...'), {
      target: { value: 'alpha' },
    });

    await waitFor(() => {
      expect(screen.getByText('Remote only')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /Remote only/i });
    expect(button).toBeDisabled();
    expect(screen.getByText('Not available locally')).toBeInTheDocument();
    fireEvent.click(button);
    expect(openFileFromTree).not.toHaveBeenCalled();
  });
});
