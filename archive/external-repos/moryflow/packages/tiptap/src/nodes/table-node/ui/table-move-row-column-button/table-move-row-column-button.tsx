"use client"

import { forwardRef, useCallback } from "react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseTableMoveRowColumnConfig } from "../table-move-row-column-button"
import { useTableMoveRowColumn } from "../table-move-row-column-button"

// --- UI Primitives ---
import type { ButtonProps } from "../../../../ui-primitive/button"
import { Button } from "../../../../ui-primitive/button"

export interface TableMoveRowColumnButtonProps
  extends Omit<ButtonProps, "type">,
    UseTableMoveRowColumnConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
}

/**
 * Button component for moving a table row/column in a Tiptap editor.
 *
 * Supports moving:
 * - Rows up or down
 * - Columns left or right
 *
 * For custom button implementations, use the `useTableMoveRowColumn` hook instead.
 *
 * @example
 * ```tsx
 * // Move row up
 * <TableMoveRowColumnButton
 *   index={0}
 *   orientation="row"
 *   direction="up"
 * />
 *
 * // Move column right
 * <TableMoveRowColumnButton
 *   index={2}
 *   orientation="column"
 *   direction="right"
 *   hideWhenUnavailable={true}
 *   onMoved={() => console.log("Column moved!")}
 * />
 * ```
 */
export const TableMoveRowColumnButton = forwardRef<
  HTMLButtonElement,
  TableMoveRowColumnButtonProps
>(
  (
    {
      editor: providedEditor,
      index,
      orientation,
      direction,
      hideWhenUnavailable = false,
      onMoved,
      text,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const { isVisible, handleMove, label, canMoveRowColumn, Icon } =
      useTableMoveRowColumn({
        editor,
        index,
        orientation,
        direction,
        hideWhenUnavailable,
        onMoved,
      })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleMove()
      },
      [handleMove, onClick]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        disabled={!canMoveRowColumn}
        data-style="ghost"
        data-active-state="off"
        data-disabled={!canMoveRowColumn}
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

TableMoveRowColumnButton.displayName = "TableMoveRowColumnButton"
