"use client"

import { useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"

import { useTiptapEditor } from "../../hooks/use-tiptap-editor"
import type { Mark } from "../mark-button"
import { canToggleMark, MarkButton } from "../mark-button"
import type { TextAlign } from "../text-align-button"
import { canSetTextAlign, TextAlignButton } from "../text-align-button"
import { Button } from "../../ui-primitive/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui-primitive/popover"
import {
  ToolbarGroup,
  ToolbarSeparator,
} from "../../ui-primitive/toolbar"
import { MoreVerticalIcon } from "@moryflow/ui/icons/more-vertical-icon"

import type { MoreOptionsProps } from "./types"

/**
 * 检查是否有可用的 more options
 */
function canMoreOptions(editor: Editor | null): boolean {
  if (!editor) return false

  const canTextAlignAny = (["left", "center", "right", "justify"] as const).some(
    (align) => canSetTextAlign(editor, align as TextAlign)
  )

  const canMarkAny = (["superscript", "subscript"] as const).some((type) =>
    canToggleMark(editor, type as Mark)
  )

  return canMarkAny || canTextAlignAny
}

/**
 * 判断 MoreOptions 是否应该显示
 */
function shouldShowMoreOptions(params: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const { editor, hideWhenUnavailable } = params

  if (!editor?.isEditable) return false

  if (hideWhenUnavailable && !editor.isActive("code")) {
    return canMoreOptions(editor)
  }

  return true
}

/**
 * 更多选项弹出框，包含对齐和上下标等不常用功能
 */
export function MoreOptions({
  editor: providedEditor,
  hideWhenUnavailable = false,
}: MoreOptionsProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      setShow(shouldShowMoreOptions({ editor, hideWhenUnavailable }))
    }

    handleSelectionUpdate()
    editor.on("selectionUpdate", handleSelectionUpdate)

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, hideWhenUnavailable])

  if (!show) {
    return null
  }

  return (
    <>
      <ToolbarSeparator />
      <ToolbarGroup>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              data-style="ghost"
              role="button"
              tabIndex={-1}
              tooltip="More options"
            >
              <MoreVerticalIcon className="tiptap-button-icon" />
            </Button>
          </PopoverTrigger>

          <PopoverContent side="top" align="end" alignOffset={4} sideOffset={4}>
            <ToolbarGroup>
              <MarkButton type="superscript" />
              <MarkButton type="subscript" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <TextAlignButton align="left" />
              <TextAlignButton align="center" />
              <TextAlignButton align="right" />
              <TextAlignButton align="justify" />
            </ToolbarGroup>
          </PopoverContent>
        </Popover>
      </ToolbarGroup>
    </>
  )
}
