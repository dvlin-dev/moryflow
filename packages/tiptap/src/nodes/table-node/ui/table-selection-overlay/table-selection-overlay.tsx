"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type { Editor } from "@tiptap/react"
import {
  CellSelection,
  cellAround,
  columnResizingPluginKey,
} from "@tiptap/pm/tables"
import type { EditorState, Selection, Transaction } from "@tiptap/pm/state"
import type { Node } from "@tiptap/pm/model"
import type { EditorView } from "@tiptap/pm/view"
import { FloatingPortal, useFloating } from "@floating-ui/react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Lib ---
import {
  domCellAround,
  getTable,
  rectEq,
} from "../../lib/tiptap-table-utils"

export interface TableSelectionOverlayProps {
  editor?: Editor | null
  cellMenu?: React.ComponentType<{
    onOpenChange?: (isOpen: boolean) => void
    editor?: Editor | null
    onResizeStart?: (handle: ResizeHandle) => (event: React.MouseEvent) => void
  }>
  showResizeHandles?: boolean
  onMenuOpenChange?: (isOpen: boolean) => void
}

// tl = top-left
// tr = top-right
// bl = bottom-left
// br = bottom-right
type ResizeHandle = "tl" | "tr" | "bl" | "br" | null

// if an element’s edge is within 5px of the selection edge,
// it is treated as aligned.
const CORNER_DETECTION_TOLERANCE = 5

const getCellAtCoordinates = (
  state: EditorState,
  view: EditorView,
  x: number,
  y: number
) => {
  const pos = view.posAtCoords({ left: x, top: y })?.pos
  if (pos == null) return null

  const $pos = state.doc.resolve(pos)
  return cellAround($pos)
}

const getSelectionBoundingRect = (
  view: EditorView,
  selection: Selection
): DOMRect | null => {
  if (!(selection instanceof CellSelection)) return null

  const cells: Element[] = []
  selection.forEachCell((_node: Node, pos: number) => {
    const dom = view.nodeDOM(pos) as Element | null
    if (dom) cells.push(dom)
  })

  if (cells.length === 0) return null

  const bounds = {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  }

  cells.forEach((cell) => {
    const rect = cell.getBoundingClientRect()
    bounds.left = Math.min(bounds.left, rect.left)
    bounds.top = Math.min(bounds.top, rect.top)
    bounds.right = Math.max(bounds.right, rect.right)
    bounds.bottom = Math.max(bounds.bottom, rect.bottom)
  })

  return new DOMRect(
    bounds.left,
    bounds.top,
    bounds.right - bounds.left,
    bounds.bottom - bounds.top
  )
}

const getSingleCellBoundingRect = (
  view: EditorView,
  cellPos: number
): DOMRect | null => {
  const cellDom = view.nodeDOM(cellPos) as Element | null
  if (!cellDom) return null

  const rect = cellDom.getBoundingClientRect()
  return new DOMRect(rect.left, rect.top, rect.width, rect.height)
}

const createVirtualReference = (rect: DOMRect) => ({
  getBoundingClientRect: () => rect,
})

interface CornerPositions {
  topLeft: number | null
  topRight: number | null
  bottomLeft: number | null
  bottomRight: number | null
}

const findCornerCells = (
  view: EditorView,
  selection: CellSelection,
  selectionRect: DOMRect
): CornerPositions => {
  const corners: CornerPositions = {
    topLeft: null,
    topRight: null,
    bottomLeft: null,
    bottomRight: null,
  }

  // It takes two numbers: value1 and value2.
  // It calculates the absolute difference between them: Math.abs(value1 - value2).
  // It checks whether that difference is less than 5 (CORNER_DETECTION_TOLERANCE).
  // It returns a boolean:
  // true → if value1 and value2 are within 5 (CORNER_DETECTION_TOLERANCE) of each other.
  // false → if they are 5 or more units apart.
  const isNearEdge = (value1: number, value2: number) =>
    Math.abs(value1 - value2) < CORNER_DETECTION_TOLERANCE

  selection.forEachCell((_node: Node, pos: number) => {
    const dom = view.nodeDOM(pos) as Element | null
    if (!dom) return

    const cellRect = dom.getBoundingClientRect()

    // Top-left corner
    if (
      isNearEdge(cellRect.left, selectionRect.left) &&
      isNearEdge(cellRect.top, selectionRect.top)
    ) {
      corners.topLeft = pos
    }

    // Top-right corner
    if (
      isNearEdge(cellRect.right, selectionRect.right) &&
      isNearEdge(cellRect.top, selectionRect.top)
    ) {
      corners.topRight = pos
    }

    // Bottom-left corner
    if (
      isNearEdge(cellRect.left, selectionRect.left) &&
      isNearEdge(cellRect.bottom, selectionRect.bottom)
    ) {
      corners.bottomLeft = pos
    }

    // Bottom-right corner
    if (
      isNearEdge(cellRect.right, selectionRect.right) &&
      isNearEdge(cellRect.bottom, selectionRect.bottom)
    ) {
      corners.bottomRight = pos
    }
  })

  return corners
}

const getAnchorCellForHandle = (
  view: EditorView,
  selection: CellSelection,
  selectionRect: DOMRect,
  handle: ResizeHandle
): { pos: number } | null => {
  if (!handle) return null

  const corners = findCornerCells(view, selection, selectionRect)

  const anchorMap: Record<NonNullable<ResizeHandle>, keyof CornerPositions> = {
    tl: "bottomRight",
    tr: "bottomLeft",
    bl: "topRight",
    br: "topLeft",
  }

  const anchorPos = corners[anchorMap[handle]]
  return anchorPos ? { pos: anchorPos } : null
}

const createHandleStyles = (): React.CSSProperties => ({
  position: "absolute",
  width: 15,
  height: 15,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  pointerEvents: "auto",
  zIndex: 10,
})

const createCornerHandleStyles = (
  position: "tl" | "tr" | "bl" | "br",
  isActiveHandle: boolean,
  isDisabled: boolean = false
): React.CSSProperties => {
  const baseStyles = createHandleStyles()

  const positionStyles: Record<typeof position, React.CSSProperties> = {
    tl: {
      top: -7.5,
      left: -7.5,
      cursor: isDisabled ? "default" : "nwse-resize",
    },
    tr: {
      top: -7.5,
      right: -7.5,
      cursor: isDisabled ? "default" : "nesw-resize",
    },
    bl: {
      bottom: -7.5,
      left: -7.5,
      cursor: isDisabled ? "default" : "nesw-resize",
    },
    br: {
      bottom: -7.5,
      right: -7.5,
      cursor: isDisabled ? "default" : "nwse-resize",
    },
  }

  return {
    ...baseStyles,
    ...positionStyles[position],
    opacity: isDisabled ? 0.3 : isActiveHandle ? 1 : 0.5,
    pointerEvents: isDisabled ? "none" : "auto",
  }
}

export function useResizeOverlay(
  editor: Editor | null,
  updateSelectionRect: () => void
) {
  const rafId = useRef<number | null>(null)

  const stopLoop = useCallback(() => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current)
      rafId.current = null
    }
  }, [])

  const startLoop = useCallback(() => {
    if (rafId.current != null) return
    const tick = () => {
      const st = columnResizingPluginKey.getState(editor!.state)
      const dragging = !!st?.dragging
      updateSelectionRect() // mutate overlay styles; avoid setState if possible
      if (dragging) {
        rafId.current = requestAnimationFrame(tick)
      } else {
        stopLoop()
        // one final sync after mouseup
        updateSelectionRect()
      }
    }
    rafId.current = requestAnimationFrame(tick)
  }, [editor, updateSelectionRect, stopLoop])

  useEffect(() => {
    if (!editor) return

    const onTx = ({ transaction }: { transaction: Transaction }) => {
      // this is for non-resize txs that may affect selection
      updateSelectionRect()

      const meta = transaction.getMeta(columnResizingPluginKey)
      if (!meta) return

      // drag start
      if (
        Object.prototype.hasOwnProperty.call(meta, "setDragging") &&
        meta.setDragging
      ) {
        startLoop()
      }

      // drag end is also a tx with setDragging: null — rAF loop will notice and stop itself
      if (
        Object.prototype.hasOwnProperty.call(meta, "setDragging") &&
        meta.setDragging == null
      ) {
        // if loop missed it for any reason, force a stop + final sync
        stopLoop()
        updateSelectionRect()
      }

      // handle-only hover (optional): update once for cursor changes, etc.
      if (Object.prototype.hasOwnProperty.call(meta, "setHandle")) {
        updateSelectionRect()
      }
    }

    editor.on("transaction", onTx)
    return () => {
      editor.off("transaction", onTx)
      stopLoop()
    }
  }, [editor, startLoop, stopLoop, updateSelectionRect])
}

export const TableSelectionOverlay: React.FC<TableSelectionOverlayProps> = ({
  editor: providedEditor,
  cellMenu: CellMenu,
  showResizeHandles = true,
  onMenuOpenChange,
}) => {
  const { editor } = useTiptapEditor(providedEditor)
  const [isVisible, setIsVisible] = useState(false)
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null)
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null)
  const [tableDom, setTableDom] = useState<HTMLElement | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const anchorCellRef = useRef<number | null>(null)
  const activeHandleRef = useRef<ResizeHandle>(null)
  const containerRef = useRef<HTMLElement | null>(null)

  const { refs, floatingStyles, update } = useFloating({
    placement: "top-start",
  })

  useEffect(() => {
    if (selectionRect) {
      const virtualReference = createVirtualReference(selectionRect)
      refs.setPositionReference(virtualReference)
    }
  }, [selectionRect, refs])

  const updateSelectionRect = useCallback(() => {
    if (!editor) return

    const { selection } = editor.state

    if (selection instanceof CellSelection) {
      const rect = getSelectionBoundingRect(editor.view, selection)

      if (!rect) {
        setIsVisible(false)
        setSelectionRect((prev) => (prev ? null : prev))
        return
      }

      setSelectionRect((prev) => (rectEq(prev, rect) ? prev : rect))
      setIsVisible(true)
      return
    }

    // single cell handling
    const { $anchor } = selection
    const cell = cellAround($anchor)

    if (cell) {
      const rect = getSingleCellBoundingRect(editor.view, cell.pos)

      if (rect) {
        setSelectionRect((prev) => (rectEq(prev, rect) ? prev : rect))
        setIsVisible(true)
        return
      }
    }

    setIsVisible(false)
    setSelectionRect((prev) => (prev ? null : prev))
  }, [editor])

  useResizeOverlay(editor, updateSelectionRect)

  useEffect(() => {
    if (update && selectionRect) {
      update()
    }
  }, [update, selectionRect])

  const createResizeHandler = useCallback(
    (handle: ResizeHandle) => (event: React.MouseEvent) => {
      if (
        !editor ||
        !handle ||
        !selectionRect ||
        isMenuOpen ||
        !showResizeHandles
      )
        return

      event.preventDefault()
      event.stopPropagation()

      const { selection } = editor.state
      let cellSelection: CellSelection | null = null

      if (selection instanceof CellSelection) {
        cellSelection = selection
      } else {
        const { $anchor } = selection
        const cell = cellAround($anchor)

        if (cell) {
          try {
            cellSelection = CellSelection.create(
              editor.state.doc,
              cell.pos,
              cell.pos
            )
          } catch (error) {
            console.warn(
              "Could not create single cell selection for resize:",
              error
            )
            return
          }
        }
      }

      if (!cellSelection) return

      const anchorCell = getAnchorCellForHandle(
        editor.view,
        cellSelection,
        selectionRect,
        handle
      )
      if (!anchorCell) return

      setActiveHandle(handle)
      activeHandleRef.current = handle
      anchorCellRef.current = anchorCell.pos

      const handleMouseMove = (mouseEvent: MouseEvent) => {
        if (!editor || anchorCellRef.current == null) return

        const target = domCellAround(mouseEvent.target as Element)
        if (!target || target.type !== "cell") return

        const targetCell = getCellAtCoordinates(
          editor.state,
          editor.view,
          mouseEvent.clientX,
          mouseEvent.clientY
        )
        if (!targetCell) return

        try {
          const newSelection = CellSelection.create(
            editor.state.doc,
            anchorCellRef.current,
            targetCell.pos
          )

          const transaction = editor.state.tr.setSelection(newSelection)
          editor.view.dispatch(transaction)
        } catch (error) {
          console.debug("Invalid cell selection during resize:", error)
        }
      }

      const handleMouseUp = () => {
        setActiveHandle(null)
        activeHandleRef.current = null
        anchorCellRef.current = null

        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }

      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    },
    [editor, selectionRect, isMenuOpen, showResizeHandles]
  )

  const updateTableDom = useCallback(() => {
    if (!editor) {
      setTableDom(null)
      return
    }

    const table = getTable(editor)
    if (!table) {
      setTableDom(null)
      return
    }

    setTableDom((prev) => {
      const currentDom = prev
      const newDom = editor.view.nodeDOM(table.pos) as HTMLElement | null
      return currentDom === newDom ? currentDom : newDom
    })
  }, [editor])

  const handleMenuOpenChange = useCallback(
    (isOpen: boolean) => {
      setIsMenuOpen(isOpen)
      onMenuOpenChange?.(isOpen)
    },
    [onMenuOpenChange]
  )

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      updateSelectionRect()
      updateTableDom()
    }

    editor.on("selectionUpdate", handleSelectionUpdate)
    updateSelectionRect()
    updateTableDom()

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, updateSelectionRect, updateTableDom])

  useEffect(() => {
    const c = tableDom?.querySelector(
      ".table-selection-overlay-container"
    ) as HTMLElement | null
    containerRef.current = c ?? null
  }, [tableDom])

  if (!isVisible || !selectionRect) {
    return null
  }

  if (!editor) return null

  const renderCellMenu = () => {
    if (!CellMenu) return null

    return (
      <span
        onMouseDown={(e) => e.stopPropagation()}
        style={{ pointerEvents: "auto" }}
      >
        <CellMenu
          onOpenChange={handleMenuOpenChange}
          editor={editor}
          onResizeStart={createResizeHandler}
        />
      </span>
    )
  }

  return (
    <FloatingPortal root={containerRef.current}>
      <div
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div className="tiptap-table-selection-overlay">
          <div
            style={{
              position: "absolute",
              width: selectionRect.width,
              height: selectionRect.height,
              zIndex: 2,
              borderRadius: 2,
              top: 0,
              left: 0,
            }}
          />

          <div
            style={{
              position: "absolute",
              width: selectionRect.width,
              height: selectionRect.height,
              border: `2px solid var(--tt-brand-color-400)`,
              borderRadius: 2,
              zIndex: 3,
              top: 0,
              left: 0,
            }}
          >
            {/* Menu Component */}
            {renderCellMenu()}

            {/* Corner resize handles */}
            {showResizeHandles && (
              <>
                <div
                  style={createCornerHandleStyles(
                    "tl",
                    !activeHandle || activeHandle === "tl",
                    isMenuOpen
                  )}
                  onMouseDown={createResizeHandler("tl")}
                />
                <div
                  style={createCornerHandleStyles(
                    "tr",
                    !activeHandle || activeHandle === "tr",
                    isMenuOpen
                  )}
                  onMouseDown={createResizeHandler("tr")}
                />
                <div
                  style={createCornerHandleStyles(
                    "bl",
                    !activeHandle || activeHandle === "bl",
                    isMenuOpen
                  )}
                  onMouseDown={createResizeHandler("bl")}
                />
                <div
                  style={createCornerHandleStyles(
                    "br",
                    !activeHandle || activeHandle === "br",
                    isMenuOpen
                  )}
                  onMouseDown={createResizeHandler("br")}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </FloatingPortal>
  )
}
