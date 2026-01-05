"use client"

import { useTiptapEditor } from "../../hooks/use-tiptap-editor"
import { useIsBreakpoint } from "../../hooks/use-is-breakpoint"
import { useFloatingToolbarVisibility } from "../../hooks/use-floating-toolbar-visibility"
import { isSelectionValid } from "../../utils/tiptap-collab-utils"

import { ImageNodeFloating } from "../../nodes/image-node/image-node-floating"
import { ColorTextPopover } from "../color-text-popover"
import { ImproveDropdown } from "../improve-dropdown"
import { LinkPopover } from "../link-popover"
import { MarkButton } from "../mark-button"
import { TurnIntoDropdown } from "../turn-into-dropdown"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "../../ui-primitive/toolbar"
import { FloatingElement } from "../../ui-utils/floating-element"

import { MoreOptions } from "./more-options"
import type { FloatingToolbarProps } from "./types"

/**
 * 浮动工具栏 - 文本选中时显示
 *
 * 纯 UI 组件，不包含业务逻辑。
 * 通过 hideWhen prop 可以让业务层控制额外的隐藏条件。
 */
export function FloatingToolbar({
  editor: providedEditor,
  hideWhen,
}: FloatingToolbarProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const isMobile = useIsBreakpoint("max", 480)

  const { shouldShow } = useFloatingToolbarVisibility({
    editor,
    isSelectionValid,
  })

  // 移动端不显示浮动工具栏（使用 MobileToolbar）
  if (isMobile || hideWhen || !shouldShow) {
    return null
  }

  return (
    <FloatingElement shouldShow={shouldShow}>
      <Toolbar variant="floating">
        {/* AI 改写 */}
        <ToolbarGroup>
          <ImproveDropdown hideWhenUnavailable />
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* 块类型转换 */}
        <ToolbarGroup>
          <TurnIntoDropdown hideWhenUnavailable />
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* 文本格式 */}
        <ToolbarGroup>
          <MarkButton type="bold" hideWhenUnavailable />
          <MarkButton type="italic" hideWhenUnavailable />
          <MarkButton type="underline" hideWhenUnavailable />
          <MarkButton type="strike" hideWhenUnavailable />
          <MarkButton type="code" hideWhenUnavailable />
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* 图片 */}
        <ToolbarGroup>
          <ImageNodeFloating />
        </ToolbarGroup>

        {/* 链接和颜色 */}
        <ToolbarGroup>
          <LinkPopover autoOpenOnLinkActive={false} hideWhenUnavailable />
          <ColorTextPopover hideWhenUnavailable />
        </ToolbarGroup>

        {/* 更多选项 */}
        <MoreOptions hideWhenUnavailable />
      </Toolbar>
    </FloatingElement>
  )
}
