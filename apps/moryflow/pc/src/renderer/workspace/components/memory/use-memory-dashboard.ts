import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemoryWorkbenchTab } from './memory-workbench-store';

export type MemoryDashboardSheet = 'none' | 'memories' | 'connections' | 'search' | 'workbench';

const SHEET_TAB_MAP: Partial<Record<MemoryDashboardSheet, MemoryWorkbenchTab>> = {
  memories: 'facts',
  connections: 'graph',
  search: 'search',
};

type UseMemoryDashboardOptions = {
  setActiveTab: (tab: MemoryWorkbenchTab) => void;
  isAvailable: boolean;
  pendingFactIntent: { scopeKey: string; value: string } | null;
  scopeKey: string;
};

// Bootstrap phases: idle → facts (trigger loadFacts) → done (stay on graph)
type BootstrapPhase = 'idle' | 'facts' | 'done';

export const useMemoryDashboard = ({
  setActiveTab,
  isAvailable,
  pendingFactIntent,
  scopeKey,
}: UseMemoryDashboardOptions) => {
  const [activeSheet, setActiveSheetState] = useState<MemoryDashboardSheet>('none');
  const [bootstrapPhase, setBootstrapPhase] = useState<BootstrapPhase>('idle');
  const bootstrappedScopeRef = useRef<string | null>(null);

  // Phase 1: when memory becomes available (or scope changes), set tab to
  // 'facts' so the facts-loading effect in useMemoryPageState fires.
  // If a sheet was open when overview loaded (user acted first), bootstrap
  // runs on the next closeSheet because bootstrappedScopeRef stays null.
  useEffect(() => {
    if (!isAvailable || bootstrappedScopeRef.current === scopeKey) return;
    if (activeSheet !== 'none') return;
    bootstrappedScopeRef.current = scopeKey;
    setActiveTab('facts');
    setBootstrapPhase('facts');
  }, [isAvailable, scopeKey, setActiveTab, activeSheet]);

  // Phase 2: after the facts tab has been set, switch to 'graph' so the
  // graph-loading effect fires. We intentionally leave activeTab on 'graph'
  // so the 180ms debounced queryGraph call completes. The tab is only reset
  // to 'overview' when the user opens/closes a sheet.
  useEffect(() => {
    if (bootstrapPhase !== 'facts') return;
    setActiveTab('graph');
    setBootstrapPhase('done');
  }, [bootstrapPhase, setActiveTab]);

  // Reset bootstrap when scope changes so it re-runs for the new workspace.
  useEffect(() => {
    bootstrappedScopeRef.current = null;
    setBootstrapPhase('idle');
  }, [scopeKey]);

  // Auto-open the memories sheet when a pending fact intent arrives
  // (e.g. from Global Search deep-linking a memory fact).
  // Only open if the intent belongs to the current workspace scope.
  useEffect(() => {
    if (pendingFactIntent && pendingFactIntent.scopeKey === scopeKey) {
      setActiveSheetState('memories');
    }
  }, [pendingFactIntent, scopeKey]);

  const openSheet = useCallback(
    (sheet: MemoryDashboardSheet) => {
      setActiveSheetState(sheet);
      const tab = SHEET_TAB_MAP[sheet];
      if (tab) {
        setActiveTab(tab);
      }
    },
    [setActiveTab]
  );

  const closeSheet = useCallback(() => {
    setActiveSheetState('none');
    // Reset to neutral tab so tab-driven effects in useMemoryPageState
    // (search, graph debounce) stop running while no sheet is visible.
    setActiveTab('overview');
  }, [setActiveTab]);

  return { activeSheet, openSheet, closeSheet } as const;
};
