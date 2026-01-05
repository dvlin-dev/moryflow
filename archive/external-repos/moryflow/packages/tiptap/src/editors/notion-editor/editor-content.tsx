"use client"

import { EditorContent as TiptapEditorContent } from "@tiptap/react"

import { useTiptapEditor } from "../../hooks/use-tiptap-editor"
import { useUiEditorState } from "../../hooks/use-ui-editor-state"
import { EmojiDropdownMenu } from "../../ui/emoji-dropdown-menu"
import { MentionDropdownMenu } from "../../ui/mention-dropdown-menu"
import { SlashDropdownMenu } from "../../ui/slash-dropdown-menu"
import { FloatingToolbar } from "../../ui/floating-toolbar"
import { MobileToolbar } from "../../ui/mobile-toolbar"

import type { EditorContentProps } from "./types"

/**
 * 编辑器内容区域
 *
 * 职责：
 * - 渲染 Tiptap EditorContent
 * - 渲染核心 dropdown 菜单（Emoji、Mention、Slash）
 * - 条件渲染工具栏
 * - 通过 children 接收业务层注入的额外组件
 */
export function EditorContentArea({
  hideFloatingToolbar = false,
  hideMobileToolbar = false,
  floatingToolbarHideWhen,
  children,
}: EditorContentProps) {
  const { editor } = useTiptapEditor()
  const { isDragging } = useUiEditorState(editor)

  if (!editor) {
    return null
  }

  return (
    <TiptapEditorContent
      editor={editor}
      role="presentation"
      className="notion-editor-content"
      style={{
        cursor: isDragging ? "grabbing" : undefined,
      }}
    >
      {/* 核心 dropdown 菜单 */}
      <EmojiDropdownMenu />
      <MentionDropdownMenu />
      <SlashDropdownMenu />

      {/* 浮动工具栏 */}
      {!hideFloatingToolbar && (
        <FloatingToolbar hideWhen={floatingToolbarHideWhen} />
      )}

      {/* 移动端工具栏 */}
      {!hideMobileToolbar && <MobileToolbar />}

      {/* 业务层注入的组件 */}
      {children}
    </TiptapEditorContent>
  )
}
