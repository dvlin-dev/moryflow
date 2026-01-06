import { useCallback, useState } from "react"
import type { Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Lib ---
import { isExtensionAvailable } from "../../../../utils/tiptap-utils"

// --- Icons ---
import { TableIcon } from "@moryflow/ui/icons/table-icon"

const REQUIRED_EXTENSIONS = ["table"]

/**
 * Configuration for the table trigger functionality
 */
export interface UseTableTriggerButtonConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Whether the button should hide when table insertion is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Maximum number of rows in the grid selector.
   * @default 8
   */
  maxRows?: number
  /**
   * Maximum number of columns in the grid selector.
   * @default 8
   */
  maxCols?: number
  /**
   * Callback function called after a successful table insertion.
   */
  onInserted?: (rows: number, cols: number) => void
}

/**
 * Checks if a table can be inserted in the current editor state
 */
export function canInsertTable(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  return isExtensionAvailable(editor, REQUIRED_EXTENSIONS)
}

/**
 * Inserts a table with the specified dimensions
 */
export function insertTable(
  editor: Editor | null,
  rows: number,
  cols: number
): boolean {
  if (!editor || !canInsertTable(editor)) return false

  try {
    return editor
      .chain()
      .focus()
      .insertTable({
        rows,
        cols,
        withHeaderRow: false,
      })
      .run()
  } catch (error) {
    console.error("Error inserting table:", error)
    return false
  }
}

/**
 * Determines if the table trigger button should be shown
 */
export function shouldShowButton(
  editor: Editor | null,
  hideWhenUnavailable: boolean
): boolean {
  if (!editor || !editor.isEditable) return false

  const hasExtension = isExtensionAvailable(editor, REQUIRED_EXTENSIONS)
  if (!hasExtension) return false

  // If hiding when unavailable, also check if we can actually insert
  return !hideWhenUnavailable || canInsertTable(editor)
}

/**
 * Custom hook that provides table insertion functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * function MyTableButton() {
 *   const {
 *     isVisible,
 *     canInsert,
 *     isOpen,
 *     setIsOpen,
 *     hoveredCell,
 *     handleCellHover,
 *     handleCellClick,
 *     resetHoveredCell
 *   } = useTableTriggerButton({ editor })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <Popover open={isOpen} onOpenChange={setIsOpen}>
 *       <PopoverTrigger>Insert Table</PopoverTrigger>
 *       <PopoverContent>
 *         <TableGridSelector
 *           hoveredCell={hoveredCell}
 *           onCellHover={handleCellHover}
 *           onCellClick={handleCellClick}
 *           onMouseLeave={resetHoveredCell}
 *         />
 *       </PopoverContent>
 *     </Popover>
 *   )
 * }
 * ```
 */
export function useTableTriggerButton(config?: UseTableTriggerButtonConfig) {
  const {
    editor: providedEditor,
    hideWhenUnavailable = false,
    onInserted,
  } = config || {}

  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{
    row: number
    col: number
  } | null>(null)

  const isVisible = shouldShowButton(editor, hideWhenUnavailable)
  const canInsert = canInsertTable(editor)

  const handleCellHover = useCallback((row: number, col: number) => {
    setHoveredCell({ row, col })
  }, [])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const success = insertTable(editor, row + 1, col + 1)
      if (success) {
        setIsOpen(false)
        onInserted?.(row + 1, col + 1)
      }
    },
    [editor, onInserted]
  )

  const resetHoveredCell = useCallback(() => {
    setHoveredCell(null)
  }, [])

  return {
    isVisible,
    canInsert,
    isOpen,
    setIsOpen,
    hoveredCell,
    handleCellHover,
    handleCellClick,
    resetHoveredCell,
    label: "Insert table",
    Icon: TableIcon,
  }
}
