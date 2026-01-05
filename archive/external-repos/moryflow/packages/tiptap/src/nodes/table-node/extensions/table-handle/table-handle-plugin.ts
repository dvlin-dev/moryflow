import type { Editor } from "@tiptap/core"
import type { Node as TiptapNode } from "@tiptap/pm/model"
import type { PluginView, Transaction } from "@tiptap/pm/state"
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state"
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view"
import {
  CellSelection,
  moveTableColumn,
  moveTableRow,
  TableMap,
} from "@tiptap/pm/tables"
import {
  clamp,
  domCellAround,
  getCellIndicesFromDOM,
  getColumnCells,
  getIndexCoordinates,
  getRowCells,
  getTableFromDOM,
  isHTMLElement,
  isTableNode,
  safeClosest,
  selectCellsByCoords,
} from "../../lib/tiptap-table-utils"
import { isValidPosition } from "../../../../utils/tiptap-utils"
import { createTableDragImage } from "../table-handle/helpers/create-image"

export type TableHandlesState = {
  show: boolean
  showAddOrRemoveRowsButton: boolean
  showAddOrRemoveColumnsButton: boolean
  referencePosCell?: DOMRect
  referencePosTable: DOMRect
  block: TiptapNode
  blockPos: number
  colIndex: number | undefined
  rowIndex: number | undefined
  draggingState?:
    | {
        draggedCellOrientation: "row" | "col"
        originalIndex: number
        mousePos: number
        initialOffset: number
      }
    | undefined
  widgetContainer: HTMLElement | undefined
}

function hideElements(selector: string, rootEl: Document | ShadowRoot) {
  rootEl.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    el.style.visibility = "hidden"
  })
}

export const tableHandlePluginKey = new PluginKey("tableHandlePlugin")

class TableHandleView implements PluginView {
  public editor: Editor
  public editorView: EditorView

  public state: TableHandlesState | undefined = undefined
  public menuFrozen = false
  public mouseState: "up" | "down" | "selecting" = "up"
  public tableId: string | undefined
  public tablePos: number | undefined
  public tableElement: HTMLElement | undefined

  public emitUpdate: () => void

  constructor(
    editor: Editor,
    editorView: EditorView,
    emitUpdate: (state: TableHandlesState) => void
  ) {
    this.editor = editor
    this.editorView = editorView
    this.emitUpdate = () => this.state && emitUpdate(this.state)

    this.editorView.dom.addEventListener("mousemove", this.mouseMoveHandler)
    this.editorView.dom.addEventListener("mousedown", this.viewMousedownHandler)
    window.addEventListener("mouseup", this.mouseUpHandler)

    this.editorView.root.addEventListener(
      "dragover",
      this.dragOverHandler as EventListener
    )
    this.editorView.root.addEventListener(
      "drop",
      this.dropHandler as unknown as EventListener
    )
  }

  private viewMousedownHandler = (event: MouseEvent) => {
    this.mouseState = "down"

    const { state, view } = this.editor
    if (!(state.selection instanceof CellSelection) || this.editor.isFocused)
      return

    const posInfo = view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    })
    if (!posInfo) return

    const $pos = state.doc.resolve(posInfo.pos)
    const { nodes } = state.schema
    let paraDepth = -1
    let inTableCell = false

    for (let d = $pos.depth; d >= 0; d--) {
      const node = $pos.node(d)
      if (
        !inTableCell &&
        (node.type === nodes.tableCell || node.type === nodes.tableHeader)
      ) {
        inTableCell = true
      }
      if (paraDepth === -1 && node.type === nodes.paragraph) {
        paraDepth = d
      }
      if (inTableCell && paraDepth !== -1) break
    }

    if (!inTableCell || paraDepth === -1) return

    const from = $pos.start(paraDepth)
    const to = $pos.end(paraDepth)
    const nextSel = TextSelection.create(state.doc, from, to)
    if (state.selection.eq(nextSel)) return

    view.dispatch(state.tr.setSelection(nextSel))
    view.focus()
  }

  private mouseUpHandler = (event: MouseEvent) => {
    this.mouseState = "up"
    this.mouseMoveHandler(event)
  }

  private mouseMoveHandler = (event: MouseEvent) => {
    if (this.menuFrozen || this.mouseState === "selecting") return

    const target = event.target
    if (!isHTMLElement(target) || !this.editorView.dom.contains(target)) return

    this._handleMouseMoveNow(event)
  }

  private hideHandles() {
    if (!this.state?.show) return

    this.state = {
      ...this.state,
      show: false,
      showAddOrRemoveRowsButton: false,
      showAddOrRemoveColumnsButton: false,
      colIndex: undefined,
      rowIndex: undefined,
      referencePosCell: undefined,
    }
    this.emitUpdate()
  }

  private _handleMouseMoveNow(event: MouseEvent) {
    const around = domCellAround(event.target as Element)

    // Hide handles while selecting inside a cell
    if (
      around?.type === "cell" &&
      this.mouseState === "down" &&
      !this.state?.draggingState
    ) {
      this.mouseState = "selecting"
      this.hideHandles()
      return
    }

    if (!around || !this.editor.isEditable) {
      this.hideHandles()
      return
    }

    const tbody = around.tbodyNode
    if (!tbody) return

    const tableRect = tbody.getBoundingClientRect()
    const coords = this.editor.view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    })
    if (!coords) return

    // Find the table node at this position
    const $pos = this.editor.view.state.doc.resolve(coords.pos)
    let blockInfo: { node: TiptapNode; pos: number } | undefined
    for (let d = $pos.depth; d >= 0; d--) {
      const node = $pos.node(d)
      if (isTableNode(node)) {
        blockInfo = { node, pos: d === 0 ? 0 : $pos.before(d) }
        break
      }
    }
    if (!blockInfo || blockInfo.node.type.name !== "table") return

    this.tableElement = this.editor.view.nodeDOM(blockInfo.pos) as
      | HTMLElement
      | undefined
    this.tablePos = blockInfo.pos
    this.tableId = blockInfo.node.attrs.id

    const wrapper = safeClosest<HTMLElement>(around.domNode, ".tableWrapper")
    const widgetContainer = wrapper?.querySelector(".table-controls") as
      | HTMLElement
      | undefined

    // Hovering around the table (outside cells)
    if (around.type === "wrapper") {
      const below =
        event.clientY >= tableRect.bottom - 1 &&
        event.clientY < tableRect.bottom + 20
      const right =
        event.clientX >= tableRect.right - 1 &&
        event.clientX < tableRect.right + 20
      const cursorBeyondRightOrBottom =
        event.clientX > tableRect.right || event.clientY > tableRect.bottom

      this.state = {
        ...this.state,
        show: true,
        showAddOrRemoveRowsButton: below,
        showAddOrRemoveColumnsButton: right,
        referencePosTable: tableRect,
        block: blockInfo.node,
        blockPos: blockInfo.pos,
        widgetContainer,
        colIndex: cursorBeyondRightOrBottom ? undefined : this.state?.colIndex,
        rowIndex: cursorBeyondRightOrBottom ? undefined : this.state?.rowIndex,
        referencePosCell: cursorBeyondRightOrBottom
          ? undefined
          : this.state?.referencePosCell,
      }
    } else {
      // Hovering over a cell
      const cellPosition = getCellIndicesFromDOM(
        around.domNode as HTMLTableCellElement,
        blockInfo.node,
        this.editor
      )
      if (!cellPosition) return

      const { rowIndex, colIndex } = cellPosition
      const cellRect = (around.domNode as HTMLElement).getBoundingClientRect()
      const lastRowIndex = blockInfo.node.content.childCount - 1
      const lastColIndex =
        (blockInfo.node.content.firstChild?.content.childCount ?? 0) - 1

      // Skip update if same cell
      if (
        this.state?.show &&
        this.tableId === blockInfo.node.attrs.id &&
        this.state.rowIndex === rowIndex &&
        this.state.colIndex === colIndex
      ) {
        return
      }

      this.state = {
        show: true,
        showAddOrRemoveColumnsButton: colIndex === lastColIndex,
        showAddOrRemoveRowsButton: rowIndex === lastRowIndex,
        referencePosTable: tableRect,
        block: blockInfo.node,
        blockPos: blockInfo.pos,
        draggingState: undefined,
        referencePosCell: cellRect,
        colIndex,
        rowIndex,
        widgetContainer,
      }
    }

    this.emitUpdate()
    return false
  }

  dragOverHandler = (event: DragEvent) => {
    if (this.state?.draggingState === undefined) {
      return
    }

    event.preventDefault()
    event.dataTransfer!.dropEffect = "move"

    hideElements(
      ".prosemirror-dropcursor-block, .prosemirror-dropcursor-inline",
      this.editorView.root
    )

    // The mouse cursor coordinates, bounded to the table's bounding box.
    const {
      left: tableLeft,
      right: tableRight,
      top: tableTop,
      bottom: tableBottom,
    } = this.state.referencePosTable

    const boundedMouseCoords = {
      left: clamp(event.clientX, tableLeft + 1, tableRight - 1),
      top: clamp(event.clientY, tableTop + 1, tableBottom - 1),
    }

    // Gets the table cell element
    const tableCellElements = this.editorView.root
      .elementsFromPoint(boundedMouseCoords.left, boundedMouseCoords.top)
      .filter((element) => element.tagName === "TD" || element.tagName === "TH")
    if (tableCellElements.length === 0) {
      return
    }
    const tableCellElement = tableCellElements[0]
    if (!isHTMLElement(tableCellElement)) {
      return
    }

    const cellPosition = getCellIndicesFromDOM(
      tableCellElement as HTMLTableCellElement,
      this.state.block,
      this.editor
    )
    if (!cellPosition) return

    const { rowIndex, colIndex } = cellPosition

    // Check what changed
    const oldIndex =
      this.state.draggingState.draggedCellOrientation === "row"
        ? this.state.rowIndex
        : this.state.colIndex
    const newIndex =
      this.state.draggingState.draggedCellOrientation === "row"
        ? rowIndex
        : colIndex
    const dispatchDecorationsTransaction = newIndex !== oldIndex

    const mousePos =
      this.state.draggingState.draggedCellOrientation === "row"
        ? boundedMouseCoords.top
        : boundedMouseCoords.left

    // Check if anything needs updating
    const cellChanged =
      this.state.rowIndex !== rowIndex || this.state.colIndex !== colIndex
    const mousePosChanged = this.state.draggingState.mousePos !== mousePos

    if (cellChanged || mousePosChanged) {
      this.state = {
        ...this.state,
        rowIndex: rowIndex,
        colIndex: colIndex,
        referencePosCell: tableCellElement.getBoundingClientRect(),
        draggingState: {
          ...this.state.draggingState,
          mousePos: mousePos,
        },
      }

      this.emitUpdate()
    }

    // Dispatch decorations transaction if needed
    if (dispatchDecorationsTransaction) {
      this.editor.view.dispatch(
        this.editor.state.tr.setMeta(tableHandlePluginKey, true)
      )
    }
  }

  dropHandler = () => {
    this.mouseState = "up"

    const st = this.state
    if (!st?.draggingState) return false

    const { draggingState, rowIndex, colIndex, blockPos } = st
    if (!isValidPosition(blockPos)) return false

    if (
      (draggingState.draggedCellOrientation === "row" &&
        rowIndex === undefined) ||
      (draggingState.draggedCellOrientation === "col" && colIndex === undefined)
    ) {
      throw new Error(
        "Attempted to drop table row or column, but no table block was hovered prior."
      )
    }

    const isRow = draggingState.draggedCellOrientation === "row"
    const orientation = isRow ? "row" : "column"
    const destIndex = isRow ? rowIndex! : colIndex!

    const cellCoords = getIndexCoordinates({
      editor: this.editor,
      index: draggingState.originalIndex,
      orientation,
      tablePos: blockPos,
    })
    if (!cellCoords) return false

    const stateWithCellSel = selectCellsByCoords(
      this.editor,
      blockPos,
      cellCoords,
      { mode: "state" }
    )
    if (!stateWithCellSel) return false

    const dispatch = (tr: Transaction) => this.editor.view.dispatch(tr)

    if (isRow) {
      moveTableRow({
        from: draggingState.originalIndex,
        to: destIndex,
        select: true,
        pos: blockPos + 1,
      })(stateWithCellSel, dispatch)
    } else {
      moveTableColumn({
        from: draggingState.originalIndex,
        to: destIndex,
        select: true,
        pos: blockPos + 1,
      })(stateWithCellSel, dispatch)
    }

    this.state = { ...st, draggingState: undefined }
    this.emitUpdate()

    this.editor.view.dispatch(
      this.editor.state.tr.setMeta(tableHandlePluginKey, null)
    )

    return true
  }

  update(view: EditorView): void {
    const pluginState = tableHandlePluginKey.getState(view.state)
    if (pluginState !== undefined && pluginState !== this.menuFrozen) {
      this.menuFrozen = pluginState
    }

    if (!this.state?.show) return

    if (!this.tableElement?.isConnected) {
      this.hideHandles()
      return
    }

    const tableInfo = getTableFromDOM(this.tableElement, this.editor)
    if (!tableInfo) {
      this.hideHandles()
      return
    }

    // Check if table changed
    const blockChanged =
      this.state.block !== tableInfo.node ||
      this.state.blockPos !== tableInfo.pos

    if (
      !tableInfo.node ||
      tableInfo.node.type.name !== "table" ||
      !this.tableElement?.isConnected
    ) {
      this.hideHandles()
      return
    }

    const { height: rowCount, width: colCount } = TableMap.get(tableInfo.node)

    // Calculate new indices
    let newRowIndex = this.state.rowIndex
    let newColIndex = this.state.colIndex

    // Clamp indices if rows/columns were deleted
    if (newRowIndex !== undefined && newRowIndex >= rowCount) {
      newRowIndex = rowCount ? rowCount - 1 : undefined
    }
    if (newColIndex !== undefined && newColIndex >= colCount) {
      newColIndex = colCount ? colCount - 1 : undefined
    }

    const tableBody = this.tableElement.querySelector("tbody")
    if (!tableBody) {
      throw new Error(
        "Table block does not contain a 'tbody' HTML element. This should never happen."
      )
    }

    // Calculate new reference positions
    let newReferencePosCell = this.state.referencePosCell
    if (newRowIndex !== undefined && newColIndex !== undefined) {
      const rowEl = tableBody.children[newRowIndex]
      const cellEl = rowEl?.children[newColIndex]

      if (cellEl) {
        newReferencePosCell = cellEl.getBoundingClientRect()
      } else {
        newRowIndex = undefined
        newColIndex = undefined
        newReferencePosCell = undefined
      }
    }

    const newReferencePosTable = tableBody.getBoundingClientRect()

    // Check if anything changed
    const indicesChanged =
      newRowIndex !== this.state.rowIndex || newColIndex !== this.state.colIndex
    const refPosChanged =
      newReferencePosCell !== this.state.referencePosCell ||
      newReferencePosTable !== this.state.referencePosTable

    if (blockChanged || indicesChanged || refPosChanged) {
      this.state = {
        ...this.state,
        block: tableInfo.node,
        blockPos: tableInfo.pos,
        rowIndex: newRowIndex,
        colIndex: newColIndex,
        referencePosCell: newReferencePosCell,
        referencePosTable: newReferencePosTable,
      }
      this.emitUpdate()
    }
  }

  destroy(): void {
    this.editorView.dom.removeEventListener(
      "mousemove",
      this.mouseMoveHandler as EventListener
    )
    window.removeEventListener("mouseup", this.mouseUpHandler as EventListener)
    this.editorView.dom.removeEventListener(
      "mousedown",
      this.viewMousedownHandler as EventListener
    )
    this.editorView.root.removeEventListener(
      "dragover",
      this.dragOverHandler as EventListener
    )
    this.editorView.root.removeEventListener(
      "drop",
      this.dropHandler as unknown as EventListener
    )
  }
}

let tableHandleView: TableHandleView | null = null

export function TableHandlePlugin(
  editor: Editor,
  emitUpdate: (state: TableHandlesState) => void
): Plugin {
  return new Plugin({
    key: tableHandlePluginKey,

    state: {
      init: () => false,
      apply: (tr, frozen) => {
        const meta = tr.getMeta(tableHandlePluginKey)
        return meta !== undefined ? meta : frozen
      },
    },

    view: (editorView) => {
      tableHandleView = new TableHandleView(editor, editorView, emitUpdate)

      return tableHandleView
    },

    props: {
      decorations: (state) => {
        if (!tableHandleView) return null

        if (
          tableHandleView === undefined ||
          tableHandleView.state === undefined ||
          tableHandleView.state.draggingState === undefined ||
          tableHandleView.tablePos === undefined
        ) {
          return
        }

        const newIndex =
          tableHandleView.state.draggingState.draggedCellOrientation === "row"
            ? tableHandleView.state.rowIndex
            : tableHandleView.state.colIndex

        if (newIndex === undefined) {
          return
        }

        const decorations: Decoration[] = []
        const { draggingState } = tableHandleView.state
        const { originalIndex } = draggingState

        if (
          tableHandleView.state.draggingState.draggedCellOrientation === "row"
        ) {
          const originalCells = getRowCells(
            editor,
            originalIndex,
            tableHandleView.state.blockPos
          )
          originalCells.cells.forEach((cell) => {
            if (cell.node) {
              decorations.push(
                Decoration.node(cell.pos, cell.pos + cell.node.nodeSize, {
                  class: "table-cell-dragging-source",
                })
              )
            }
          })
        } else {
          const originalCells = getColumnCells(
            editor,
            originalIndex,
            tableHandleView.state.blockPos
          )
          originalCells.cells.forEach((cell) => {
            if (cell.node) {
              decorations.push(
                Decoration.node(cell.pos, cell.pos + cell.node.nodeSize, {
                  class: "table-cell-dragging-source",
                })
              )
            }
          })
        }

        // Return empty decorations if:
        // - original index is same as new index (no change)
        // - editor is not defined for some reason
        if (newIndex === originalIndex || !editor) {
          return DecorationSet.create(state.doc, decorations)
        }

        if (
          tableHandleView.state.draggingState.draggedCellOrientation === "row"
        ) {
          const cellsInRow = getRowCells(
            editor,
            newIndex,
            tableHandleView.state.blockPos
          )

          cellsInRow.cells.forEach((cell) => {
            const cellNode = cell.node
            if (!cellNode) {
              return
            }

            // Creates a decoration at the start or end of each cell,
            // depending on whether the new index is before or after the
            // original index.
            const decorationPos =
              cell.pos + (newIndex > originalIndex ? cellNode.nodeSize - 2 : 2)
            decorations.push(
              Decoration.widget(decorationPos, () => {
                const widget = document.createElement("div")
                widget.className = "tiptap-table-dropcursor"
                widget.style.left = "0"
                widget.style.right = "0"
                // This is only necessary because the drop indicator's height
                // is an even number of pixels, whereas the border between
                // table cells is an odd number of pixels. So this makes the
                // positioning slightly more consistent regardless of where
                // the row is being dropped.
                if (newIndex > originalIndex) {
                  widget.style.bottom = "-1px"
                } else {
                  widget.style.top = "-1px"
                }
                widget.style.height = "3px"

                return widget
              })
            )
          })
        } else {
          const cellsInColumn = getColumnCells(
            editor,
            newIndex,
            tableHandleView.state.blockPos
          )
          cellsInColumn.cells.forEach((cell) => {
            const cellNode = cell.node
            if (!cellNode) {
              return
            }
            // Creates a decoration at the start or end of each cell,
            // depending on whether the new index is before or after the
            // original index.
            const decorationPos =
              cell.pos + (newIndex > originalIndex ? cellNode.nodeSize - 2 : 2)
            decorations.push(
              Decoration.widget(decorationPos, () => {
                const widget = document.createElement("div")
                widget.className = "tiptap-table-dropcursor"
                widget.style.top = "0"
                widget.style.bottom = "0"
                // This is only necessary because the drop indicator's width
                // is an even number of pixels, whereas the border between
                // table cells is an odd number of pixels. So this makes the
                // positioning slightly more consistent regardless of where
                // the column is being dropped.
                if (newIndex > originalIndex) {
                  widget.style.right = "-1px"
                } else {
                  widget.style.left = "-1px"
                }
                widget.style.width = "3px"
                return widget
              })
            )
          })
        }

        return DecorationSet.create(state.doc, decorations)
      },
    },
  })
}

/**
 * Shared drag start handler for table rows and columns
 */
const tableDragStart = (
  orientation: "col" | "row",
  event: {
    dataTransfer: DataTransfer | null
    currentTarget: EventTarget & Element
    clientX: number
    clientY: number
  }
) => {
  if (!tableHandleView?.state) {
    throw new Error(
      `Attempted to drag table ${orientation}, but no table block was hovered prior.`
    )
  }

  const { state, editor } = tableHandleView
  const index = orientation === "col" ? state.colIndex : state.rowIndex

  if (index === undefined) {
    throw new Error(
      `Attempted to drag table ${orientation}, but no table block was hovered prior.`
    )
  }

  const { blockPos, referencePosCell } = state
  const mousePos = orientation === "col" ? event.clientX : event.clientY

  // Clear cell selection to prevent table reference collapse
  if (editor.state.selection instanceof CellSelection) {
    const safeSel = TextSelection.near(editor.state.doc.resolve(blockPos), 1)
    editor.view.dispatch(editor.state.tr.setSelection(safeSel))
  }

  const dragImage = createTableDragImage(editor, orientation, index, blockPos)

  // Configure drag image
  if (event.dataTransfer) {
    const handleRect = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect()
    const offset =
      orientation === "col"
        ? { x: handleRect.width / 2, y: 0 }
        : { x: 0, y: handleRect.height / 2 }

    event.dataTransfer.effectAllowed =
      orientation === "col" ? "move" : "copyMove"
    event.dataTransfer.setDragImage(dragImage, offset.x, offset.y)
  }

  // Cleanup drag image
  const cleanup = () => dragImage.parentNode?.removeChild(dragImage)
  document.addEventListener("drop", cleanup, { once: true })
  document.addEventListener("dragend", cleanup, { once: true })

  const initialOffset = referencePosCell
    ? (orientation === "col" ? referencePosCell.left : referencePosCell.top) -
      mousePos
    : 0

  // Update dragging state
  tableHandleView.state = {
    ...state,
    draggingState: {
      draggedCellOrientation: orientation,
      originalIndex: index,
      mousePos,
      initialOffset,
    },
  }
  tableHandleView.emitUpdate()
  editor.view.dispatch(editor.state.tr.setMeta(tableHandlePluginKey, true))
}

/**
 * Callback for column drag handle
 */
export const colDragStart = (event: {
  dataTransfer: DataTransfer | null
  currentTarget: EventTarget & Element
  clientX: number
}) => tableDragStart("col", { ...event, clientY: 0 })

/**
 * Callback for row drag handle
 */
export const rowDragStart = (event: {
  dataTransfer: DataTransfer | null
  currentTarget: EventTarget & Element
  clientY: number
}) => tableDragStart("row", { ...event, clientX: 0 })

/**
 * Drag end cleanup
 */
export const dragEnd = () => {
  if (!tableHandleView || tableHandleView.state === undefined) {
    return
  }

  tableHandleView.state = {
    ...tableHandleView.state,
    draggingState: undefined,
  }
  tableHandleView.emitUpdate()

  const editor = tableHandleView.editor
  editor.view.dispatch(editor.state.tr.setMeta(tableHandlePluginKey, null))
}
