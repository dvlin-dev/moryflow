"use client"

import { useMemo, useRef } from "react"
import { createPortal } from "react-dom"

import { Toolbar } from "../../ui-primitive/toolbar"
import { useIsBreakpoint } from "../../hooks/use-is-breakpoint"
import { useWindowSize } from "../../hooks/use-window-size"
import { useTiptapEditor } from "../../hooks/use-tiptap-editor"
import { useCursorVisibility } from "../../hooks/use-cursor-visibility"

import type { MobileToolbarProps, ToolbarViewId, ToolbarViewRegistry } from "./types"
import { TOOLBAR_VIEWS } from "./types"
import { createToolbarViewRegistry, useToolbarState } from "./use-toolbar-state"
import { MainToolbarContent } from "./components/main-content"
import { SpecializedToolbarContent } from "./components/specialized-content"

/**
 * 移动端工具栏
 *
 * 固定在屏幕底部，跟随软键盘位置调整。
 * 支持主视图和专门视图（如高亮编辑、链接编辑）的切换。
 */
export function MobileToolbar({ editor: providedEditor }: MobileToolbarProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const isMobile = useIsBreakpoint("max", 480)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const toolbarState = useToolbarState(isMobile)

  const toolbarViews = useMemo<ToolbarViewRegistry>(
    () => createToolbarViewRegistry(),
    []
  )

  const currentView = toolbarState.isMainView
    ? null
    : toolbarViews[
        toolbarState.viewId as Exclude<ToolbarViewId, typeof TOOLBAR_VIEWS.MAIN>
      ]

  const { height } = useWindowSize()
  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  // 非移动端或编辑器不可编辑时不显示
  if (!isMobile || !editor || !editor.isEditable) {
    return null
  }

  const toolbar = (
    <Toolbar
      ref={toolbarRef}
      style={{
        bottom: `calc(100% - ${height - rect.y}px)`,
      }}
    >
      {toolbarState.isMainView ? (
        <MainToolbarContent
          editor={editor}
          isMobile={isMobile}
          toolbarViews={toolbarViews}
          onViewChange={toolbarState.showView}
        />
      ) : (
        currentView && (
          <SpecializedToolbarContent
            view={currentView}
            onBack={toolbarState.showMainView}
          />
        )
      )}
    </Toolbar>
  )

  // Portal 到 body 以避免层级问题
  // SSR 环境检查
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(toolbar, document.body)
}
