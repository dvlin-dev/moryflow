import { useCallback, useEffect, useState } from 'react';
import type { MemoryWorkbenchTab } from './memory-workbench-store';

export type MemoryDashboardSheet = 'none' | 'memories' | 'connections' | 'search' | 'workbench';

const SHEET_TAB_MAP: Partial<Record<MemoryDashboardSheet, MemoryWorkbenchTab>> = {
  memories: 'facts',
  connections: 'graph',
  search: 'search',
};

type UseMemoryDashboardOptions = {
  setActiveTab: (tab: MemoryWorkbenchTab) => void;
};

export const useMemoryDashboard = ({ setActiveTab }: UseMemoryDashboardOptions) => {
  const [activeSheet, setActiveSheetState] = useState<MemoryDashboardSheet>('none');

  // Bootstrap: trigger fact + graph loading by cycling the active tab.
  // Both datasets persist in React state after their respective effects fire.
  useEffect(() => {
    setActiveTab('facts');
    const timer = window.setTimeout(() => setActiveTab('graph'), 0);
    return () => window.clearTimeout(timer);
  }, [setActiveTab]);

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
