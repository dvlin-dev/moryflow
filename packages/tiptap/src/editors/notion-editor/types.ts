import type { Editor } from "@tiptap/react"
import type { ReactNode } from "react"

/**
 * EditorRoot 组件属性
 */
export interface EditorRootProps {
  /**
   * Tiptap editor 实例（由业务层创建并传入）
   */
  editor: Editor
  /**
   * 子组件
   */
  children: ReactNode
  /**
   * 自定义类名
   */
  className?: string
}

/**
 * EditorContent 组件属性
 */
export interface EditorContentProps {
  /**
   * 是否隐藏浮动工具栏
   * @default false
   */
  hideFloatingToolbar?: boolean
  /**
   * 是否隐藏移动端工具栏
   * @default false
   */
  hideMobileToolbar?: boolean
  /**
   * 浮动工具栏的额外隐藏条件
   * 用于业务层控制（如 AI 激活时隐藏）
   */
  floatingToolbarHideWhen?: boolean
  /**
   * 子组件（业务层注入的额外 UI，如 Table Handle、AI Menu 等）
   */
  children?: ReactNode
}
