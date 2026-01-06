"use client"

import { forwardRef, useCallback } from "react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseTableMergeSplitCellConfig } from "../table-merge-split-cell-button"
import { useTableMergeSplitCell } from "../table-merge-split-cell-button"

// --- UI Primitives ---
import type { ButtonProps } from "../../../../ui-primitive/button"
import { Button } from "../../../../ui-primitive/button"

export interface TableMergeSplitCellButtonProps
  extends Omit<ButtonProps, "type">,
    UseTableMergeSplitCellConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
}

/**
 * Button component for merging or splitting table cells in a Tiptap editor.
 *
 * **Merge Cells**: When multiple cells are selected (using CellSelection),
 * this button will merge them into a single cell.
 *
 * **Split Cell**: When a merged cell is selected, this button will split
 * it back into individual cells.
 *
 * For custom button implementations, use the `useTableMergeSplitCell` hook instead.
 *
 * @example
 * ```tsx
 * // Merge cells button
 * <TableMergeSplitCellButton
 *   action="merge"
 *   hideWhenUnavailable={true}
 * />
 *
 * // Split cell button
 * <TableMergeSplitCellButton
 *   action="split"
 *   text="Split Cell"
 *   onExecuted={(action) => console.log(`${action} completed!`)}
 * />
 *
 * // Custom styling
 * <TableMergeSplitCellButton
 *   action="merge"
 *   className="my-custom-merge-button"
 *   style={{ backgroundColor: 'blue' }}
 * />
 * ```
 */
export const TableMergeSplitCellButton = forwardRef<
  HTMLButtonElement,
  TableMergeSplitCellButtonProps
>(
  (
    {
      editor: providedEditor,
      action,
      hideWhenUnavailable = false,
      onExecuted,
      text,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const { isVisible, handleExecute, label, canExecute, Icon } =
      useTableMergeSplitCell({
        editor,
        action,
        hideWhenUnavailable,
        onExecuted,
      })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleExecute()
      },
      [handleExecute, onClick]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        disabled={!canExecute}
        data-style="ghost"
        data-active-state="off"
        data-disabled={!canExecute}
        role="button"
        tabIndex={-1}
        aria-label={label}
        aria-pressed={false}
        tooltip={label}
        onClick={handleClick}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <Icon className="tiptap-button-icon" />
            {text && <span className="tiptap-button-text">{text}</span>}
          </>
        )}
      </Button>
    )
  }
)

TableMergeSplitCellButton.displayName = "TableMergeSplitCellButton"
