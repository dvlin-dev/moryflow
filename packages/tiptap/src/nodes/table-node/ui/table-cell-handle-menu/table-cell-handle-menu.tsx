"use client"

import { forwardRef, useCallback, useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Lib ---
import { cn, SR_ONLY } from "../../../../utils/tiptap-utils"

// --- UI ---
import { ColorMenu } from "../../../../ui/color-menu"
import { TableAlignMenu } from "../table-alignment-menu"
import { useTableClearRowColumnContent } from "../table-clear-row-column-content-button"
import { useTableMergeSplitCell } from "../table-merge-split-cell-button"

// --- UI Primitives ---
import { Button } from "../../../../ui-primitive/button"
import { Combobox, ComboboxList } from "../../../../ui-primitive/combobox"
import {
  Menu,
  MenuButton,
  MenuContent,
  MenuGroup,
  MenuItem,
} from "../../../../ui-primitive/menu"
import { Separator } from "../../../../ui-primitive/separator"

// --- Icons ---
import { Grip4Icon } from "@aiget/ui/icons/grip-4-icon"

import "./table-cell-handle-menu.scss"

interface TableAction {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  onClick: () => void
  isAvailable: boolean
  isActive?: boolean
  shortcutBadge?: React.ReactNode
}

/**
 * Hook to manage all table actions and their availability
 */
function useTableActions() {
  const mergeCellAction = useTableMergeSplitCell({ action: "merge" })
  const splitCellAction = useTableMergeSplitCell({ action: "split" })
  const clearContentAction = useTableClearRowColumnContent({ resetAttrs: true })

  const mergeAction: TableAction = {
    icon: mergeCellAction.Icon,
    label: mergeCellAction.label,
    onClick: mergeCellAction.handleExecute,
    isAvailable: mergeCellAction.canExecute,
  }

  const splitAction: TableAction = {
    icon: splitCellAction.Icon,
    label: splitCellAction.label,
    onClick: splitCellAction.handleExecute,
    isAvailable: splitCellAction.canExecute,
  }

  const clearAction: TableAction = {
    icon: clearContentAction.Icon,
    label: clearContentAction.label,
    onClick: clearContentAction.handleClear,
    isAvailable: clearContentAction.canClearRowColumnContent,
  }

  return {
    mergeAction,
    splitAction,
    clearAction,
  }
}

/**
 * Hook to manage table handle menu state and interactions
 */
function useTableCellHandleMenu({ editor }: { editor: Editor | null }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
    editor?.commands.unfreezeHandles()
  }, [editor])

  const handleMenuToggle = useCallback(
    (isOpen: boolean) => {
      setIsMenuOpen(isOpen)

      if (!editor) return

      if (isOpen) {
        editor.commands.freezeHandles()
      } else {
        editor.commands.unfreezeHandles()
      }
    },
    [editor]
  )

  return {
    isMenuOpen,
    handleMenuToggle,
    closeMenu,
  }
}

const TableActionItem = ({ action }: { action: TableAction }) => {
  const { icon: Icon, label, onClick, isActive = false, shortcutBadge } = action

  return (
    <MenuItem
      render={
        <Button
          data-style="ghost"
          data-active-state={isActive ? "on" : "off"}
        />
      }
      onClick={onClick}
    >
      <Icon className="tiptap-button-icon" />
      <span className="tiptap-button-text">{label}</span>
      {shortcutBadge}
    </MenuItem>
  )
}

const TableActionMenu = ({ onClose }: { onClose: () => void }) => {
  const { mergeAction, splitAction, clearAction } = useTableActions()

  const hasMergeOrSplit = mergeAction.isAvailable || splitAction.isAvailable

  return (
    <MenuContent autoFocusOnShow modal onClose={onClose}>
      <Combobox style={SR_ONLY} />
      <ComboboxList style={{ minWidth: "15rem" }}>
        {hasMergeOrSplit && (
          <MenuGroup>
            {mergeAction.isAvailable && (
              <TableActionItem action={mergeAction} />
            )}
            {splitAction.isAvailable && (
              <TableActionItem action={splitAction} />
            )}
            <Separator orientation="horizontal" />
          </MenuGroup>
        )}

        <MenuGroup>
          <ColorMenu />
          <TableAlignMenu />
          {clearAction.isAvailable && <TableActionItem action={clearAction} />}
        </MenuGroup>
      </ComboboxList>
    </MenuContent>
  )
}

interface TableCellHandleMenuProps
  extends React.ComponentPropsWithoutRef<"button"> {
  editor?: Editor | null
  onOpenChange?: (isOpen: boolean) => void
}

export const TableCellHandleMenu = forwardRef<
  HTMLButtonElement,
  TableCellHandleMenuProps
>(({ editor: providedEditor, onOpenChange, className, ...props }, ref) => {
  const { editor } = useTiptapEditor(providedEditor)
  const { isMenuOpen, handleMenuToggle, closeMenu } = useTableCellHandleMenu({
    editor,
  })

  useEffect(() => {
    onOpenChange?.(isMenuOpen)
  }, [isMenuOpen, onOpenChange])

  return (
    <Menu
      open={isMenuOpen}
      onOpenChange={handleMenuToggle}
      placement="bottom-start"
      trigger={
        <MenuButton
          ref={ref}
          className={cn(
            "expandable-menu-button",
            isMenuOpen && "menu-opened",
            className
          )}
          aria-label="Table cells option"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          {...props}
        >
          <Grip4Icon className="tiptap-button-icon" />
        </MenuButton>
      }
    >
      <TableActionMenu onClose={closeMenu} />
    </Menu>
  )
})

TableCellHandleMenu.displayName = "TableCellHandleMenu"

export { TableActionMenu }
