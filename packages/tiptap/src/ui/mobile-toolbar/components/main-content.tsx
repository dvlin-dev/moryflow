"use client"

import {
  ToolbarGroup,
  ToolbarSeparator,
} from "../../../ui-primitive/toolbar"
import { SlashCommandTriggerButton } from "../../slash-command-trigger-button"
import { ImproveDropdown } from "../../improve-dropdown"
import { ImageUploadButton } from "../../image-upload-button"
import { MoveNodeButton } from "../../move-node-button"
import { ImageNodeFloating } from "../../../nodes/image-node/image-node-floating"

import type { MainToolbarContentProps } from "../types"
import { hasTextSelection } from "../use-toolbar-state"
import { AlignmentGroup, FormattingGroup, ScriptGroup } from "./groups"
import { ToolbarViewsGroup } from "./toolbar-views"
import { MoreActionsDropdown } from "./dropdown-actions"

/**
 * 主工具栏内容
 */
export function MainToolbarContent({
  editor,
  isMobile,
  toolbarViews,
  onViewChange,
}: MainToolbarContentProps) {
  const hasSelection = hasTextSelection(editor)
  const hasContent = (editor?.getText().length ?? 0) > 0

  return (
    <>
      <ToolbarGroup>
        <SlashCommandTriggerButton />
        <MoreActionsDropdown editor={editor} />

        <ToolbarSeparator />
      </ToolbarGroup>

      {(hasSelection || hasContent) && (
        <>
          <ToolbarGroup>
            <ImproveDropdown portal hideWhenUnavailable />
          </ToolbarGroup>

          <ToolbarSeparator />

          <FormattingGroup />

          <ToolbarViewsGroup
            toolbarViews={toolbarViews}
            isMobile={isMobile}
            onViewChange={onViewChange}
            editor={editor}
          />

          <ImageNodeFloating />

          <ScriptGroup />

          <AlignmentGroup />

          <ToolbarGroup>
            <ImageUploadButton text="Add" />
            <ToolbarSeparator />
          </ToolbarGroup>
        </>
      )}

      <ToolbarGroup>
        <MoveNodeButton direction="down" />
        <MoveNodeButton direction="up" />
      </ToolbarGroup>
    </>
  )
}
