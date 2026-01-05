"use client"

import { useCallback, useMemo } from "react"
import type { Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Lib ---
import { isExtensionAvailable } from "../../../../utils/tiptap-utils"
import type { Orientation } from "../../lib/tiptap-table-utils"
import {
  getTable,
  getRowOrColumnCells,
} from "../../lib/tiptap-table-utils"

// --- Icons ---
import { AlignLeftIcon } from "@moryflow/ui/icons/align-left-icon"
import { AlignCenterIcon } from "@moryflow/ui/icons/align-center-icon"
import { AlignRightIcon } from "@moryflow/ui/icons/align-right-icon"
import { AlignJustifyIcon } from "@moryflow/ui/icons/align-justify-icon"
import { AlignBottomIcon } from "@moryflow/ui/icons/align-bottom-icon"
import { AlignTopIcon } from "@moryflow/ui/icons/align-top-icon"
import { AlignMiddleIcon } from "@moryflow/ui/icons/align-middle-icon"

export type TextAlignment = "left" | "center" | "right" | "justify"
export type VerticalAlignment = "top" | "middle" | "bottom"
export type AlignmentType = "text" | "vertical"

export interface UseTableAlignCellConfig {
  /**
   * The Tiptap editor instance. If omitted, the hook will use
   * the context/editor from `useTiptapEditor`.
   */
  editor?: Editor | null
  /**
   * The type of alignment to apply.
   */
  alignmentType: AlignmentType
  /**
   * The alignment value to set.
   */
  alignment: TextAlignment | VerticalAlignment
  /**
   * Optional index of the row or column to align.
   * If provided along with orientation, aligns all cells in that row/column.
   * If not provided, aligns the currently selected cell(s).
   */
  index?: number
  /**
   * Optional orientation when using index.
   * Determines whether to align a row or column.
   */
  orientation?: Orientation
  /**
   * Hide the button when alignment isn't currently possible.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after successful alignment change.
   */
  onAligned?: (alignment: TextAlignment | VerticalAlignment) => void
}

const REQUIRED_EXTENSIONS = ["table"]

export const tableAlignCellLabels = {
  text: {
    left: "Align left",
    center: "Align center",
    right: "Align right",
    justify: "Justify",
  } as Record<TextAlignment, string>,
  vertical: {
    top: "Align top",
    middle: "Align middle",
    bottom: "Align bottom",
  } as Record<VerticalAlignment, string>,
}

export const tableAlignCellIcons = {
  text: {
    left: AlignLeftIcon,
    center: AlignCenterIcon,
    right: AlignRightIcon,
    justify: AlignJustifyIcon,
  } as Record<TextAlignment, React.ComponentType<{ className?: string }>>,
  vertical: {
    top: AlignTopIcon,
    middle: AlignMiddleIcon,
    bottom: AlignBottomIcon,
  } as Record<VerticalAlignment, React.ComponentType<{ className?: string }>>,
}

/**
 * Checks if table cell alignment can be performed
 * in the current editor state.
 */
function canAlignCell(editor: Editor | null): boolean {
  if (
    !editor ||
    !editor.isEditable ||
    !isExtensionAvailable(editor, REQUIRED_EXTENSIONS)
  ) {
    return false
  }

  try {
    return editor.isActive("tableCell") || editor.isActive("tableHeader")
  } catch {
    return false
  }
}

/**
 * Checks if row/column-wide alignment can be performed
 * in the current editor state.
 */
function canAlignRowColumn({
  editor,
  index,
  orientation,
}: {
  editor: Editor | null
  index?: number
  orientation?: Orientation
}): boolean {
  if (
    !editor ||
    !editor.isEditable ||
    !isExtensionAvailable(editor, REQUIRED_EXTENSIONS)
  ) {
    return false
  }

  try {
    const table = getTable(editor)
    if (!table) return false

    const cellData = getRowOrColumnCells(editor, index, orientation)

    if (cellData.cells.length === 0) return false

    return true
  } catch {
    return false
  }
}

/**
 * Gets the current alignment value for the active cell.
 */
function getCurrentAlignment(
  editor: Editor | null,
  alignmentType: AlignmentType
): TextAlignment | VerticalAlignment | null {
  if (!canAlignCell(editor) || !editor) return null

  try {
    const { selection } = editor.state
    const $anchor = selection.$anchor

    let cellNode = null
    for (let depth = $anchor.depth; depth >= 0; depth--) {
      const node = $anchor.node(depth)
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        cellNode = node
        break
      }
    }

    if (!cellNode) return null

    const attrs = cellNode.attrs || {}

    if (alignmentType === "text") {
      return (attrs.nodeTextAlign as TextAlignment) || "left"
    } else {
      return (attrs.nodeVerticalAlign as VerticalAlignment) || "top"
    }
  } catch {
    return null
  }
}

/**
 * Gets the current alignment for a specific row or column.
 */
function getCurrentRowColumnAlignment(
  editor: Editor | null,
  alignmentType: AlignmentType,
  index?: number,
  orientation?: Orientation
): TextAlignment | VerticalAlignment | null {
  if (!editor) return null

  try {
    const cellData = getRowOrColumnCells(editor, index, orientation)

    if (cellData.cells.length === 0) return null

    const firstCell = cellData.cells[0]
    if (!firstCell?.node) return null

    const attrs = firstCell.node.attrs || {}

    if (alignmentType === "text") {
      return (attrs.nodeTextAlign as TextAlignment) || "left"
    } else {
      return (attrs.nodeVerticalAlign as VerticalAlignment) || "top"
    }
  } catch {
    return null
  }
}

/**
 * Sets the alignment attribute on the current table cell.
 */
function setTableCellAlignment(
  editor: Editor | null,
  alignmentType: AlignmentType,
  alignment: TextAlignment | VerticalAlignment
): boolean {
  if (!canAlignCell(editor) || !editor) return false

  try {
    if (alignmentType === "text") {
      return editor.commands.setCellAttribute("nodeTextAlign", alignment)
    } else {
      return editor.commands.setCellAttribute("nodeVerticalAlign", alignment)
    }
  } catch (error) {
    console.error("Error setting table cell alignment:", error)
    return false
  }
}

/**
 * Sets alignment for all cells in a specific row or column.
 */
function setRowColumnAlignment({
  editor,
  alignmentType,
  alignment,
  index,
  orientation,
}: {
  editor: Editor | null
  alignmentType: AlignmentType
  alignment: TextAlignment | VerticalAlignment
  index?: number
  orientation?: Orientation
}): boolean {
  if (!canAlignRowColumn({ editor, index, orientation }) || !editor) {
    return false
  }

  try {
    const { state, view } = editor
    const tr = state.tr

    const cellData = getRowOrColumnCells(editor, index, orientation)

    if (cellData.cells.length === 0) {
      return false
    }

    // Track unique cells to avoid aligning the same merged cell multiple times
    const uniqueCells = new Map<number, (typeof cellData.cells)[0]>()

    cellData.cells.forEach((cellInfo) => {
      if (cellInfo.node && cellInfo.pos !== undefined) {
        uniqueCells.set(cellInfo.pos, cellInfo)
      }
    })

    if (uniqueCells.size === 0) {
      return false
    }

    // Convert to array and sort by position in reverse order
    // This ensures we replace cells from end to beginning to maintain correct positions
    const cellsToProcess = Array.from(uniqueCells.values()).sort(
      (a, b) => b.pos - a.pos
    )

    const attributeName =
      alignmentType === "text" ? "nodeTextAlign" : "nodeVerticalAlign"

    cellsToProcess.forEach((cellInfo) => {
      if (cellInfo.node && cellInfo.pos !== undefined) {
        const cellType = cellInfo.node.type

        const newCellNode = cellType.create(
          {
            ...cellInfo.node.attrs,
            [attributeName]: alignment,
          },
          cellInfo.node.content,
          cellInfo.node.marks
        )

        const cellEnd = cellInfo.pos + cellInfo.node.nodeSize
        tr.replaceWith(cellInfo.pos, cellEnd, newCellNode)
      }
    })

    if (tr.docChanged) {
      view.dispatch(tr)
      return true
    }

    return false
  } catch (error) {
    console.error(`Error aligning table ${orientation}:`, error)
    return false
  }
}

/**
 * Executes the cell alignment in the editor.
 */
function tableAlignCell({
  editor,
  alignmentType,
  alignment,
  index,
  orientation,
}: {
  editor: Editor | null
  alignmentType: AlignmentType
  alignment: TextAlignment | VerticalAlignment
  index?: number
  orientation?: Orientation
}): boolean {
  if (!editor) return false

  try {
    if (typeof index === "number" && orientation) {
      return setRowColumnAlignment({
        editor,
        alignmentType,
        alignment,
        index,
        orientation,
      })
    } else {
      return setTableCellAlignment(editor, alignmentType, alignment)
    }
  } catch (error) {
    console.error("Error aligning table cell:", error)
    return false
  }
}

/**
 * Determines if the align cell button should be shown
 * based on editor state and config.
 */
function shouldShowButton({
  editor,
  hideWhenUnavailable,
  index,
  orientation,
}: {
  editor: Editor | null
  hideWhenUnavailable: boolean
  index?: number
  orientation?: Orientation
}): boolean {
  if (!editor || !editor.isEditable) return false
  if (!isExtensionAvailable(editor, REQUIRED_EXTENSIONS)) return false

  if (hideWhenUnavailable) {
    if (typeof index === "number" && orientation) {
      return canAlignRowColumn({ editor, index, orientation })
    }

    return canAlignCell(editor)
  }

  return true
}

/**
 * Custom hook that provides **table cell alignment**
 * functionality for the Tiptap editor.
 *
 * @example
 * ```tsx
 * // Simple text alignment button
 * function AlignLeftButton() {
 *   const { isVisible, handleAlign, canAlignCell, isActive, label, Icon } = useTableAlignCell({
 *     alignmentType: "text",
 *     alignment: "left",
 *     hideWhenUnavailable: true,
 *     onAligned: (alignment) => console.log(`Aligned to: ${alignment}`),
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <button
 *       onClick={handleAlign}
 *       disabled={!canAlignCell}
 *       aria-pressed={isActive}
 *       aria-label={label}
 *     >
 *       <Icon /> {label}
 *     </button>
 *   )
 * }
 *
 * // Align entire row vertically
 * function AlignRowTopButton({ rowIndex }: { rowIndex: number }) {
 *   const { isVisible, handleAlign, label, Icon } = useTableAlignCell({
 *     alignmentType: "vertical",
 *     alignment: "top",
 *     index: rowIndex,
 *     orientation: "row",
 *     hideWhenUnavailable: true,
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <button onClick={handleAlign} aria-label={label}>
 *       <Icon /> {label}
 *     </button>
 *   )
 * }
 *
 * // Alignment toolbar for selected cell
 * function CellAlignmentToolbar() {
 *   const alignments: TextAlignment[] = ["left", "center", "right", "justify"]
 *
 *   return (
 *     <div role="toolbar" aria-label="Text alignment">
 *       {alignments.map((alignment) => {
 *         const { isVisible, handleAlign, canAlignCell, isActive, Icon } = useTableAlignCell({
 *           alignmentType: "text",
 *           alignment,
 *           hideWhenUnavailable: true,
 *         })
 *
 *         if (!isVisible) return null
 *
 *         return (
 *           <button
 *             key={alignment}
 *             onClick={handleAlign}
 *             disabled={!canAlignCell}
 *             aria-pressed={isActive}
 *             title={`Align ${alignment}`}
 *           >
 *             <Icon />
 *           </button>
 *         )
 *       })}
 *     </div>
 *   )
 * }
 * ```
 */
export function useTableAlignCell(config: UseTableAlignCellConfig) {
  const {
    editor: providedEditor,
    alignmentType,
    alignment,
    index,
    orientation,
    hideWhenUnavailable = false,
    onAligned,
  } = config

  const { editor } = useTiptapEditor(providedEditor)

  const isVisible = shouldShowButton({
    editor,
    hideWhenUnavailable,
    index,
    orientation,
  })

  const canPerformAlign = () => {
    if (typeof index === "number" && orientation) {
      return canAlignRowColumn({ editor, index, orientation })
    }
    return canAlignCell(editor)
  }

  const currentAlignment = () => {
    if (typeof index === "number" && orientation) {
      return getCurrentRowColumnAlignment(
        editor,
        alignmentType,
        index,
        orientation
      )
    }
    return getCurrentAlignment(editor, alignmentType)
  }

  const isActive = currentAlignment() === alignment

  const handleAlign = useCallback(() => {
    const success = tableAlignCell({
      editor,
      alignmentType,
      alignment,
      index,
      orientation,
    })

    if (success) {
      onAligned?.(alignment)
    }
    return success
  }, [editor, alignmentType, alignment, index, orientation, onAligned])

  const label = useMemo(() => {
    if (alignmentType === "text") {
      return tableAlignCellLabels.text[alignment as TextAlignment]
    } else {
      return tableAlignCellLabels.vertical[alignment as VerticalAlignment]
    }
  }, [alignmentType, alignment])

  const Icon = useMemo(() => {
    if (alignmentType === "text") {
      return tableAlignCellIcons.text[alignment as TextAlignment]
    } else {
      return tableAlignCellIcons.vertical[alignment as VerticalAlignment]
    }
  }, [alignmentType, alignment])

  return {
    isVisible,
    canAlignCell: canPerformAlign,
    handleAlign,
    label,
    Icon,
    isActive,
    currentAlignment,
  }
}
