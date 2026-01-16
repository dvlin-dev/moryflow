import { useCallback, useMemo } from "react"
import type { Editor } from "@tiptap/react"
import type { TableMap } from "@tiptap/pm/tables"
import {
  CellSelection,
  columnIsHeader,
  moveTableColumn,
  moveTableRow,
  rowIsHeader,
  selectedRect,
} from "@tiptap/pm/tables"
import type { Transaction } from "@tiptap/pm/state"
import type { Node } from "@tiptap/pm/model"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Lib ---
import { isExtensionAvailable } from "../../../../utils/tiptap-utils"
import type { Orientation } from "../../lib/tiptap-table-utils"
import {
  getTable,
  getTableSelectionType,
  selectCellsByCoords,
  cellsOverlapRectangle,
  getIndexCoordinates,
} from "../../lib/tiptap-table-utils"

// --- Icons ---
import { ArrowLeftIcon } from "@anyhunt/ui/icons/arrow-left-icon"
import { ArrowRightIcon } from "@anyhunt/ui/icons/arrow-right-icon"
import { ArrowUpIcon } from "@anyhunt/ui/icons/arrow-up-icon"
import { ArrowDownIcon } from "@anyhunt/ui/icons/arrow-down-icon"

export type MoveDirection = "up" | "down" | "left" | "right"

export interface UseTableMoveRowColumnConfig {
  /**
   * The Tiptap editor instance. If omitted, the hook will use
   * the context/editor from `useTiptapEditor`.
   */
  editor?: Editor | null
  /**
   * The index of the row or column to move.
   * If omitted, will use the current selection.
   */
  index?: number
  /**
   * Whether you're moving a row or a column.
   * If omitted, will use the current selection.
   */
  orientation?: Orientation
  /**
   * The position of the table in the document.
   */
  tablePos?: number
  /**
   * The direction to move (up/down for rows, left/right for columns).
   */
  direction: MoveDirection
  /**
   * Hide the button when moving isn't currently possible.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful move.
   */
  onMoved?: () => void
}

const REQUIRED_EXTENSIONS = ["tableHandleExtension"]

export const tableMoveRowColumnLabels: Record<
  Orientation,
  Record<MoveDirection, string>
> = {
  row: {
    up: "Move row up",
    down: "Move row down",
    left: "Move row left",
    right: "Move row right",
  },
  column: {
    up: "Move column up",
    down: "Move column down",
    left: "Move column left",
    right: "Move column right",
  },
}

export const tableMoveRowColumnIcons = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  left: ArrowLeftIcon,
  right: ArrowRightIcon,
}

function safeColumnIsHeader(map: TableMap, node: Node, index: number): boolean {
  try {
    return columnIsHeader(map, node, index)
  } catch {
    return false
  }
}

function safeRowIsHeader(map: TableMap, node: Node, index: number): boolean {
  try {
    return rowIsHeader(map, node, index)
  } catch {
    return false
  }
}

/**
 * Validates that the direction is compatible with the orientation.
 */
function isValidDirectionForOrientation(
  orientation: Orientation,
  direction: MoveDirection
): boolean {
  if (orientation === "row") {
    return direction === "up" || direction === "down"
  } else if (orientation === "column") {
    return direction === "left" || direction === "right"
  }
  return false
}

/**
 * Checks if a table row/column can be moved in the specified direction.
 */
function canMoveRowColumn({
  editor,
  index,
  orientation,
  direction,
  tablePos,
}: {
  editor: Editor | null
  index?: number
  orientation?: Orientation
  direction: MoveDirection
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

    const selectionType = getTableSelectionType(editor, index, orientation)
    if (!selectionType) return false

    const { orientation: finalOrientation, index: finalIndex } = selectionType

    if (!isValidDirectionForOrientation(finalOrientation, direction)) {
      return false
    }

    // START
    // This is just internal preference, you can comment it out if you want
    // to allow moving header rows/columns
    if (
      finalOrientation === "row" &&
      safeRowIsHeader(table.map, table.node, finalIndex)
    ) {
      return false
    }

    if (
      finalOrientation === "column" &&
      safeColumnIsHeader(table.map, table.node, finalIndex)
    ) {
      return false
    }
    // END

    const { width, height } = table.map

    const targetIndex =
      finalOrientation === "row"
        ? direction === "up"
          ? finalIndex - 1
          : finalIndex + 1
        : direction === "left"
          ? finalIndex - 1
          : finalIndex + 1

    const maxIndex = finalOrientation === "row" ? height : width
    if (targetIndex < 0 || targetIndex >= maxIndex) {
      return false
    }

    const sourceCoords = getIndexCoordinates({
      editor,
      index: finalIndex,
      orientation: finalOrientation,
      tablePos,
    })
    const targetCoords = getIndexCoordinates({
      editor,
      index: targetIndex,
      orientation: finalOrientation,
      tablePos,
    })
    if (!sourceCoords || !targetCoords) return false

    const sourceSelection = selectCellsByCoords(
      editor,
      table.pos,
      sourceCoords,
      { mode: "state" }
    )
    if (!sourceSelection) return false
    const sourceRect = selectedRect(sourceSelection)

    const targetSelection = selectCellsByCoords(
      editor,
      table.pos,
      targetCoords,
      { mode: "state" }
    )
    if (!targetSelection) return false
    const targetRect = selectedRect(targetSelection)

    if (
      cellsOverlapRectangle(table.map, sourceRect) &&
      cellsOverlapRectangle(table.map, targetRect)
    ) {
      return false
    }

    return finalOrientation === "row"
      ? direction === "up"
        ? finalIndex > 0
        : finalIndex < height - 1
      : direction === "left"
        ? finalIndex > 0
        : finalIndex < width - 1
  } catch {
    return false
  }
}

/**
 * Executes the row/column move in the editor.
 */
function tableMoveRowColumn({
  editor,
  index,
  orientation,
  direction,
  tablePos,
}: {
  editor: Editor | null
  index?: number
  orientation?: Orientation
  direction: MoveDirection
  tablePos?: number
}): boolean {
  if (
    !canMoveRowColumn({ editor, index, orientation, direction, tablePos }) ||
    !editor
  ) {
    return false
  }

  try {
    const table = getTable(editor, tablePos)
    if (!table) return false

    const selectionType = getTableSelectionType(editor, index, orientation)
    if (!selectionType) return false

    const { orientation: finalOrientation, index: from } = selectionType

    if (!isValidDirectionForOrientation(finalOrientation, direction)) {
      return false
    }

    const delta: Record<MoveDirection, number> = {
      up: -1,
      down: 1,
      left: -1,
      right: 1,
    }

    const to = from + delta[direction]

    const moveOperation =
      finalOrientation === "row" ? moveTableRow : moveTableColumn

    console.log({ from, to, finalOrientation, direction })

    const dispatch = (tr: Transaction) => editor.view.dispatch(tr)

    if (editor.state.selection instanceof CellSelection) {
      return moveOperation({ from, to, select: true, pos: table.start })(
        editor.state,
        dispatch
      )
    } else {
      const sourceCoords = getIndexCoordinates({
        editor,
        index: from,
        orientation: finalOrientation,
        tablePos,
      })
      if (!sourceCoords) return false

      const selectionState = selectCellsByCoords(
        editor,
        table.pos,
        sourceCoords,
        { mode: "state" }
      )

      if (!selectionState) return false

      return moveOperation({ from, to, select: true, pos: table.start })(
        selectionState,
        dispatch
      )
    }
  } catch (error) {
    console.error("Error moving table row/column:", error)
    return false
  }
}

/**
 * Determines if the move button should be shown
 * based on editor state and config.
 */
function shouldShowButton({
  editor,
  index,
  orientation,
  direction,
  hideWhenUnavailable,
  tablePos,
}: {
  editor: Editor | null
  index?: number
  orientation?: Orientation
  direction: MoveDirection
  hideWhenUnavailable: boolean
  tablePos?: number
}): boolean {
  if (!editor || !editor.isEditable) return false
  if (!isExtensionAvailable(editor, REQUIRED_EXTENSIONS)) return false

  const selectionType = getTableSelectionType(editor, index, orientation)
  if (!selectionType) return false

  if (!isValidDirectionForOrientation(selectionType.orientation, direction)) {
    return false
  }

  return hideWhenUnavailable
    ? canMoveRowColumn({ editor, index, orientation, direction, tablePos })
    : true
}

/**
 * Custom hook that provides **table row/column moving**
 * functionality for the Tiptap editor.
 *
 * @example
 * ```tsx
 * // Move row up
 * function MoveRowUpButton({ rowIndex }: { rowIndex: number }) {
 *   const { isVisible, handleMove, canMoveRowColumn, label, Icon } = useTableMoveRowColumn({
 *     index: rowIndex,
 *     orientation: "row",
 *     direction: "up",
 *     hideWhenUnavailable: true,
 *     onMoved: () => console.log("Row moved up!"),
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <button
 *       onClick={handleMove}
 *       disabled={!canMoveRowColumn}
 *       aria-label={label}
 *     >
 *       <Icon /> {label}
 *     </button>
 *   )
 * }
 *
 * // Move column based on current selection
 * function MoveColumnButton({ direction }: { direction: "left" | "right" }) {
 *   const { isVisible, handleMove, label } = useTableMoveRowColumn({
 *     orientation: "column",
 *     direction,
 *     hideWhenUnavailable: true,
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleMove}>{label}</button>
 * }
 * ```
 */
export function useTableMoveRowColumn(config: UseTableMoveRowColumnConfig) {
  const {
    editor: providedEditor,
    index,
    orientation,
    tablePos,
    direction,
    hideWhenUnavailable = false,
    onMoved,
  } = config

  const { editor } = useTiptapEditor(providedEditor)

  const selectionType = getTableSelectionType(editor, index, orientation)

  const isVisible = shouldShowButton({
    editor,
    index,
    orientation,
    direction,
    hideWhenUnavailable,
    tablePos,
  })

  const canPerformMove = canMoveRowColumn({
    editor,
    index,
    orientation,
    direction,
    tablePos,
  })

  const handleMove = useCallback(() => {
    const success = tableMoveRowColumn({
      editor,
      index,
      orientation,
      direction,
      tablePos,
    })
    if (success) onMoved?.()
    return success
  }, [editor, index, orientation, direction, tablePos, onMoved])

  const label = useMemo(() => {
    const orientationLabels =
      tableMoveRowColumnLabels[selectionType?.orientation || "row"]
    return (
      orientationLabels[direction] ||
      `Move ${selectionType?.orientation} ${direction}`
    )
  }, [selectionType, direction])

  const Icon = useMemo(() => {
    return tableMoveRowColumnIcons[direction]
  }, [direction])

  return {
    isVisible,
    canMoveRowColumn: canPerformMove,
    handleMove,
    label,
    Icon,
  }
}
