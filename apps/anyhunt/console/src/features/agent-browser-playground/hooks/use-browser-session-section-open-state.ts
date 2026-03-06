/**
 * [PROVIDES]: useBrowserSessionSectionOpenState - Browser Session 分区展开状态容器
 * [DEPENDS]: browser-session-section-config
 * [POS]: BrowserSessionPanel 的 section open 状态编排
 */

import { useCallback, useState } from 'react';
import {
  defaultBrowserSessionSectionOpenState,
  type BrowserSessionSection,
} from '../browser-session-section-config';

export function useBrowserSessionSectionOpenState() {
  const [sectionOpenState, setSectionOpenState] = useState(() => ({
    ...defaultBrowserSessionSectionOpenState,
  }));

  const getSectionOpenState = useCallback(
    (section: BrowserSessionSection) => sectionOpenState[section],
    [sectionOpenState]
  );

  const setSectionOpenStateByKey = useCallback((section: BrowserSessionSection, open: boolean) => {
    setSectionOpenState((prev) => ({ ...prev, [section]: open }));
  }, []);

  return {
    getSectionOpenState,
    setSectionOpenStateByKey,
  };
}
