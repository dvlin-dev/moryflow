/**
 * [DEFINES]: UnifiedTopBar 相关类型定义
 * [USED_BY]: UnifiedTopBar
 * [POS]: 统一顶部栏组件类型定义
 */

import type { SaveState, SelectedFile } from '@/workspace/const'

/** 侧边栏最小宽度（像素） */
export const SIDEBAR_MIN_WIDTH = 180

/** macOS 红绿灯区域宽度（像素） */
export const TRAFFIC_LIGHTS_WIDTH = 76

/** 侧边栏切换按钮区域宽度（像素） */
export const SIDEBAR_TOGGLE_WIDTH = 40

export type UnifiedTopBarProps = {
  tabs: SelectedFile[]
  activePath: string | null
  saveState: SaveState
  sidebarCollapsed: boolean
  /** 侧边栏当前宽度（像素） */
  sidebarWidth: number
  onToggleSidebar: () => void
  onSelectTab: (tab: SelectedFile) => void
  onCloseTab: (path: string) => void
}
