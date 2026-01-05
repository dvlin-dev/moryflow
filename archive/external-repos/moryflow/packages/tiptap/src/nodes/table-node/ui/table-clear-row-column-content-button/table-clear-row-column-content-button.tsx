import { forwardRef, useCallback } from "react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseTableClearRowColumnContentConfig } from "../table-clear-row-column-content-button"
import { useTableClearRowColumnContent } from "../table-clear-row-column-content-button"

// --- UI Primitives ---
import type { ButtonProps } from "../../../../ui-primitive/button"
import { Button } from "../../../../ui-primitive/button"

export interface TableClearRowColumnContentButtonProps
  extends Omit<ButtonProps, "type">,
    UseTableClearRowColumnContentConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
}

/**
 * Button component for clearing table row/column content in a Tiptap editor.
 *
 * For custom button implementations, use the `useTableClearRowColumnContent` hook instead.
 */
export const TableClearRowColumnContentButton = forwardRef<
  HTMLButtonElement,
  TableClearRowColumnContentButtonProps
>(
  (
    {
      editor: providedEditor,
      index,
      orientation,
      hideWhenUnavailable = false,
      resetAttrs = false,
      onCleared,
      text,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const { isVisible, handleClear, label, canClearRowColumnContent, Icon } =
      useTableClearRowColumnContent({
        editor,
        index,
        orientation,
        hideWhenUnavailable,
        resetAttrs,
        onCleared,
      })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleClear()
      },
      [handleClear, onClick]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        disabled={!canClearRowColumnContent}
        data-style="ghost"
        data-active-state="off"
        data-disabled={!canClearRowColumnContent}
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

TableClearRowColumnContentButton.displayName =
  "TableClearRowColumnContentButton"
