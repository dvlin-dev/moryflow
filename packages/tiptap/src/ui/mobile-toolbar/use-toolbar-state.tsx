"use client"

import { useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"

import {
  ColorHighlightPopover,
  ColorHighlightPopoverButton,
  ColorHighlightPopoverContent,
} from "../color-highlight-popover"
import {
  canSetLink,
  LinkButton,
  LinkContent,
  LinkPopover,
} from "../link-popover"
import { canColorHighlight } from "../color-highlight-button"
import { HighlighterIcon } from "@aiget/ui/icons/highlighter-icon"
import { LinkIcon } from "@aiget/ui/icons/link-icon"

import type { ToolbarState, ToolbarViewId, ToolbarViewRegistry } from "./types"
import { TOOLBAR_VIEWS } from "./types"

/**
 * 管理工具栏视图状态的 hook
 */
export function useToolbarState(isMobile: boolean): ToolbarState {
  const [viewId, setViewId] = useState<ToolbarViewId>(TOOLBAR_VIEWS.MAIN)

  // 非移动端时自动切回主视图
  useEffect(() => {
    if (!isMobile && viewId !== TOOLBAR_VIEWS.MAIN) {
      setViewId(TOOLBAR_VIEWS.MAIN)
    }
  }, [isMobile, viewId])

  return {
    viewId,
    setViewId,
    isMainView: viewId === TOOLBAR_VIEWS.MAIN,
    showMainView: () => setViewId(TOOLBAR_VIEWS.MAIN),
    showView: (id: ToolbarViewId) => setViewId(id),
  }
}

/**
 * 检查编辑器是否有文本选中
 */
export function hasTextSelection(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  return !editor.state.selection.empty
}

/**
 * 创建工具栏视图注册表
 * 使用 render 函数模式实现惰性 JSX 创建
 */
export function createToolbarViewRegistry(): ToolbarViewRegistry {
  return {
    [TOOLBAR_VIEWS.HIGHLIGHTER]: {
      id: TOOLBAR_VIEWS.HIGHLIGHTER,
      title: "Text Highlighter",
      renderIcon: () => <HighlighterIcon className="tiptap-button-icon" />,
      renderContent: () => <ColorHighlightPopoverContent />,
      mobileButton: (onClick: () => void) => (
        <ColorHighlightPopoverButton onClick={onClick} />
      ),
      renderDesktopComponent: () => <ColorHighlightPopover />,
      shouldShow(editor) {
        return canColorHighlight(editor)
      },
    },
    [TOOLBAR_VIEWS.LINK]: {
      id: TOOLBAR_VIEWS.LINK,
      title: "Link Editor",
      renderIcon: () => <LinkIcon className="tiptap-button-icon" />,
      renderContent: () => <LinkContent />,
      mobileButton: (onClick: () => void) => <LinkButton onClick={onClick} />,
      renderDesktopComponent: () => <LinkPopover />,
      shouldShow(editor) {
        return canSetLink(editor)
      },
    },
  }
}
