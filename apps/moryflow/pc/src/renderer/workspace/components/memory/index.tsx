/**
 * [PROPS]: -
 * [EMITS]: refresh()
 * [POS]: Memory Dashboard 主区（overview + facts panel + connections panel + sheet overlays）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { AlertCircle } from 'lucide-react';
import { useWorkspaceTree, useWorkspaceVault } from '../../context';
import { extractMemoryErrorMessage } from './const';
import { useMemoryPageState } from './use-memory';
import { useMemoryDashboard } from './use-memory-dashboard';
import { useMemoryWorkbenchStore } from './memory-workbench-store';
import { MemoryDashboardHeader } from './memory-dashboard-header';
import { MemoryPanel } from './memory-panel';
import { ConnectionsPanel } from './connections-panel';
import { MemoryEmptyState } from './memory-empty-state';
import { SearchSheet } from './search-sheet';
import { MemoriesSheet } from './memories-sheet';
import { ConnectionsSheet } from './connections-sheet';
import { WorkbenchSheet } from './workbench-sheet';

export const MemoryPage = () => {
  const { openFileFromTree } = useWorkspaceTree();
  const { vault } = useWorkspaceVault();
  const scopeKey = vault?.path ?? '__memory-no-vault__';
  const memoryState = useMemoryPageState();
  const {
    overview,
    loading,
    error,
    actionError,
    refresh,
    searchQuery,
    setSearchQuery,
    searchState,
    factsState,
    factDraft,
    setFactDraft,
    createFact,
    selectedFact,
    selectedFactDraft,
    setSelectedFactDraft,
    factDetailLoading,
    openFact,
    markFactUseful,
    saveSelectedFact,
    deleteSelectedFact,
    selectedFactIds,
    toggleFactSelection,
    deleteSelectedFacts,
    graphQuery,
    setGraphQuery,
    graphState,
    selectedEntityDetail,
    entityDetailLoading,
    openEntity,
    createExport,
    setActiveTab,
  } = memoryState;

  const pendingFactIntent = useMemoryWorkbenchStore((s) => s.pendingFactIntent);

  const disabledReason = overview?.binding.disabledReason ?? null;
  const isUnavailable = error && !overview;
  const isDisabled = !error && !overview?.binding.bound && disabledReason;
  // Only available when overview has loaded AND memory is bound.
  // Prevents bootstrap from firing before getOverview resolves.
  const isAvailable = overview?.binding.bound === true;

  const { activeSheet, openSheet, closeSheet } = useMemoryDashboard({
    setActiveTab,
    isAvailable,
    pendingFactIntent,
    scopeKey,
  });

  const totalFactCount = overview
    ? overview.facts.manualCount + overview.facts.derivedCount
    : factsState.data.length;

  if (isUnavailable) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <MemoryDashboardHeader overview={null} loading={loading} onRefresh={() => void refresh()} />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <MemoryEmptyState error={error} onRetry={() => void refresh()} />
        </div>
      </div>
    );
  }

  if (isDisabled) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <MemoryDashboardHeader
          overview={overview}
          loading={loading}
          onRefresh={() => void refresh()}
        />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <MemoryEmptyState disabledReason={disabledReason} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <MemoryDashboardHeader
        overview={overview}
        loading={loading}
        onRefresh={() => void refresh()}
        onOpenSearch={() => openSheet('search')}
        onOpenWorkbench={() => openSheet('workbench')}
        onExport={() => void createExport()}
      />

      {actionError ? (
        <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-6 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <p className="text-sm text-destructive">{extractMemoryErrorMessage(actionError)}</p>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <MemoryPanel
          facts={factsState.data}
          totalCount={totalFactCount}
          loading={factsState.loading}
          factDraft={factDraft}
          onFactDraftChange={setFactDraft}
          onCreateFact={() => void createFact()}
          onFactClick={(factId) => {
            void openFact(factId);
            openSheet('memories');
          }}
          onSeeAll={() => openSheet('memories')}
        />
        <ConnectionsPanel
          overview={overview}
          graphState={graphState}
          onEntityClick={(entityId) => {
            void openEntity(entityId);
            openSheet('connections');
          }}
          onExplore={() => openSheet('connections')}
        />
      </div>

      <SearchSheet
        open={activeSheet === 'search'}
        onClose={closeSheet}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchState={searchState}
        onFactClick={(factId) => {
          void openFact(factId);
          openSheet('memories');
        }}
        onFileOpen={openFileFromTree}
      />
      <MemoriesSheet
        open={activeSheet === 'memories'}
        onClose={closeSheet}
        facts={factsState.data}
        loading={factsState.loading}
        error={factsState.error}
        factDraft={factDraft}
        onFactDraftChange={setFactDraft}
        onCreateFact={() => void createFact()}
        selectedFact={selectedFact}
        selectedFactDraft={selectedFactDraft}
        onSelectedFactDraftChange={setSelectedFactDraft}
        factDetailLoading={factDetailLoading}
        onOpenFact={(factId) => void openFact(factId)}
        onSaveFact={() => void saveSelectedFact()}
        onDeleteFact={() => void deleteSelectedFact()}
        onMarkUseful={() => void markFactUseful()}
        selectedFactIds={selectedFactIds}
        onToggleSelection={toggleFactSelection}
        onDeleteSelected={() => void deleteSelectedFacts()}
      />
      <ConnectionsSheet
        open={activeSheet === 'connections'}
        onClose={closeSheet}
        graphQuery={graphQuery}
        setGraphQuery={setGraphQuery}
        graphState={graphState}
        selectedEntityDetail={selectedEntityDetail}
        entityDetailLoading={entityDetailLoading}
        onEntityClick={(entityId) => void openEntity(entityId)}
      />
      <WorkbenchSheet
        open={activeSheet === 'workbench'}
        onClose={closeSheet}
        memoryState={memoryState}
      />
    </div>
  );
};
