/**
 * [PROPS]: SidebarHeaderProps
 * [EMITS]: onModeChange(mode), onSearch()
 * [POS]: Sidebar 顶部 Header（左侧 Home/Chat，右侧 Search）
 */

import type { SidebarMode } from '@/workspace/navigation/state';
import { SIDEBAR_GUTTER_X_CLASS } from '../const';
import { SidebarModeTabs } from './sidebar-mode-tabs';
import { SidebarSearchAction } from './sidebar-search-action';

type SidebarHeaderProps = {
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
  onSearch: () => void;
};

export const SidebarHeader = ({ mode, onModeChange, onSearch }: SidebarHeaderProps) => {
  return (
    <div className={`flex items-center justify-between gap-2 pt-2 ${SIDEBAR_GUTTER_X_CLASS}`}>
      <SidebarModeTabs mode={mode} onChange={onModeChange} />
      <SidebarSearchAction onClick={onSearch} />
    </div>
  );
};
