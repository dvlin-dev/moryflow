import { useCallback, useEffect } from 'react';
import { Brain, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { MEMORY_PAGE_TITLE, MEMORY_PAGE_SUBTITLE } from './const';
import { useMemoryStore } from './memory-store';
import { useMemoryPage } from './use-memory-page';
import { useWorkspaceShellViewStore } from '../../stores/workspace-shell-view-store';
import { useWorkspaceShell } from '../../context';
import { useAuth } from '../../../lib/server/auth-hooks';
import { MemoriesCard } from './memories-card';
import { KnowledgeCard } from './knowledge-card';
import { ConnectionsCard } from './connections-card';
import { MemoriesPanel } from './memories-panel';
import { KnowledgePanel } from './knowledge-panel';
import { ConnectionsOverlay } from './connections-overlay';

export { useMemoryStore } from './memory-store';

export function MemoryDashboard() {
  const {
    detailView,
    openDetail,
    closeDetail,
    selectedFactId,
    selectFact,
    pendingFactIntent,
    clearPendingFactIntent,
  } = useMemoryStore();

  // Consume pending fact intent from Global Search deep-link
  useEffect(() => {
    if (pendingFactIntent) {
      clearPendingFactIntent();
    }
  }, [pendingFactIntent, clearPendingFactIntent]);
  const vaultPath = useWorkspaceShellViewStore((state) => state.vaultPath);
  const { openSettings } = useWorkspaceShell();
  const { user } = useAuth();
  const scopeKey = vaultPath ? `${vaultPath}:${user?.id ?? ''}` : undefined;

  const {
    overview,
    overviewLoading,
    overviewError,
    personalFacts,
    personalFactsLoading,
    knowledgeFacts,
    knowledgeFactsLoading: _knowledgeFactsLoading,
    graphEntities,
    graphRelations,
    graphLoading: _graphLoading,
    knowledgeSearchResults,
    knowledgeSearchLoading,
    refreshing,
    createFact,
    updateFact,
    deleteFact,
    batchDeleteFacts,
    feedbackFact,
    searchKnowledge,
    clearKnowledgeSearch,
    loadGraph,
    loadMorePersonalFacts,
    personalFactsHasMore,
  } = useMemoryPage(scopeKey);

  const totalMemoryCount = overview ? overview.facts.manualCount : personalFacts.length;

  const entityCount = overview?.graph.entityCount ?? graphEntities.length;
  const relationCount = overview?.graph.relationCount ?? graphRelations.length;

  const disabledReason = overview?.binding?.disabledReason;
  const isLoggedOut = overview?.binding?.loggedIn === false;
  const isDisabled = !!disabledReason || isLoggedOut;

  const isEmpty =
    !isDisabled &&
    !overviewLoading &&
    personalFacts.length === 0 &&
    graphEntities.length === 0 &&
    (overview
      ? overview.facts.manualCount === 0 &&
        overview.facts.derivedCount === 0 &&
        overview.graph.entityCount === 0
      : true);

  const handleOpenMemories = useCallback(() => openDetail('memories'), [openDetail]);
  const handleOpenKnowledge = useCallback(() => openDetail('knowledge'), [openDetail]);
  const handleOpenConnections = useCallback(() => openDetail('connections'), [openDetail]);

  const handleCreateFact = useCallback(
    (text: string) => {
      void createFact(text);
    },
    [createFact]
  );

  const handleUpdateFact = useCallback(
    (id: string, text: string) => {
      void updateFact(id, text);
    },
    [updateFact]
  );

  const handleDeleteFact = useCallback(
    (id: string) => {
      void deleteFact(id);
    },
    [deleteFact]
  );

  const handleFeedbackFact = useCallback(
    (id: string, feedback: 'positive' | 'negative' | 'very_negative') => {
      void feedbackFact(id, feedback);
    },
    [feedbackFact]
  );

  const handleKnowledgeSearch = useCallback(
    (query: string) => {
      void searchKnowledge(query);
    },
    [searchKnowledge]
  );

  const handleQueryGraph = useCallback(
    (query?: string) => {
      void loadGraph(query);
    },
    [loadGraph]
  );

  const handleBatchDeleteFacts = useCallback(
    (ids: string[]) => {
      void batchDeleteFacts(ids);
    },
    [batchDeleteFacts]
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{MEMORY_PAGE_TITLE}</h1>
            <p className="text-sm text-muted-foreground">{MEMORY_PAGE_SUBTITLE}</p>
          </div>
          {refreshing && !overviewLoading && (
            <RefreshCw className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {overviewError && (
          <div className="mx-6 mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {overviewError}
          </div>
        )}

        {isDisabled ? (
          /* Disabled state */
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
            {isLoggedOut ? (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-muted">
                  <Brain className="size-[22px] text-muted-foreground" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Log in to access Memory</h2>
                <p className="text-sm text-muted-foreground">
                  Sign in to let your AI remember and learn about you.
                </p>
                <Button
                  size="sm"
                  className="mt-3 rounded-lg"
                  onClick={() => openSettings('account')}
                >
                  Log in
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-muted">
                  <ShieldAlert className="size-[22px] text-muted-foreground" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  {disabledReason === 'profile_unavailable'
                    ? 'Workspace profile is not ready'
                    : 'Memory is not available'}
                </h2>
              </div>
            )}
          </div>
        ) : isEmpty ? (
          /* Full empty dashboard */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24">
            <Brain className="size-16 text-muted-foreground/30" />
            <div className="text-center">
              <h2 className="text-sm font-semibold text-foreground">
                Your AI doesn&apos;t know you yet
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Add memories manually or start chatting to let your AI learn about you.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={handleOpenMemories}
              >
                <Plus className="mr-1 size-3.5" />
                Add memory
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={handleOpenKnowledge}
              >
                View knowledge
              </Button>
            </div>
          </div>
        ) : (
          /* Dashboard cards */
          <div className="flex flex-col gap-3 p-6">
            <MemoriesCard
              facts={personalFacts}
              totalCount={totalMemoryCount}
              loading={personalFactsLoading}
              onCreateFact={handleCreateFact}
              onOpenDetail={handleOpenMemories}
              onSelectFact={(id) => {
                selectFact(id);
                openDetail('memories');
              }}
            />
            <KnowledgeCard
              overview={overview}
              loading={overviewLoading}
              onOpenDetail={handleOpenKnowledge}
            />
            <ConnectionsCard
              entityCount={entityCount}
              relationCount={relationCount}
              onOpenDetail={handleOpenConnections}
            />
          </div>
        )}
      </div>

      {/* Side panels */}
      <MemoriesPanel
        open={detailView === 'memories'}
        onClose={closeDetail}
        facts={personalFacts}
        hasMore={personalFactsHasMore}
        onLoadMore={loadMorePersonalFacts}
        selectedFactId={selectedFactId}
        onSelectFact={selectFact}
        onCreateFact={handleCreateFact}
        onUpdateFact={handleUpdateFact}
        onDeleteFact={handleDeleteFact}
        onBatchDeleteFacts={handleBatchDeleteFacts}
        onFeedbackFact={handleFeedbackFact}
      />

      <KnowledgePanel
        open={detailView === 'knowledge'}
        onClose={closeDetail}
        overview={overview}
        facts={knowledgeFacts}
        searchResults={knowledgeSearchResults}
        searchLoading={knowledgeSearchLoading}
        onSearch={handleKnowledgeSearch}
        onClearSearch={clearKnowledgeSearch}
      />

      {/* Full screen overlays */}
      <ConnectionsOverlay
        open={detailView === 'connections'}
        onClose={closeDetail}
        entities={graphEntities}
        relations={graphRelations}
        onQueryGraph={handleQueryGraph}
      />
    </div>
  );
}

/** Alias for backward-compatible import from workspace-shell-main-content */
export const MemoryPage = MemoryDashboard;
