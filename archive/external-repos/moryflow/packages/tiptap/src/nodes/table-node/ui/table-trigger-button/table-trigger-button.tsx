"use client"

import { forwardRef } from "react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseTableTriggerButtonConfig } from "../table-trigger-button"
import { useTableTriggerButton } from "../table-trigger-button"

// --- Components ---
import { TableGridSelector } from "../table-trigger-button/table-grid-selector"

// --- UI Primitives ---
import type { ButtonProps } from "../../../../ui-primitive/button"
import { Button } from "../../../../ui-primitive/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../ui-primitive/popover"

// --- Styles ---
import { Card, CardBody } from "../../../../ui-primitive/card"

export interface TableTriggerButtonProps
  extends Omit<ButtonProps, "type">,
    UseTableTriggerButtonConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
}

/**
 * Button component for inserting tables in a Tiptap editor with a grid selector.
 *
 * For custom button implementations, use the `useTableTriggerButton` hook instead.
 *
 * @example
 * ```tsx
 * <TableTriggerButton
 *   editor={editor}
 *   hideWhenUnavailable={true}
 *   onInserted={(rows, cols) => console.log(`Inserted ${rows}x${cols} table`)}
 * />
 * ```
 */
export const TableTriggerButton = forwardRef<
  HTMLButtonElement,
  TableTriggerButtonProps
>(
  (
    {
      editor: providedEditor,
      hideWhenUnavailable = false,
      maxRows = 8,
      maxCols = 8,
      onInserted,
      text,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const {
      isVisible,
      canInsert,
      isOpen,
      setIsOpen,
      hoveredCell,
      handleCellHover,
      handleCellClick,
      resetHoveredCell,
      label,
      Icon,
    } = useTableTriggerButton({
      editor,
      hideWhenUnavailable,
      maxRows,
      maxCols,
      onInserted,
    })

    if (!isVisible) {
      return null
    }

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            data-style="ghost"
            disabled={!canInsert}
            data-disabled={!canInsert}
            aria-label={label}
            tooltip={label}
            {...buttonProps}
          >
            {children ?? (
              <>
                <Icon className="tiptap-button-icon" />
                {text && <span className="tiptap-button-text">{text}</span>}
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom">
          <Card>
            <CardBody>
              <TableGridSelector
                maxRows={maxRows}
                maxCols={maxCols}
                hoveredCell={hoveredCell}
                onCellHover={handleCellHover}
                onCellClick={handleCellClick}
                onMouseLeave={resetHoveredCell}
                disabled={!canInsert}
              />
            </CardBody>
          </Card>
        </PopoverContent>
      </Popover>
    )
  }
)

TableTriggerButton.displayName = "TableTriggerButton"
