import type { Editor } from "@tiptap/react"
import type { Node } from "@tiptap/pm/model"
import type { Command } from "@tiptap/pm/state"
import { Selection, type EditorState, type Transaction } from "@tiptap/pm/state"
import type { FindNodeResult, Rect } from "@tiptap/pm/tables"
import {
  TableMap,
  CellSelection,
  findTable,
  selectedRect,
  cellAround,
  selectionCell,
  isInTable,
} from "@tiptap/pm/tables"
import { Mapping } from "@tiptap/pm/transform"

export const RESIZE_MIN_WIDTH = 35
export const EMPTY_CELL_WIDTH = 120
export const EMPTY_CELL_HEIGHT = 40

export type Orientation = "row" | "column"
export interface CellInfo extends FindNodeResult {
  row: number
  column: number
}

export type CellCoordinates = {
  row: number
  col: number
}

export type SelectionReturnMode = "state" | "transaction" | "dispatch"

export type BaseSelectionOptions = { mode?: SelectionReturnMode }
export type DispatchSelectionOptions = {
  mode: "dispatch"
  dispatch: (tr: Transaction) => void
}
export type TransactionSelectionOptions = { mode: "transaction" }
export type StateSelectionOptions = { mode?: "state" }

export type TableInfo = {
  map: TableMap
} & FindNodeResult

// ============================================================================
// HELPER CONSTANTS & UTILITIES
// ============================================================================

const EMPTY_CELLS_RESULT = { cells: [], mergedCells: [] }

export function isHTMLElement(n: unknown): n is HTMLElement {
  return n instanceof HTMLElement
}

export type DomCellAroundResult =
  | {
      type: "cell"
      domNode: HTMLElement
      tbodyNode: HTMLTableSectionElement | null
    }
  | {
      type: "wrapper"
      domNode: HTMLElement
      tbodyNode: HTMLTableSectionElement | null
    }

export function safeClosest<T extends Element>(
  start: Element | null,
  selector: string
): T | null {
  return (start?.closest?.(selector) as T | null) ?? null
}

/**
 * Walk up from an element until we find a TD/TH or the table wrapper.
 * Returns the found element plus its tbody (if present).
 */
export function domCellAround(
  target: Element
): DomCellAroundResult | undefined {
  let current: Element | null = target

  while (
    current &&
    current.tagName !== "TD" &&
    current.tagName !== "TH" &&
    !current.classList.contains("tableWrapper")
  ) {
    if (current.classList.contains("ProseMirror")) return undefined
    current = isHTMLElement(current.parentNode)
      ? (current.parentNode as Element)
      : null
  }

  if (!current) return undefined

  if (current.tagName === "TD" || current.tagName === "TH") {
    return {
      type: "cell",
      domNode: current as HTMLElement,
      tbodyNode: safeClosest<HTMLTableSectionElement>(current, "tbody"),
    }
  }

  return {
    type: "wrapper",
    domNode: current as HTMLElement,
    tbodyNode: (current as HTMLElement).querySelector("tbody"),
  }
}

/**
 * Clamps a value between min and max bounds
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/**
 * Validates if row/col indices are within table bounds
 */
function isWithinBounds(row: number, col: number, map: TableMap): boolean {
  return row >= 0 && row < map.height && col >= 0 && col < map.width
}

/**
 * Resolves the index for a row or column based on current selection or provided value
 */
function resolveOrientationIndex(
  state: EditorState,
  table: TableInfo,
  orientation: Orientation,
  providedIndex?: number
): number | null {
  if (typeof providedIndex === "number") {
    return providedIndex
  }

  if (state.selection instanceof CellSelection) {
    const rect = selectedRect(state)
    return orientation === "row" ? rect.top : rect.left
  }

  const $cell = cellAround(state.selection.$anchor) ?? selectionCell(state)
  if (!$cell) return null

  const rel = $cell.pos - table.start
  const rect = table.map.findCell(rel)
  return orientation === "row" ? rect.top : rect.left
}

/**
 * Creates a CellInfo object from position data
 */
function createCellInfo(
  row: number,
  column: number,
  cellPos: number,
  cellNode: Node
): CellInfo {
  return {
    row,
    column,
    pos: cellPos,
    node: cellNode,
    start: cellPos + 1,
    depth: cellNode ? cellNode.content.size : 0,
  }
}

/**
 * Checks if a cell is merged (has colspan or rowspan > 1)
 */
export function isCellMerged(node: Node | null): boolean {
  if (!node) return false
  const colspan = node.attrs.colspan ?? 1
  const rowspan = node.attrs.rowspan ?? 1
  return colspan > 1 || rowspan > 1
}

/**
 * Generic function to collect cells along a row or column
 */
function collectCells(
  editor: Editor | null,
  orientation: Orientation,
  index?: number,
  tablePos?: number
): { cells: CellInfo[]; mergedCells: CellInfo[] } {
  if (!editor) return EMPTY_CELLS_RESULT

  const { state } = editor
  const table = getTable(editor, tablePos)
  if (!table) return EMPTY_CELLS_RESULT

  const tableStart = table.start
  const tableNode = table.node
  const map = table.map

  const resolvedIndex = resolveOrientationIndex(
    state,
    table,
    orientation,
    index
  )
  if (resolvedIndex === null) return EMPTY_CELLS_RESULT

  // Bounds check
  const maxIndex = orientation === "row" ? map.height : map.width
  if (resolvedIndex < 0 || resolvedIndex >= maxIndex) {
    return EMPTY_CELLS_RESULT
  }

  const cells: CellInfo[] = []
  const mergedCells: CellInfo[] = []
  const seenMerged = new Set<number>()

  const iterationCount = orientation === "row" ? map.width : map.height

  for (let i = 0; i < iterationCount; i++) {
    const row = orientation === "row" ? resolvedIndex : i
    const col = orientation === "row" ? i : resolvedIndex
    const cellIndex = row * map.width + col
    const mapCell = map.map[cellIndex]

    if (mapCell === undefined) continue

    const cellPos = tableStart + mapCell
    const cellNode = tableNode.nodeAt(mapCell)
    if (!cellNode) continue

    const cell = createCellInfo(row, col, cellPos, cellNode)

    if (isCellMerged(cellNode)) {
      if (!seenMerged.has(cellPos)) {
        mergedCells.push(cell)
        seenMerged.add(cellPos)
      }
    }

    cells.push(cell)
  }

  return { cells, mergedCells }
}

/**
 * Generic function to count empty cells from the end of a row or column
 */
function countEmptyCellsFromEnd(
  editor: Editor,
  tablePos: number,
  orientation: Orientation
): number {
  const table = getTable(editor, tablePos)
  if (!table) return 0

  const { doc } = editor.state
  const maxIndex = orientation === "row" ? table.map.height : table.map.width

  let emptyCount = 0
  for (let idx = maxIndex - 1; idx >= 0; idx--) {
    const seen = new Set<number>()
    let isLineEmpty = true

    const iterationCount =
      orientation === "row" ? table.map.width : table.map.height

    for (let i = 0; i < iterationCount; i++) {
      const row = orientation === "row" ? idx : i
      const col = orientation === "row" ? i : idx
      const rel = table.map.positionAt(row, col, table.node)

      if (seen.has(rel)) continue
      seen.add(rel)

      const abs = tablePos + 1 + rel
      const cell = doc.nodeAt(abs)
      if (!cell) continue

      if (!isCellEmpty(cell)) {
        isLineEmpty = false
        break
      }
    }

    if (isLineEmpty) emptyCount++
    else break
  }

  return emptyCount
}

/**
 * Get information about the table at the current selection or a specific position.
 *
 * If `tablePos` is provided, it looks for a table at that exact position.
 * Otherwise, it finds the nearest table containing the current selection.
 *
 * Returns an object with:
 * - `node`: the table node
 * - `pos`: the position of the table in the document
 * - `start`: the position just after the table node (where its content starts)
 * - `map`: the `TableMap` for layout info (rows, columns, spans)
 *
 * If no table is found, returns null.
 */
export function getTable(editor: Editor | null, tablePos?: number) {
  if (!editor) return null

  let table = null

  if (typeof tablePos === "number") {
    const tableNode = editor.state.doc.nodeAt(tablePos)
    if (tableNode?.type.name === "table") {
      table = {
        node: tableNode,
        pos: tablePos,
        start: tablePos + 1,
        depth: editor.state.doc.resolve(tablePos).depth,
      }
    }
  }

  if (!table) {
    const { state } = editor
    const $from = state.doc.resolve(state.selection.from)
    table = findTable($from)
  }

  if (!table) return null

  const tableMap = TableMap.get(table.node)
  if (!tableMap) return null

  return { ...table, map: tableMap }
}

/**
 * Checks if the current text selection is inside a table cell.
 * @param state - The editor state to check
 * @returns true if the selection is inside a table cell; false otherwise
 */
export function isSelectionInCell(state: EditorState): boolean {
  const { selection } = state
  const $from = selection.$from

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      return true
    }
  }

  return false
}

/**
 * Cells overlap a rectangle if any of the cells in the rectangle are merged
 * with cells outside the rectangle.
 */
export function cellsOverlapRectangle(
  { width, height, map }: TableMap,
  rect: Rect
) {
  let indexTop = rect.top * width + rect.left,
    indexLeft = indexTop
  let indexBottom = (rect.bottom - 1) * width + rect.left,
    indexRight = indexTop + (rect.right - rect.left - 1)
  for (let i = rect.top; i < rect.bottom; i++) {
    if (
      (rect.left > 0 && map[indexLeft] == map[indexLeft - 1]) ||
      (rect.right < width && map[indexRight] == map[indexRight + 1])
    )
      return true
    indexLeft += width
    indexRight += width
  }
  for (let i = rect.left; i < rect.right; i++) {
    if (
      (rect.top > 0 && map[indexTop] == map[indexTop - width]) ||
      (rect.bottom < height && map[indexBottom] == map[indexBottom + width])
    )
      return true
    indexTop++
    indexBottom++
  }
  return false
}

/**
 * Runs a function while preserving the editor's selection.
 * @param editor The Tiptap editor instance
 * @param fn The function to run
 * @returns True if the selection was successfully restored, false otherwise
 */
export function runPreservingCursor(editor: Editor, fn: () => void): boolean {
  const view = editor.view
  const startSel = view.state.selection
  const bookmark = startSel.getBookmark()

  const mapping = new Mapping()
  const originalDispatch = view.dispatch

  view.dispatch = (tr) => {
    mapping.appendMapping(tr.mapping)
    originalDispatch(tr)
  }

  try {
    fn()
  } finally {
    view.dispatch = originalDispatch
  }

  try {
    const sel = bookmark.map(mapping).resolve(view.state.doc)
    view.dispatch(view.state.tr.setSelection(sel))
    return true
  } catch {
    // Fallback: if the exact spot vanished (e.g., cell deleted),
    // go to the nearest valid position.
    const mappedPos = mapping.map(startSel.from, -1)
    const clamped = clamp(mappedPos, 0, view.state.doc.content.size)
    const near = Selection.near(view.state.doc.resolve(clamped), -1)
    view.dispatch(view.state.tr.setSelection(near))
    return false
  }
}

/**
 * Determines whether a table cell is effectively empty.
 *
 * A cell is considered empty when:
 *  - it has no children, or
 *  - it contains only whitespace text, or
 *  - it contains no text and no non-text leaf nodes (images, embeds, etc.)
 *
 * Early-outs as soon as any meaningful content is found.
 *
 * @param cellNode - The table cell node to check
 * @returns true if the cell is empty; false otherwise
 */
export function isCellEmpty(cellNode: Node): boolean {
  if (cellNode.childCount === 0) return true

  let isEmpty = true
  cellNode.descendants((n) => {
    if (n.isText && n.text?.trim()) {
      isEmpty = false
      return false
    }
    if (n.isLeaf && !n.isText) {
      isEmpty = false
      return false
    }
    return true
  })

  return isEmpty
}

/**
 * Determine if the current selection is a full row or column selection.
 *
 * If the selection is a `CellSelection` that spans an entire row or column,
 * returns an object indicating the type and index:
 * - `{ type: "row", index: number }` for full row selections
 * - `{ type: "column", index: number }` for full column selections
 *
 * If the selection is not a full row/column, or if no table is found, returns null.
 */
export function getTableSelectionType(
  editor: Editor | null,
  index?: number,
  orientation?: Orientation,
  tablePos?: number
): { orientation: Orientation; index: number } | null {
  if (typeof index === "number" && orientation) {
    return { orientation, index }
  }

  if (!editor) return null

  const { state } = editor

  const table = getTable(editor, tablePos)
  if (!table) return null

  if (state.selection instanceof CellSelection) {
    const rect = selectedRect(state)
    const width = rect.right - rect.left
    const height = rect.bottom - rect.top

    if (height === 1 && width >= 1) {
      return { orientation: "row", index: rect.top }
    }

    if (width === 1 && height >= 1) {
      return { orientation: "column", index: rect.left }
    }

    return null
  }

  return null
}

/**
 * Get all cells (and unique merged cells) in the selected row or column.
 *
 * - If `index` is provided, uses that row/column index.
 * - If omitted, uses the first selected row/column based on current selection.
 *
 * Returns an object with:
 * - `cells`: all cells in the row/column
 * - `mergedCells`: only the unique cells that have rowspan/colspan > 1
 *
 * If no valid selection or index is found, returns empty arrays.
 */
export function getRowOrColumnCells(
  editor: Editor | null,
  index?: number,
  orientation?: Orientation,
  tablePos?: number
): {
  cells: CellInfo[]
  mergedCells: CellInfo[]
  index?: number
  orientation?: Orientation
  tablePos?: number
} {
  const emptyResult = {
    cells: [],
    mergedCells: [],
    index: undefined,
    orientation: undefined,
    tablePos: undefined,
  }

  if (!editor) {
    return emptyResult
  }

  if (
    typeof index !== "number" &&
    !(editor.state.selection instanceof CellSelection)
  ) {
    return emptyResult
  }

  let finalIndex = index
  let finalOrientation = orientation

  if (
    typeof finalIndex !== "number" ||
    !finalOrientation ||
    !["row", "column"].includes(finalOrientation)
  ) {
    const selectionType = getTableSelectionType(editor)
    if (!selectionType) return emptyResult

    finalIndex = selectionType.index
    finalOrientation = selectionType.orientation
  }

  const result = collectCells(editor, finalOrientation, finalIndex, tablePos)
  return { ...result, index: finalIndex, orientation: finalOrientation }
}

/**
 * Collect cells (and unique merged cells) from a specific row.
 * - If `rowIndex` is provided, scans that row.
 * - If omitted, uses the first (topmost) selected row based on the current selection.
 */
export function getRowCells(
  editor: Editor | null,
  rowIndex?: number,
  tablePos?: number
): { cells: CellInfo[]; mergedCells: CellInfo[] } {
  return collectCells(editor, "row", rowIndex, tablePos)
}

/**
 * Collect cells (and unique merged cells) from the current table.
 * - If `columnIndex` is provided, scans that column.
 * - If omitted, uses the first (leftmost) selected column based on the current selection.
 */
export function getColumnCells(
  editor: Editor | null,
  columnIndex?: number,
  tablePos?: number
): { cells: CellInfo[]; mergedCells: CellInfo[] } {
  return collectCells(editor, "column", columnIndex, tablePos)
}

/**
 * After moving a row or column, update the selection to the moved item.
 *
 * This ensures that after a move operation, the selection remains on the
 * moved row or column, providing better user feedback.
 *
 * @param editor - The editor instance
 * @param orientation - "row" or "column" indicating what was moved
 * @param newIndex - The new index of the moved row/column
 * @param tablePos - Optional position of the table in the document
 */
export function updateSelectionAfterAction(
  editor: Editor,
  orientation: Orientation,
  newIndex: number,
  tablePos?: number
): void {
  try {
    const table = getTable(editor, tablePos)
    if (!table) return

    const { state } = editor
    const { map } = table

    if (orientation === "row") {
      if (newIndex >= 0 && newIndex < map.height) {
        const startCol = 0
        const endCol = map.width - 1

        const startCellPos =
          table.start + map.positionAt(newIndex, startCol, table.node)
        const endCellPos =
          table.start + map.positionAt(newIndex, endCol, table.node)

        const $start = state.doc.resolve(startCellPos)
        const $end = state.doc.resolve(endCellPos)

        const newSelection = CellSelection.create(
          state.doc,
          $start.pos,
          $end.pos
        )
        const tr = state.tr.setSelection(newSelection)
        editor.view.dispatch(tr)
      }
    } else if (orientation === "column") {
      if (newIndex >= 0 && newIndex < map.width) {
        const startRow = 0
        const endRow = map.height - 1

        const startCellPos =
          table.start + map.positionAt(startRow, newIndex, table.node)
        const endCellPos =
          table.start + map.positionAt(endRow, newIndex, table.node)

        const $start = state.doc.resolve(startCellPos)
        const $end = state.doc.resolve(endCellPos)

        const newSelection = CellSelection.create(
          state.doc,
          $start.pos,
          $end.pos
        )
        const tr = state.tr.setSelection(newSelection)
        editor.view.dispatch(tr)
      }
    }
  } catch (error) {
    console.warn("Failed to update selection after move:", error)
  }
}

/**
 * Returns a command that sets the given attributes to the given values,
 * and is only available when the currently selected cell doesn't
 * already have those attributes set to those values.
 *
 * @public
 */
export function setCellAttr(attrs: Record<string, unknown>): Command
export function setCellAttr(name: string, value: unknown): Command
export function setCellAttr(
  nameOrAttrs: string | Record<string, unknown>,
  value?: unknown
): Command {
  return function (state, dispatch) {
    if (!isInTable(state)) return false
    const $cell = selectionCell(state)

    const attrs =
      typeof nameOrAttrs === "string" ? { [nameOrAttrs]: value } : nameOrAttrs

    if (dispatch) {
      const tr = state.tr
      if (state.selection instanceof CellSelection) {
        state.selection.forEachCell((node, pos) => {
          const needsUpdate = Object.entries(attrs).some(
            ([name, val]) => node.attrs[name] !== val
          )

          if (needsUpdate) {
            tr.setNodeMarkup(pos, null, {
              ...node.attrs,
              ...attrs,
            })
          }
        })
      } else {
        const needsUpdate = Object.entries(attrs).some(
          ([name, val]) => $cell.nodeAfter!.attrs[name] !== val
        )

        if (needsUpdate) {
          tr.setNodeMarkup($cell.pos, null, {
            ...$cell.nodeAfter!.attrs,
            ...attrs,
          })
        }
      }
      dispatch(tr)
    }
    return true
  }
}

/**
 * Counts how many consecutive empty rows exist at the bottom of a given table.
 *
 * This function:
 *  - Locates the exact table in the document via reference matching
 *  - Iterates from the last visual row upward
 *  - Deduplicates cells per row using `TableMap` (merged cells can repeat positions)
 *  - Treats a row as empty only if all its unique cells are empty by `isCellEmpty`
 *
 * @param editor - The editor whose document contains the table
 * @param target - The table node instance to analyze (must be the same reference as in the doc)
 * @returns The number of trailing empty rows (0 if table not found)
 */
export function countEmptyRowsFromEnd(
  editor: Editor,
  tablePos: number
): number {
  return countEmptyCellsFromEnd(editor, tablePos, "row")
}

/**
 * Counts how many consecutive empty columns exist at the right edge of a given table.
 *
 * Similar to `countEmptyRowsFromEnd`, but scans by columns:
 *  - Iterates from the last visual column leftward
 *  - Deduplicates per-column cells using `TableMap`
 *  - A column is empty only if all unique cells in that column are empty
 *
 * @param editor - The editor whose document contains the table
 * @param target - The table node instance to analyze (must be the same reference as in the doc)
 * @returns The number of trailing empty columns (0 if table not found)
 */
export function countEmptyColumnsFromEnd(
  editor: Editor,
  tablePos: number
): number {
  return countEmptyCellsFromEnd(editor, tablePos, "column")
}

/**
 * Rounds a number with a symmetric "dead-zone" around integer boundaries,
 * which makes drag/resize UX feel less jittery near thresholds.
 *
 * For example, with `margin = 0.3`:
 *  - values < n + 0.3 snap down to `n`
 *  - values > n + 0.7 snap up to `n + 1`
 *  - values in [n + 0.3, n + 0.7] fall back to `Math.round`
 *
 * @param num - The floating value to round
 * @param margin - Half-width of the dead-zone around integer boundaries (default 0.3)
 * @returns The rounded value using the dead-zone heuristic
 */
export function marginRound(num: number, margin = 0.3): number {
  const floor = Math.floor(num)
  const ceil = Math.ceil(num)
  const lowerBound = floor + margin
  const upperBound = ceil - margin

  if (num < lowerBound) return floor
  if (num > upperBound) return ceil
  return Math.round(num)
}

/**
 * Compares two DOMRect objects for equality.
 *
 * Treats `undefined` as a valid state, where two `undefined` rects are equal,
 * and `undefined` is not equal to any defined rect.
 *
 * @param a - The first DOMRect or undefined
 * @param b - The second DOMRect or undefined
 * @returns true if both rects are equal or both are undefined; false otherwise
 */
export function rectEq(a?: DOMRect | null, b?: DOMRect | null): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height
  )
}

/**
 * Applies the transaction based on the specified mode
 */
function applySelectionWithMode(
  state: EditorState,
  transaction: Transaction,
  options: BaseSelectionOptions | DispatchSelectionOptions
): EditorState | Transaction | void {
  const mode: SelectionReturnMode = options.mode ?? "state"

  switch (mode) {
    case "dispatch": {
      const dispatchOptions = options as DispatchSelectionOptions
      if (typeof dispatchOptions.dispatch === "function") {
        dispatchOptions.dispatch(transaction)
      }
      return
    }

    case "transaction":
      return transaction

    default: // "state"
      return state.apply(transaction)
  }
}

/**
 * Create or apply a `CellSelection` inside a table.
 *
 * Depending on the `mode` option, this helper behaves differently:
 *
 * - `"state"` (default) → Returns a new `EditorState` with the selection applied.
 * - `"transaction"` → Returns a `Transaction` with the selection set, without applying it.
 * - `"dispatch"` → Immediately calls `dispatch(tr)` with the new selection.
 *
 * This allows you to reuse the same helper in commands, tests, or utilities
 * without duplicating logic.
 *
 * Example:
 * ```ts
 * // Get new state
 * const nextState = createTableCellSelection(state, tablePosition, { row: 1, col: 1 }, { row: 2, col: 3 })
 *
 * // Get transaction only
 * const tr = createTableCellSelection(state, tablePosition, { row: 0, col: 0 }, { row: 0, col: 2 }, { mode: "transaction" })
 *
 * // Dispatch directly
 * createTableCellSelection(state, tablePosition, { row: 1, col: 1 }, { row: 3, col: 2 }, { mode: "dispatch", dispatch })
 * ```
 */
export function createTableCellSelection(
  state: EditorState,
  tablePosition: number,
  startCell: CellCoordinates,
  endCell?: CellCoordinates,
  options?: StateSelectionOptions
): EditorState
export function createTableCellSelection(
  state: EditorState,
  tablePosition: number,
  startCell: CellCoordinates,
  endCell: CellCoordinates | undefined,
  options: TransactionSelectionOptions
): Transaction
export function createTableCellSelection(
  state: EditorState,
  tablePosition: number,
  startCell: CellCoordinates,
  endCell: CellCoordinates | undefined,
  options: DispatchSelectionOptions
): void

export function createTableCellSelection(
  state: EditorState,
  tablePosition: number,
  startCell: CellCoordinates,
  endCell: CellCoordinates = startCell,
  options: BaseSelectionOptions | DispatchSelectionOptions = { mode: "state" }
): EditorState | Transaction | void {
  const startCellPosition = getCellPosition(state, tablePosition, startCell)
  const endCellPosition = getCellPosition(state, tablePosition, endCell)

  if (!startCellPosition || !endCellPosition) {
    return
  }

  const transaction = state.tr.setSelection(
    new CellSelection(startCellPosition, endCellPosition)
  )

  return applySelectionWithMode(state, transaction, options)
}

/**
 * Get the position of a cell inside a table by relative row/col indices.
 * Returns the position *before* the cell, which is what `CellSelection` expects.
 */
export function getCellPosition(
  state: EditorState,
  tablePosition: number,
  cellCoordinates: CellCoordinates
) {
  const resolvedTablePosition = state.doc.resolve(tablePosition)
  const resolvedRowPosition = state.doc.resolve(
    resolvedTablePosition.posAtIndex(cellCoordinates.row) + 1
  )
  const resolvedColPosition = state.doc.resolve(
    resolvedRowPosition.posAtIndex(cellCoordinates.col)
  )

  const $cell = cellAround(resolvedColPosition)
  if (!$cell) return null

  return resolvedColPosition
}

/**
 * Selects table cells by their (row, col) coordinates.
 *
 * This function can be used in three modes:
 * - `"state"` (default) → Returns a new `EditorState` with the selection applied, or null if failed.
 * - `"transaction"` → Returns a `Transaction` with the selection set, or null if failed.
 * - `"dispatch"` → Immediately dispatches the selection and returns boolean success status.
 *
 * @param editor - The editor instance
 * @param tablePos - Position of the table in the document
 * @param coords - Array of {row, col} coordinates to select
 * @param options - Mode and dispatch options
 */
export function selectCellsByCoords(
  editor: Editor | null,
  tablePos: number,
  coords: { row: number; col: number }[],
  options?: StateSelectionOptions
): EditorState
export function selectCellsByCoords(
  editor: Editor | null,
  tablePos: number,
  coords: { row: number; col: number }[],
  options: TransactionSelectionOptions
): Transaction
export function selectCellsByCoords(
  editor: Editor | null,
  tablePos: number,
  coords: { row: number; col: number }[],
  options: DispatchSelectionOptions
): void
export function selectCellsByCoords(
  editor: Editor | null,
  tablePos: number,
  coords: { row: number; col: number }[],
  options: BaseSelectionOptions | DispatchSelectionOptions = { mode: "state" }
): EditorState | Transaction | void {
  if (!editor) return

  const table = getTable(editor, tablePos)
  if (!table) return

  const { state } = editor
  const tableMap = table.map

  const cleanedCoords = coords
    .map((coord) => ({
      row: clamp(coord.row, 0, tableMap.height - 1),
      col: clamp(coord.col, 0, tableMap.width - 1),
    }))
    .filter((coord) => isWithinBounds(coord.row, coord.col, tableMap))

  if (cleanedCoords.length === 0) {
    return
  }

  // --- Find the smallest rectangle that contains all our coordinates ---
  const allRows = cleanedCoords.map((coord) => coord.row)
  const topRow = Math.min(...allRows)
  const bottomRow = Math.max(...allRows)

  const allCols = cleanedCoords.map((coord) => coord.col)
  const leftCol = Math.min(...allCols)
  const rightCol = Math.max(...allCols)

  // --- Convert visual coordinates to document positions ---
  // Use TableMap.map array directly to handle merged cells correctly
  const getCellPositionFromMap = (row: number, col: number): number | null => {
    // TableMap.map is a flat array where each entry represents a cell
    // For merged cells, the same offset appears multiple times
    const cellOffset = tableMap.map[row * tableMap.width + col]
    if (cellOffset === undefined) return null

    // Convert the relative offset to an absolute position in the document
    // tablePos + 1 skips the table opening tag
    return tablePos + 1 + cellOffset
  }

  // Anchor = where the selection starts (top-left of bounding box)
  const anchorPosition = getCellPositionFromMap(topRow, leftCol)
  if (anchorPosition === null) return

  // Head = where the selection ends (usually bottom-right of bounding box)
  let headPosition = getCellPositionFromMap(bottomRow, rightCol)
  if (headPosition === null) return

  // --- Handle edge case with merged cells ---
  // If anchor and head point to the same cell, we need to find a different head
  // This happens when selecting a single merged cell or when all coords point to one cell
  if (headPosition === anchorPosition) {
    let foundDifferentCell = false

    // Search backwards from bottom-right to find a cell with a different position
    for (let row = bottomRow; row >= topRow && !foundDifferentCell; row--) {
      for (let col = rightCol; col >= leftCol && !foundDifferentCell; col--) {
        const candidatePosition = getCellPositionFromMap(row, col)

        if (
          candidatePosition !== null &&
          candidatePosition !== anchorPosition
        ) {
          headPosition = candidatePosition
          foundDifferentCell = true
        }
      }
    }
  }

  try {
    const anchorRef = state.doc.resolve(anchorPosition)
    const headRef = state.doc.resolve(headPosition)

    const cellSelection = new CellSelection(anchorRef, headRef)
    const transaction = state.tr.setSelection(cellSelection)

    return applySelectionWithMode(state, transaction, options)
  } catch (error) {
    console.error("Failed to create cell selection:", error)
    return
  }
}

/**
 * Select the cell at (row, col) using `cellAround` to respect merged cells.
 *
 * @param editor    Tiptap editor
 * @param row       Row index (0-based)
 * @param col       Column index (0-based)
 * @param tablePos  Optional absolute position of the table node
 * @param dispatch  Optional dispatch; defaults to editor.view.dispatch
 */
export function selectCellAt({
  editor,
  row,
  col,
  tablePos,
  dispatch,
}: {
  editor: Editor | null
  row: number
  col: number
  tablePos?: number
  dispatch?: (tr: Transaction) => void
}): boolean {
  if (!editor) return false

  const { state, view } = editor
  const found = getTable(editor, tablePos)
  if (!found) return false

  // Bounds check
  if (!isWithinBounds(row, col, found.map)) {
    return false
  }

  const relCellPos = found.map.positionAt(row, col, found.node)
  const absCellPos = found.start + relCellPos

  const $abs = state.doc.resolve(absCellPos)
  const $cell = cellAround($abs)
  const cellPos = $cell ? $cell.pos : absCellPos

  const sel = CellSelection.create(state.doc, cellPos)

  const doDispatch = dispatch ?? view?.dispatch
  if (!doDispatch) return false

  doDispatch(state.tr.setSelection(sel))
  return true
}

/**
 * Selects a boundary cell of the table based on orientation.
 *
 * For row orientation, selects the bottom-left cell of the table.
 * For column orientation, selects the top-right cell of the table.
 *
 * This function accounts for merged cells to ensure the correct cell is selected.
 *
 * @param editor      The Tiptap editor instance
 * @param tableNode   The table node
 * @param tablePos    The position of the table node in the document
 * @param orientation "row" to select bottom-left, "column" to select top-right
 * @returns true if the selection was successful; false otherwise
 */
export function selectLastCell(
  editor: Editor,
  tableNode: Node,
  tablePos: number,
  orientation: Orientation
) {
  const map = TableMap.get(tableNode)
  const isRow = orientation === "row"

  // For rows, select bottom-left cell; for columns, select top-right cell
  const row = isRow ? map.height - 1 : 0
  const col = isRow ? 0 : map.width - 1

  // Calculate the index in the table map
  const index = row * map.width + col

  // Get the actual cell position from the map (handles merged cells)
  const cellPos = map.map[index]
  if (!cellPos && cellPos !== 0) {
    console.warn("selectLastCell: cell position not found in map", {
      index,
      row,
      col,
      map,
    })
    return false
  }

  // Find the row and column of the actual cell
  const cellIndex = map.map.indexOf(cellPos)
  const actualRow = cellIndex >= 0 ? Math.floor(cellIndex / map.width) : 0
  const actualCol = cellIndex >= 0 ? cellIndex % map.width : 0

  return selectCellAt({
    editor,
    row: actualRow,
    col: actualCol,
    tablePos,
    dispatch: editor.view.dispatch.bind(editor.view),
  })
}

/**
 * Get all (row, col) coordinates for a given row or column index.
 *
 * - If `orientation` is "row", returns all columns in that row.
 * - If `orientation` is "column", returns all rows in that column.
 *
 * Returns null if:
 * - the editor or table is not found
 * - the index is out of bounds
 *
 * @param editor      The Tiptap editor instance
 * @param index       The row or column index (0-based)
 * @param orientation "row" to get row coordinates, "column" for column coordinates
 * @param tablePos    Optional position of the table node in the document
 * @returns Array of {row, col} objects or null if invalid
 */
export function getIndexCoordinates({
  editor,
  index,
  orientation,
  tablePos,
}: {
  editor: Editor | null
  index: number
  orientation?: Orientation
  tablePos?: number
}): { row: number; col: number }[] | null {
  if (!editor) return null

  const table = getTable(editor, tablePos)
  if (!table) return null

  const { map } = table
  const { width, height } = map

  if (index < 0) return null
  if (orientation === "row" && index >= height) return null
  if (orientation === "column" && index >= width) return null

  return orientation === "row"
    ? Array.from({ length: map.width }, (_, col) => ({ row: index, col }))
    : Array.from({ length: map.height }, (_, row) => ({ row, col: index }))
}

/**
 * Given a DOM cell element, find its (row, col) indices within the table.
 *
 * This function:
 * - Locates the nearest ancestor table element
 * - Uses the editor's document model to resolve the cell's position
 * - Traverses up the node hierarchy to find the corresponding table cell node
 * - Uses `TableMap` to translate the cell's position into (row, col) indices
 *
 * Returns null if:
 * - the table or cell cannot be found in the editor's document
 * - any error occurs during position resolution
 *
 * @param cell      The HTMLTableCellElement (td or th)
 * @param tableNode The table node in the ProseMirror document
 * @param editor    The Tiptap editor instance
 * @returns An object with { rowIndex, colIndex } or null if not found
 */
export function getCellIndicesFromDOM(
  cell: HTMLTableCellElement,
  tableNode: Node | null,
  editor: Editor
): { rowIndex: number; colIndex: number } | null {
  if (!tableNode) return null

  try {
    const cellPos = editor.view.posAtDOM(cell, 0)
    const $cellPos = editor.view.state.doc.resolve(cellPos)

    for (let d = $cellPos.depth; d > 0; d--) {
      const node = $cellPos.node(d)
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        const tableMap = TableMap.get(tableNode)
        const cellNodePos = $cellPos.before(d)
        const tableStart = $cellPos.start(d - 2)
        const cellOffset = cellNodePos - tableStart
        const cellIndex = tableMap.map.indexOf(cellOffset)

        return {
          rowIndex: Math.floor(cellIndex / tableMap.width),
          colIndex: cellIndex % tableMap.width,
        }
      }
    }
  } catch (error) {
    console.warn("Could not get cell position:", error)
  }
  return null
}

/**
 * Given a DOM element inside a table, find the corresponding table node and its position.
 *
 * This function:
 * - Locates the nearest ancestor table element
 * - Uses the editor's document model to resolve the table's position
 * - Traverses up the node hierarchy to find the corresponding table node
 *
 * Returns null if:
 * - the table cannot be found in the editor's document
 * - any error occurs during position resolution
 *
 * @param tableElement The HTMLTableElement or an element inside it
 * @param editor       The Tiptap editor instance
 * @returns An object with { node: tableNode, pos: tablePos } or null if not found
 */
export function getTableFromDOM(
  tableElement: HTMLElement,
  editor: Editor
): { node: Node; pos: number } | null {
  try {
    const pos = editor.view.posAtDOM(tableElement, 0)
    const $pos = editor.view.state.doc.resolve(pos)

    for (let d = $pos.depth; d >= 0; d--) {
      const node = $pos.node(d)
      if (isTableNode(node)) {
        return { node, pos: d === 0 ? 0 : $pos.before(d) }
      }
    }
  } catch (error) {
    console.warn("Could not get table from DOM:", error)
  }
  return null
}

/**
 * Checks if a node is a table node
 */
export function isTableNode(node: Node | null | undefined): node is Node {
  return (
    !!node &&
    (node.type.name === "table" || node.type.spec.tableRole === "table")
  )
}
