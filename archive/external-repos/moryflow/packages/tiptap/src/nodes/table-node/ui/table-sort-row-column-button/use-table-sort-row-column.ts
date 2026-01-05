"use client"

import { useCallback, useMemo } from "react"
import type { Editor } from "@tiptap/react"
import type { Node } from "@tiptap/pm/model"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Lib ---
import { isExtensionAvailable } from "../../../../utils/tiptap-utils"
import type { Orientation } from "../../lib/tiptap-table-utils"
import {
  type CellInfo,
  getTable,
  getTableSelectionType,
  getRowOrColumnCells,
  isCellEmpty,
} from "../../lib/tiptap-table-utils"

// --- Icons ---
import { ArrowDownAZIcon } from "@moryflow/ui/icons/arrow-down-a-z-icon"
import { ArrowDownZAIcon } from "@moryflow/ui/icons/arrow-down-z-a-icon"

export type SortDirection = "asc" | "desc"

export interface UseTableSortRowColumnConfig {
  /**
   * The Tiptap editor instance. If omitted, the hook will use
   * the context/editor from `useTiptapEditor`.
   */
  editor?: Editor | null
  /**
   * The index of the row or column to sort.
   * If omitted, will use the current selection.
   */
  index?: number
  /**
   * Whether you're sorting a row or a column.
   * If omitted, will use the current selection.
   */
  orientation?: Orientation
  /**
   * The position of the table in the document.
   */
  tablePos?: number
  /**
   * The sort direction (ascending or descending).
   */
  direction: SortDirection
  /**
   * Hide the button when sorting isn't currently possible.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful sort.
   */
  onSorted?: () => void
}

const REQUIRED_EXTENSIONS = ["tableHandleExtension"]

export const tableSortRowColumnLabels: Record<
  Orientation,
  Record<SortDirection, string>
> = {
  row: {
    asc: "Sort row A-Z",
    desc: "Sort row Z-A",
  },
  column: {
    asc: "Sort column A-Z",
    desc: "Sort column Z-A",
  },
}

export const tableSortRowColumnIcons = {
  asc: ArrowDownAZIcon,
  desc: ArrowDownZAIcon,
}

/**
 * Check if a specific cell is a header cell
 */
function isCellHeader(cellNode: Node | null): boolean {
  if (!cellNode) return false

  return (
    cellNode.type.name === "tableHeader" ||
    cellNode.type.name === "table_header" ||
    cellNode.attrs?.header === true
  )
}

/**
 * Extract text content from a cell node for sorting comparison
 */
function getCellSortText(cellNode: Node | null): string {
  if (!cellNode) return ""

  let text = ""
  cellNode.descendants((node) => {
    if (node.isText) {
      text += node.text || ""
    }
    return true
  })

  return text.trim().toLowerCase()
}

/**
 * Create a sortable item with all necessary data for restoration
 */
interface SortableCell {
  sortText: string
  originalNode: Node | null
  cellInfo: CellInfo
  originalIndex: number
  isHeader: boolean
  isEmpty: boolean
}

/**
 * Checks if a table row/column sort can be performed
 * in the current editor state.
 */
function canSortRowColumn({
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

    const cellData = getRowOrColumnCells(editor, index, orientation, tablePos)

    // Need at least 2 items to sort
    if (cellData.orientation === "row") {
      if (table.map.width < 2) return false
    } else {
      if (table.map.height < 2) return false
    }

    if (cellData.mergedCells.length > 0) {
      return false
    }

    // Check if there's actual content to sort (excluding headers)
    const hasContent = cellData.cells.some(
      (cellInfo) =>
        cellInfo.node &&
        !isCellHeader(cellInfo.node) &&
        !isCellEmpty(cellInfo.node)
    )

    if (!hasContent) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Executes the row/column sort in the editor while preserving marks and attributes.
 * Header cells are excluded from sorting and remain in their original positions.
 * Empty cells are always sorted to the end.
 */
function tableSortRowColumn({
  editor,
  index,
  orientation,
  direction,
  tablePos,
}: {
  editor: Editor | null
  index?: number
  orientation?: Orientation
  direction: SortDirection
  tablePos?: number
}): boolean {
  if (!canSortRowColumn({ editor, index, orientation, tablePos }) || !editor)
    return false

  try {
    const { state, view } = editor
    const tr = state.tr

    const cellData = getRowOrColumnCells(editor, index, orientation, tablePos)

    if (cellData.mergedCells.length > 0) {
      console.warn(`Cannot sort ${orientation} ${index}: contains merged cells`)
      return false
    }

    if (cellData.cells.length < 2) {
      return false
    }

    // Create sortable items, marking headers, data cells, and empty cells
    const allItems: SortableCell[] = cellData.cells.map(
      (cellInfo, originalIndex) => {
        const isHeader = isCellHeader(cellInfo.node)
        const isEmpty = cellInfo.node ? isCellEmpty(cellInfo.node) : true
        return {
          sortText: getCellSortText(cellInfo.node),
          originalNode: cellInfo.node,
          cellInfo,
          originalIndex,
          isHeader,
          isEmpty,
        }
      }
    )

    const dataItems = allItems.filter((item) => !item.isHeader)

    if (dataItems.length < 2) {
      console.log("No sortable data cells found (excluding headers)")
      return false
    }

    // Sort data items with special handling for empty cells
    dataItems.sort((a, b) => {
      // Empty cells always go to the end, regardless of sort direction
      if (a.isEmpty && !b.isEmpty) return 1
      if (!a.isEmpty && b.isEmpty) return -1
      if (a.isEmpty && b.isEmpty) return 0

      // For non-empty cells, sort normally
      const comparison = a.sortText.localeCompare(b.sortText, undefined, {
        sensitivity: "base",
      })
      return direction === "asc" ? comparison : -comparison
    })

    const newCellNodes: Node[] = []
    let dataIndex = 0

    for (let i = 0; i < allItems.length; i++) {
      const originalItem = allItems[i]
      const targetCell = cellData.cells[i]

      if (!targetCell || !originalItem) continue

      let nodeToPlace: Node | null = null

      if (originalItem.isHeader) {
        // Keep header in its original position
        nodeToPlace = originalItem.originalNode
      } else {
        // Use the next sorted data cell
        const sortedDataItem = dataItems[dataIndex]
        nodeToPlace = sortedDataItem?.originalNode || null
        dataIndex++
      }

      if (nodeToPlace && targetCell.node) {
        const cellType = targetCell.node.type
        const newCellNode = cellType.create(
          nodeToPlace.attrs,
          nodeToPlace.content,
          nodeToPlace.marks
        )
        newCellNodes.push(newCellNode)
      } else {
        newCellNodes.push(targetCell.node!)
      }
    }

    // Replace each cell with the new cell (headers preserved, data sorted)
    // We need to go in reverse order to maintain correct positions
    const cellsToReplace = [...cellData.cells].reverse()
    const newNodesToPlace = [...newCellNodes].reverse()

    cellsToReplace.forEach((targetCell, reverseIndex) => {
      const newNode = newNodesToPlace[reverseIndex]
      if (newNode && targetCell.node) {
        // Replace the entire cell node
        const cellEnd = targetCell.pos + targetCell.node.nodeSize
        tr.replaceWith(targetCell.pos, cellEnd, newNode)
      }
    })

    if (tr.docChanged) {
      view.dispatch(tr)
      return true
    }

    return false
  } catch (error) {
    console.error(`Error sorting table ${orientation}:`, error)
    return false
  }
}

/**
 * Determines if the sort button should be shown
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
  tablePos: number | undefined
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
  if (!selectionType) return false

  return hideWhenUnavailable
    ? canSortRowColumn({ editor, index, orientation, tablePos })
    : true
}

/**
 * Custom hook that provides **table row/column sorting**
 * functionality for the Tiptap editor.
 *
 * **Header Handling:** Header cells are automatically detected and excluded
 * from sorting. During a sort operation, header cells remain in their original
 * positions while only data cells are rearranged. Headers are identified by
 * node type (`tableHeader`) or attributes (`header: true`).
 *
 * **Empty Cell Handling:** Empty cells are always sorted to the end,
 * regardless of sort direction (A-Z or Z-A).
 *
 * @example
 * ```tsx
 * // Sort currently selected row/column (smart mode)
 * function SortButton() {
 *   const { isVisible, handleSort } = useTableSortRowColumn({ direction: "asc" })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleSort}>Sort A-Z</button>
 * }
 *
 * // Sort specific row, headers will be preserved
 * function SortRowButton({ rowIndex }: { rowIndex: number }) {
 *   const { isVisible, handleSort, label, canSortRowColumn } = useTableSortRowColumn({
 *     index: rowIndex,
 *     orientation: "row",
 *     direction: "asc",
 *     hideWhenUnavailable: true,
 *     onSorted: () => console.log("Row sorted! Headers stayed in place."),
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <button
 *       onClick={handleSort}
 *       disabled={!canSortRowColumn}
 *       aria-label={label}
 *     >
 *       {label}
 *     </button>
 *   )
 * }
 *
 * // Sort with callback to handle the result
 * function SmartSortButton() {
 *   const { isVisible, handleSort, label } = useTableSortRowColumn({
 *     direction: "desc",
 *     hideWhenUnavailable: true,
 *     onSorted: () => {
 *       console.log("Sort completed! Headers were automatically preserved.")
 *     }
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleSort}>{label}</button>
 * }
 * ```
 */
export function useTableSortRowColumn(
  config: UseTableSortRowColumnConfig = { direction: "asc" }
) {
  const {
    editor: providedEditor,
    index,
    orientation,
    tablePos,
    direction,
    hideWhenUnavailable = false,
    onSorted,
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

  const canPerformSort = canSortRowColumn({
    editor,
    index,
    orientation,
    tablePos,
  })

  const handleSort = useCallback(() => {
    const success = tableSortRowColumn({
      editor,
      index,
      orientation,
      direction,
      tablePos,
    })
    if (success) onSorted?.()
    return success
  }, [editor, index, orientation, direction, tablePos, onSorted])

  const label = useMemo(() => {
    const orientationLabels =
      tableSortRowColumnLabels[selectionType?.orientation || "row"]
    return (
      orientationLabels[direction] ||
      `Sort ${selectionType?.orientation} ${direction}`
    )
  }, [selectionType, direction])

  const Icon = useMemo(() => {
    return tableSortRowColumnIcons[direction] || ArrowDownAZIcon
  }, [direction])

  return {
    isVisible,
    canSortRowColumn: canPerformSort,
    handleSort,
    label,
    Icon,
  }
}
