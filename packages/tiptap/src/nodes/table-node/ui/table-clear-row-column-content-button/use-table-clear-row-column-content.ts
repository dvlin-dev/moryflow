"use client"

import { useCallback, useMemo } from "react"
import type { Editor } from "@tiptap/react"
import {
  cellAround,
  CellSelection,
  deleteCellSelection,
} from "@tiptap/pm/tables"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Lib ---
import { isExtensionAvailable } from "../../../../utils/tiptap-utils"
import type { Orientation } from "../../lib/tiptap-table-utils"
import {
  getTable,
  getTableSelectionType,
  getRowOrColumnCells,
  setCellAttr,
  isCellEmpty,
} from "../../lib/tiptap-table-utils"

// --- Icons ---
import { SquareXIcon } from "@aiget/ui/icons/square-x-icon"

export interface UseTableClearRowColumnContentConfig {
  /**
   * The Tiptap editor instance. If omitted, the hook will use
   * the context/editor from `useTiptapEditor`.
   */
  editor?: Editor | null
  /**
   * The index of the row or column to clear.
   * If omitted, will clear the currently selected cells.
   */
  index?: number
  /**
   * Whether you're clearing a row or a column.
   * If omitted, will clear the currently selected cells.
   */
  orientation?: Orientation
  /**
   * The position of the table in the document.
   */
  tablePos?: number
  /**
   * Hide the button when clearing isn't currently possible.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Whether to reset cell attributes (backgroundColor, nodeVerticalAlign, nodeTextAlign) when clearing.
   * @default false
   */
  resetAttrs?: boolean
  /**
   * Callback function called after a successful clear.
   */
  onCleared?: () => void
}

const REQUIRED_EXTENSIONS = ["table"]

export const tableClearRowColumnContentLabels: Record<Orientation, string> = {
  row: "Clear row contents",
  column: "Clear column contents",
}

/**
 * Default cell attributes to reset when clearing content
 */
const DEFAULT_CELL_ATTRS = {
  backgroundColor: null,
  nodeVerticalAlign: null,
  nodeTextAlign: null,
}

/**
 * Resets cell attributes to default values
 */
function resetCellAttributes(editor: Editor): boolean {
  try {
    return setCellAttr(DEFAULT_CELL_ATTRS)(editor.state, editor.view.dispatch)
  } catch (error) {
    console.error("Error resetting cell attributes:", error)
    return false
  }
}

/**
 * Checks if a table row/column content clearing can be performed
 * in the current editor state.
 */
function canClearRowColumnContent({
  editor,
  index,
  orientation,
  tablePos,
}: {
  editor: Editor | null
  index?: number
  orientation?: Orientation
  tablePos?: number
}): boolean {
  if (
    !editor ||
    !editor.isEditable ||
    !isExtensionAvailable(editor, REQUIRED_EXTENSIONS)
  ) {
    return false
  }

  try {
    const table = getTable(editor, tablePos)
    if (!table) return false

    const selectionType = getTableSelectionType(
      editor,
      index,
      orientation,
      tablePos
    )

    if (selectionType) {
      const cellData = getRowOrColumnCells(
        editor,
        selectionType.index,
        selectionType.orientation,
        tablePos
      )
      if (cellData.cells.length === 0) return false

      return cellData.cells.some(
        (cellInfo) => cellInfo.node && !isCellEmpty(cellInfo.node)
      )
    } else {
      const { selection } = editor.state

      if (selection instanceof CellSelection) {
        let hasContent = false
        selection.forEachCell((cell) => {
          if (!isCellEmpty(cell)) {
            hasContent = true
          }
        })
        return hasContent
      }

      // Single cell case
      const { $anchor } = selection
      const cell = cellAround($anchor)
      if (!cell) return false

      const cellNode = editor.state.doc.nodeAt(cell.pos)
      return cellNode ? !isCellEmpty(cellNode) : false
    }
  } catch {
    return false
  }
}

/**
 * Clears content from selected cells and optionally resets attributes.
 */
function clearSelectedCells(
  editor: Editor,
  resetAttrs: boolean = false
): boolean {
  try {
    const { selection } = editor.state

    if (selection instanceof CellSelection) {
      if (resetAttrs) {
        resetCellAttributes(editor)
      }

      deleteCellSelection(editor.state, editor.view.dispatch)

      return true
    }

    // Handle single cell
    const { $anchor } = selection
    const cell = cellAround($anchor)
    if (!cell) return false

    const cellNode = editor.state.doc.nodeAt(cell.pos)
    if (!cellNode) return false

    const from = cell.pos + 1
    const to = cell.pos + cellNode.nodeSize - 1
    if (from >= to) return false

    if (resetAttrs) {
      resetCellAttributes(editor)
    }

    editor.view.dispatch(editor.state.tr.delete(from, to))

    return true
  } catch (error) {
    console.error("Error clearing selected cells:", error)
    return false
  }
}

/**
 * Clears content from all cells in a specific row or column and optionally resets attributes.
 */
function clearRowColumnCells({
  editor,
  index,
  orientation,
  tablePos,
  resetAttrs = false,
}: {
  editor: Editor
  index: number
  orientation: Orientation
  tablePos?: number
  resetAttrs?: boolean
}): boolean {
  try {
    const { state, view } = editor
    const tr = state.tr

    const cellData = getRowOrColumnCells(editor, index, orientation, tablePos)

    if (cellData.cells.length === 0) {
      return false
    }

    const cellsToProcess = [...cellData.cells].reverse()

    cellsToProcess.forEach((cellInfo) => {
      if (cellInfo.node && !isCellEmpty(cellInfo.node)) {
        const from = cellInfo.pos + 1
        const to = cellInfo.pos + cellInfo.node.nodeSize - 1
        if (from < to) {
          tr.delete(from, to)
        }

        if (resetAttrs) {
          tr.setNodeMarkup(cellInfo.pos, null, {
            ...cellInfo.node.attrs,
            ...DEFAULT_CELL_ATTRS,
          })
        }
      }
    })

    if (tr.docChanged) {
      view.dispatch(tr)
      return true
    }

    return false
  } catch (error) {
    console.error(`Error clearing ${orientation} content:`, error)
    return false
  }
}

/**
 * Executes the row/column content clearing in the editor.
 */
function tableClearRowColumnContent({
  editor,
  index,
  orientation,
  tablePos,
  resetAttrs = false,
}: {
  editor: Editor | null
  index?: number
  orientation?: Orientation
  tablePos?: number
  resetAttrs?: boolean
}): boolean {
  if (
    !canClearRowColumnContent({ editor, index, orientation, tablePos }) ||
    !editor
  ) {
    return false
  }

  try {
    const selectionType = getTableSelectionType(
      editor,
      index,
      orientation,
      tablePos
    )

    if (selectionType) {
      return clearRowColumnCells({
        editor,
        index: selectionType.index,
        orientation: selectionType.orientation,
        resetAttrs,
        tablePos,
      })
    } else {
      return clearSelectedCells(editor, resetAttrs)
    }
  } catch (error) {
    console.error("Error clearing table content:", error)
    return false
  }
}

/**
 * Determines if the clear button should be shown
 * based on editor state and config.
 */
function shouldShowButton({
  editor,
  index,
  orientation,
  tablePos,
  hideWhenUnavailable,
}: {
  editor: Editor | null
  index?: number
  orientation?: Orientation
  tablePos?: number
  hideWhenUnavailable: boolean
}): boolean {
  if (!editor || !editor.isEditable) return false
  if (!isExtensionAvailable(editor, REQUIRED_EXTENSIONS)) return false

  const table = getTable(editor, tablePos)
  if (!table) return false

  const selectionType = getTableSelectionType(
    editor,
    index,
    orientation,
    tablePos
  )
  const { selection } = editor.state
  const isInTableCell =
    selection instanceof CellSelection || cellAround(selection.$anchor)

  if (!selectionType && !isInTableCell) return false

  return hideWhenUnavailable
    ? canClearRowColumnContent({ editor, index, orientation, tablePos })
    : true
}

/**
 * Custom hook that provides **table row/column content clearing**
 * functionality for the Tiptap editor.
 *
 * @example
 * ```tsx
 * // Clear currently selected cells (no parameters needed)
 * function ClearSelectedButton() {
 *   const { isVisible, handleClear } = useTableClearRowColumnContent()
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleClear}>Clear Selection</button>
 * }
 *
 * // Clear specific row with attribute reset
 * function ClearRowButton({ rowIndex }: { rowIndex: number }) {
 *   const { isVisible, handleClear, label, canClearRowColumnContent } = useTableClearRowColumnContent({
 *     index: rowIndex,
 *     orientation: "row",
 *     resetAttrs: true,
 *     hideWhenUnavailable: true,
 *     onCleared: () => console.log("Row cleared and attributes reset!"),
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <button
 *       onClick={handleClear}
 *       disabled={!canClearRowColumnContent}
 *       aria-label={label}
 *     >
 *       {label}
 *     </button>
 *   )
 * }
 *
 * // Clear content based on current table selection (row/column/cells)
 * function SmartClearButton() {
 *   const { isVisible, handleClear, label } = useTableClearRowColumnContent({
 *     resetAttrs: true,
 *     hideWhenUnavailable: true
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleClear}>{label}</button>
 * }
 * ```
 */
export function useTableClearRowColumnContent(
  config: UseTableClearRowColumnContentConfig = {}
) {
  const {
    editor: providedEditor,
    index,
    orientation,
    tablePos,
    hideWhenUnavailable = false,
    resetAttrs = false,
    onCleared,
  } = config

  const { editor } = useTiptapEditor(providedEditor)

  const selectionType = getTableSelectionType(
    editor,
    index,
    orientation,
    tablePos
  )

  const isVisible = shouldShowButton({
    editor,
    index,
    orientation,
    tablePos,
    hideWhenUnavailable,
  })

  const canPerformClear = canClearRowColumnContent({
    editor,
    index,
    orientation,
    tablePos,
  })

  const handleClear = useCallback(() => {
    const success = tableClearRowColumnContent({
      editor,
      index,
      orientation,
      tablePos,
      resetAttrs,
    })
    if (success) onCleared?.()
    return success
  }, [editor, index, orientation, tablePos, resetAttrs, onCleared])

  const label = useMemo(() => {
    if (selectionType) {
      return tableClearRowColumnContentLabels[selectionType.orientation]
    }
    return "Clear contents"
  }, [selectionType])

  const Icon = SquareXIcon

  return {
    isVisible,
    canClearRowColumnContent: canPerformClear,
    handleClear,
    label,
    Icon,
  }
}
