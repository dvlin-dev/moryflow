import type { ReactNode } from "react"
import type { Editor } from "@tiptap/react"

// 工具栏视图 ID
export const TOOLBAR_VIEWS = {
  MAIN: "main",
  HIGHLIGHTER: "highlighter",
  LINK: "link",
} as const

export type ToolbarViewId = (typeof TOOLBAR_VIEWS)[keyof typeof TOOLBAR_VIEWS]

// 工具栏视图配置
// 使用 render 函数模式实现惰性创建，避免不必要的 JSX 实例化
export interface ToolbarViewType {
  id: string
  title: string
  /** 渲染图标 */
  renderIcon: () => ReactNode
  /** 渲染视图内容 */
  renderContent: () => ReactNode
  /** 移动端按钮渲染函数 */
  mobileButton?: (onClick: () => void) => ReactNode
  /** 桌面端组件渲染函数 */
  renderDesktopComponent?: () => ReactNode
  /** 是否应该显示 */
  shouldShow?: (editor: Editor | null) => boolean
}

export type ToolbarViewRegistry = Record<
  Exclude<ToolbarViewId, typeof TOOLBAR_VIEWS.MAIN>,
  ToolbarViewType
>

// 工具栏状态
export interface ToolbarState {
  viewId: ToolbarViewId
  setViewId: (id: ToolbarViewId) => void
  isMainView: boolean
  showMainView: () => void
  showView: (id: ToolbarViewId) => void
}

// 组件 Props
export interface MobileToolbarProps {
  editor?: Editor | null
}

export interface MainToolbarContentProps {
  editor: Editor | null
  isMobile: boolean
  toolbarViews: ToolbarViewRegistry
  onViewChange: (viewId: ToolbarViewId) => void
}

export interface SpecializedToolbarContentProps {
  view: ToolbarViewType
  onBack: () => void
}

export interface ToolbarViewButtonProps {
  view: ToolbarViewType
  isMobile: boolean
  onViewChange: (viewId: ToolbarViewId) => void
}

export interface ToolbarViewsGroupProps {
  toolbarViews: ToolbarViewRegistry
  isMobile: boolean
  onViewChange: (viewId: ToolbarViewId) => void
  editor: Editor | null
}

export interface DropdownMenuActionsProps {
  editor: Editor | null
}
