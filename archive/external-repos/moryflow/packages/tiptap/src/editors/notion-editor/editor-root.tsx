"use client"

import { EditorContext } from "@tiptap/react"
import { cn } from "../../utils/tiptap-utils"

import type { EditorRootProps } from "./types"

/**
 * 编辑器根容器
 *
 * 职责：
 * - 提供 EditorContext
 * - 渲染最外层容器
 *
 * 不包含任何业务逻辑，Editor 实例由业务层创建并传入。
 */
export function EditorRoot({ editor, children, className }: EditorRootProps) {
  return (
    <div
      className={cn(
        "notion-editor-root h-full w-full overflow-hidden bg-background",
        className
      )}
    >
      <EditorContext.Provider value={{ editor }}>
        {children}
      </EditorContext.Provider>
    </div>
  )
}
