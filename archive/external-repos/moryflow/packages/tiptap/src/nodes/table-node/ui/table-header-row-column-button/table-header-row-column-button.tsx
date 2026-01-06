"use client"

import { forwardRef, useCallback } from "react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseTableHeaderRowColumnConfig } from "../table-header-row-column-button"
import { useTableHeaderRowColumn } from "../table-header-row-column-button"

// --- UI Primitives ---
import type { ButtonProps } from "../../../../ui-primitive/button"
import { Button } from "../../../../ui-primitive/button"

export interface TableHeaderRowColumnButtonProps
  extends Omit<ButtonProps, "type">,
    UseTableHeaderRowColumnConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
}

/**
 * Button component for toggling table header row/column in a Tiptap editor.
 * Only works for the first row (index 0) or first column (index 0).
 *
 * For custom button implementations, use the `useTableHeaderRowColumn` hook instead.
 */
export const TableHeaderRowColumnButton = forwardRef<
  HTMLButtonElement,
  TableHeaderRowColumnButtonProps
>(
  (
    {
      editor: providedEditor,
      index,
      orientation,
      hideWhenUnavailable = false,
      onToggled,
      text,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const { isVisible, handleToggle, label, canToggleHeader, Icon, isActive } =
      useTableHeaderRowColumn({
        editor,
        index,
        orientation,
        hideWhenUnavailable,
        onToggled,
      })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleToggle()
      },
      [handleToggle, onClick]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        disabled={!canToggleHeader}
        data-style="ghost"
        data-active-state={isActive ? "on" : "off"}
        data-disabled={!canToggleHeader}
        role="button"
        tabIndex={-1}
        aria-label={label}
        aria-pressed={isActive}
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

TableHeaderRowColumnButton.displayName = "TableHeaderRowColumnButton"
