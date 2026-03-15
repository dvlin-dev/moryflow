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

// Bootstrap phases: idle → facts (trigger loadFacts) → done (trigger loadGraph)
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
  // Track whether the user has already opened a sheet — if so, the bootstrap
  // should not override their tab selection when the overview loads later.
  const activeSheetRef = useRef<MemoryDashboardSheet>('none');

  // Phase 1: when memory becomes available (or scope changes), set tab to
  // 'facts' so the facts-loading effect in useMemoryPageState fires.
  // Skipped if a sheet is already open (user acted before overview loaded).
  useEffect(() => {
    if (
      !isAvailable ||
      bootstrappedScopeRef.current === scopeKey ||
      activeSheetRef.current !== 'none'
    ) {
      return;
    }
    bootstrappedScopeRef.current = scopeKey;
    setActiveTab('facts');
    setBootstrapPhase('facts');
  }, [isAvailable, scopeKey, setActiveTab]);

  // Phase 2: after the facts tab has been set, switch to 'graph' so the
  // graph-loading effect fires. Both datasets persist in React state.
  // Then reset to 'overview' so the tab state doesn't stay graph-pinned,
  // which would cause stale graph requests on subsequent scope changes.
  useEffect(() => {
    if (bootstrapPhase !== 'facts') return;
    setActiveTab('graph');
    setBootstrapPhase('done');
    // Reset to neutral tab after graph effect is triggered.
    // The graph-loading effect in useMemoryPageState fires synchronously
    // within this render cycle, so switching away is safe.
    const timer = window.setTimeout(() => setActiveTab('overview'), 0);
    return () => window.clearTimeout(timer);
  }, [bootstrapPhase, setActiveTab]);

  // Reset bootstrap when scope changes so it re-runs for the new workspace.
  useEffect(() => {
    bootstrappedScopeRef.current = null;
    setBootstrapPhase('idle');
  }, [scopeKey]);

  // Auto-open the memories sheet when a pending fact intent arrives
  // (e.g. from Global Search deep-linking a memory fact).
  useEffect(() => {
    if (pendingFactIntent) {
      setActiveSheetState('memories');
      activeSheetRef.current = 'memories';
    }
  }, [pendingFactIntent]);

  const openSheet = useCallback(
    (sheet: MemoryDashboardSheet) => {
      setActiveSheetState(sheet);
      activeSheetRef.current = sheet;
      const tab = SHEET_TAB_MAP[sheet];
      if (tab) {
        setActiveTab(tab);
      }
    },
    [setActiveTab]
  );

  const closeSheet = useCallback(() => {
    setActiveSheetState('none');
    activeSheetRef.current = 'none';
  }, []);

  return { activeSheet, openSheet, closeSheet } as const;
};
