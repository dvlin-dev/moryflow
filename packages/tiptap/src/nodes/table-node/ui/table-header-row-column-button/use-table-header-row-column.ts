import { useCallback } from "react"
import type { Editor } from "@tiptap/react"
import { CellSelection, toggleHeader } from "@tiptap/pm/tables"
import type { Transaction } from "@tiptap/pm/state"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Lib ---
import {
  isExtensionAvailable,
  isValidPosition,
} from "../../../../utils/tiptap-utils"
import type { Orientation } from "../../lib/tiptap-table-utils"
import {
  getIndexCoordinates,
  getRowOrColumnCells,
  getTableSelectionType,
  selectCellsByCoords,
} from "../../lib/tiptap-table-utils"

// --- Icons ---
import { TableHeaderRowIcon } from "@aiget/ui/icons/table-header-row-icon"
import { TableHeaderColumnIcon } from "@aiget/ui/icons/table-header-column-icon"

export interface UseTableHeaderRowColumnConfig {
  /**
   * The Tiptap editor instance. If omitted, the hook will use
   * the context/editor from `useTiptapEditor`.
   */
  editor?: Editor | null
  /**
   * The index of the row or column. Header functionality only applies to index 0.
   * If omitted, will use the current selection.
   */
  index?: number
  /**
   * Whether you're toggling header for a row or a column.
   * If omitted, will use the current selection.
   */
  orientation?: Orientation
  /**
   * The position of the table in the document.
   * Used when there's no cell selection so we can target a specific table.
   */
  tablePos?: number
  /**
   * Hide the button when header toggle isn't currently possible.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful header toggle.
   */
  onToggled?: () => void
}

const REQUIRED_EXTENSIONS = ["table"]

export const tableHeaderRowColumnLabels: Record<Orientation, string> = {
  row: "Header row",
  column: "Header column",
}

export const tableHeaderRowColumnIcons = {
  row: TableHeaderRowIcon,
  column: TableHeaderColumnIcon,
}

/**
 * Checks if a table header row/column toggle can be performed
 * in the current editor state (or at tablePos when no selection).
 */
function canToggleHeader({
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

  const selectionType = getTableSelectionType(
    editor,
    index,
    orientation,
    tablePos
  )
  if (!selectionType) return false

  return selectionType.index === 0
}

/**
 * Executes the header row/column toggle. If there is no cell selection,
 * it will derive the target from (index, orientation) and the table at tablePos.
 */
function toggleTableHeader({
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
  if (!editor) return false
  if (!canToggleHeader({ editor, index, orientation, tablePos })) return false

  try {
    const selectionType = getTableSelectionType(
      editor,
      index,
      orientation,
      tablePos
    )
    if (!selectionType) return false

    const isRow = selectionType.orientation === "row"

    if (editor.state.selection instanceof CellSelection) {
      return isRow
        ? editor.commands.toggleHeaderRow()
        : editor.commands.toggleHeaderColumn()
    }

    if (!isValidPosition(tablePos)) return false

    const cellCoords = getIndexCoordinates({
      editor,
      index: selectionType.index,
      orientation: selectionType.orientation,
      tablePos,
    })
    if (!cellCoords) return false

    const stateWithCellSel = selectCellsByCoords(editor, tablePos, cellCoords, {
      mode: "state",
    })
    if (!stateWithCellSel) return false

    const dispatch = (tr: Transaction) => editor.view.dispatch(tr)
    return isRow
      ? toggleHeader("row")(stateWithCellSel, dispatch)
      : toggleHeader("column")(stateWithCellSel, dispatch)
  } catch {
    return false
  }
}

/**
 * Determines if the header toggle button should be shown
 * based on editor state and config.
 */
function shouldShowButton({
  editor,
  index,
  orientation,
  hideWhenUnavailable,
  tablePos,
}: {
  editor: Editor | null
  index?: number
  orientation?: Orientation
  hideWhenUnavailable: boolean
  tablePos?: number
}): boolean {
  if (!editor || !editor.isEditable) return false
  if (!isExtensionAvailable(editor, REQUIRED_EXTENSIONS)) return false

  if (hideWhenUnavailable) {
    return canToggleHeader({ editor, index, orientation, tablePos })
  }

  const selectionType = getTableSelectionType(editor, index, orientation)
  return Boolean(selectionType)
}

/**
 * Custom hook that provides **table header row/column toggle**
 * functionality for the Tiptap editor. Supports `tablePos` when
 * no cell is selected.
 */
export function useTableHeaderRowColumn(config: UseTableHeaderRowColumnConfig) {
  const {
    editor: providedEditor,
    index,
    orientation,
    tablePos,
    hideWhenUnavailable = false,
    onToggled,
  } = config

  const { editor } = useTiptapEditor(providedEditor)

  const selectionType = getTableSelectionType(editor, index, orientation)

  const isVisible = shouldShowButton({
    editor,
    index,
    orientation,
    hideWhenUnavailable,
    tablePos,
  })

  const canPerformToggle = canToggleHeader({
    editor,
    index,
    orientation,
    tablePos,
  })

  let isActive = false
  if (editor?.state.selection instanceof CellSelection) {
    isActive = editor?.isActive("tableHeader") || false
  } else {
    const rowsOrCols = getRowOrColumnCells(
      editor,
      index,
      selectionType?.orientation,
      tablePos
    )

    if (rowsOrCols) {
      const secondIndex = rowsOrCols.cells.length > 1 ? 1 : 0
      isActive =
        rowsOrCols.cells[secondIndex]?.node?.type.name === "tableHeader" ||
        false
    }
  }

  const handleToggle = useCallback(() => {
    const success = toggleTableHeader({ editor, index, orientation, tablePos })
    if (success) onToggled?.()
    return success
  }, [editor, index, orientation, tablePos, onToggled])

  const label = tableHeaderRowColumnLabels[selectionType?.orientation || "row"]
  const Icon = tableHeaderRowColumnIcons[selectionType?.orientation || "row"]

  return {
    isVisible,
    canToggleHeader: canPerformToggle,
    handleToggle,
    label,
    Icon,
    isActive,
  }
}
