import { forwardRef, useCallback } from "react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseTableDuplicateRowColumnConfig } from "../table-duplicate-row-column-button"
import { useTableDuplicateRowColumn } from "../table-duplicate-row-column-button"

// --- UI Primitives ---
import type { ButtonProps } from "../../../../ui-primitive/button"
import { Button } from "../../../../ui-primitive/button"

export interface TableDuplicateRowColumnButtonProps
  extends Omit<ButtonProps, "type">,
    UseTableDuplicateRowColumnConfig {
  text?: string
}

export const TableDuplicateRowColumnButton = forwardRef<
  HTMLButtonElement,
  TableDuplicateRowColumnButtonProps
>(
  (
    {
      editor: providedEditor,
      index,
      orientation,
      tablePos,
      hideWhenUnavailable = false,
      onDuplicated,
      text,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const { isVisible, handleDuplicate, label, canDuplicateRowColumn, Icon } =
      useTableDuplicateRowColumn({
        editor,
        index,
        orientation,
        tablePos,
        hideWhenUnavailable,
        onDuplicated,
      })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleDuplicate()
      },
      [handleDuplicate, onClick]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        disabled={!canDuplicateRowColumn}
        data-style="ghost"
        data-active-state="off"
        data-disabled={!canDuplicateRowColumn}
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

TableDuplicateRowColumnButton.displayName = "TableDuplicateRowColumnButton"
