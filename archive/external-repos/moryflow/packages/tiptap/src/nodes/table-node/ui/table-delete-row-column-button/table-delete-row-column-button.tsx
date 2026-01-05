import { forwardRef, useCallback } from "react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseTableDeleteRowColumnConfig } from "../table-delete-row-column-button"
import { useTableDeleteRowColumn } from "../table-delete-row-column-button"

// --- UI Primitives ---
import type { ButtonProps } from "../../../../ui-primitive/button"
import { Button } from "../../../../ui-primitive/button"

export interface TableDeleteRowColumnButtonProps
  extends Omit<ButtonProps, "type">,
    UseTableDeleteRowColumnConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
}

/**
 * Button component for deleting a table row/column in a Tiptap editor.
 *
 * For custom button implementations, use the `useTableDeleteRowColumn` hook instead.
 */
export const TableDeleteRowColumnButton = forwardRef<
  HTMLButtonElement,
  TableDeleteRowColumnButtonProps
>(
  (
    {
      editor: providedEditor,
      index,
      orientation,
      tablePos,
      hideWhenUnavailable = false,
      onDeleted,
      text,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const { isVisible, handleDelete, label, canDeleteRowColumn, Icon } =
      useTableDeleteRowColumn({
        editor,
        index,
        orientation,
        tablePos,
        hideWhenUnavailable,
        onDeleted,
      })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleDelete()
      },
      [handleDelete, onClick]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        disabled={!canDeleteRowColumn}
        data-style="ghost"
        data-active-state="off"
        data-disabled={!canDeleteRowColumn}
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

TableDeleteRowColumnButton.displayName = "TableDeleteRowColumnButton"
