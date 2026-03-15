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
};

export const useMemoryDashboard = ({
  setActiveTab,
  isAvailable,
  pendingFactIntent,
}: UseMemoryDashboardOptions) => {
  const [activeSheet, setActiveSheetState] = useState<MemoryDashboardSheet>('none');
  const bootstrappedRef = useRef(false);

  // Bootstrap: trigger fact + graph loading by cycling the active tab.
  // Both datasets persist in React state after their respective effects fire.
  // Only runs when memory is available to avoid unnecessary failing IPC calls.
  useEffect(() => {
    if (!isAvailable || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    setActiveTab('facts');
    const timer = window.setTimeout(() => setActiveTab('graph'), 0);
    return () => window.clearTimeout(timer);
  }, [isAvailable, setActiveTab]);

  // Auto-open the memories sheet when a pending fact intent arrives
  // (e.g. from Global Search deep-linking a memory fact).
  useEffect(() => {
    if (pendingFactIntent) {
      setActiveSheetState('memories');
    }
  }, [pendingFactIntent]);

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
  }, []);

  return { activeSheet, openSheet, closeSheet } as const;
};
