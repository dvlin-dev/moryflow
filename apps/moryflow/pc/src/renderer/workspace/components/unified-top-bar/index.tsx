/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: 统一顶部栏，横跨整个窗口宽度
 */

import {
  SIDEBAR_MIN_WIDTH,
  TOP_BAR_ACTIONS_WIDTH,
  TRAFFIC_LIGHTS_WIDTH,
  SIDEBAR_TOGGLE_WIDTH,
} from './const';
import { SidebarToggle } from './components/sidebar-toggle';
import { TabList } from './components/tab-list';
import { TopBarActions } from './components/top-bar-actions';
import { useWorkspaceDoc, useWorkspaceNav, useWorkspaceShell } from '../../context';

export const UnifiedTopBar = () => {
  const { destination, sidebarMode } = useWorkspaceNav();
  const { sidebarCollapsed, sidebarWidth, toggleSidebarPanel, openSettings } = useWorkspaceShell();
  const { openTabs, activeDoc, selectedFile, saveState, selectTab, closeTab } = useWorkspaceDoc();

  const showTabs = destination === 'agent' && sidebarMode === 'home';
  const tabs = showTabs ? openTabs : [];
  const activePath = showTabs ? (activeDoc?.path ?? selectedFile?.path ?? null) : null;

  // 左侧区域宽度：与侧边栏对齐，收起时使用最小宽度
  const leftWidth = sidebarCollapsed
    ? TRAFFIC_LIGHTS_WIDTH + SIDEBAR_TOGGLE_WIDTH
    : Math.max(sidebarWidth, SIDEBAR_MIN_WIDTH);

  return (
    <header className="window-drag-region flex h-10 w-full shrink-0 items-center">
      {/* 左侧区域：与侧边栏宽度对齐 */}
      <div
        className="flex shrink-0 items-center justify-between"
        style={{ width: leftWidth, paddingLeft: TRAFFIC_LIGHTS_WIDTH }}
      >
        <div className="window-no-drag">
          <SidebarToggle collapsed={sidebarCollapsed} onToggle={toggleSidebarPanel} />
        </div>
      </div>

      {/* Tab 列表区域 - 填充剩余空间 */}
      <div className="flex min-w-0 flex-1 items-center overflow-hidden px-3">
        <TabList
          tabs={tabs}
          activePath={activePath}
          saveState={saveState}
          onSelect={selectTab}
          onClose={closeTab}
        />
      </div>

      <div
        className="flex shrink-0 items-center justify-end px-2"
        style={{ width: TOP_BAR_ACTIONS_WIDTH }}
      >
        <TopBarActions onOpenSettings={() => openSettings('account')} />
      </div>
    </header>
  );
};

export { SIDEBAR_MIN_WIDTH } from './const';
