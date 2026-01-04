import type { ViewMutationRecord } from "@tiptap/pm/view"
import { Table } from "@tiptap/extension-table/table"
import type {
  TableCellOptions,
  TableHeaderOptions,
  TableOptions,
  TableRowOptions,
} from "@tiptap/extension-table"
import { TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
import type { Node } from "@tiptap/pm/model"
import { Extension } from "@tiptap/core"
import {
  cellAround,
  columnResizing,
  tableEditing,
  TableView,
} from "@tiptap/pm/tables"
import { TextSelection } from "@tiptap/pm/state"

import {
  EMPTY_CELL_WIDTH,
  RESIZE_MIN_WIDTH,
} from "../lib/tiptap-table-utils"

export const TableNode = Table.extend<TableOptions>({
  addProseMirrorPlugins() {
    const isResizable = this.options.resizable && this.editor.isEditable

    const defaultCellMinWidth =
      this.options.cellMinWidth < EMPTY_CELL_WIDTH
        ? EMPTY_CELL_WIDTH
        : this.options.cellMinWidth

    return [
      ...(isResizable
        ? [
            columnResizing({
              handleWidth: this.options.handleWidth,
              cellMinWidth: RESIZE_MIN_WIDTH,
              defaultCellMinWidth,
              View: null,
              lastColumnResizable: this.options.lastColumnResizable,
            }),
          ]
        : []),
      tableEditing({
        allowTableNodeSelection: this.options.allowTableNodeSelection,
      }),
    ]
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      class TiptapTableView extends TableView {
        private readonly blockContainer: HTMLDivElement
        private readonly innerTableContainer: HTMLDivElement
        private readonly widgetsContainer: HTMLDivElement
        private readonly overlayContainer: HTMLDivElement

        declare readonly node: Node
        declare readonly minCellWidth: number
        private readonly containerAttributes: Record<string, string>

        constructor(
          node: Node,
          minCellWidth: number,
          containerAttributes: Record<string, string>
        ) {
          super(node, minCellWidth)

          this.containerAttributes = containerAttributes ?? {}

          this.blockContainer = this.createBlockContainer()
          this.innerTableContainer = this.createInnerTableContainer()
          this.widgetsContainer = this.createWidgetsContainer()
          this.overlayContainer = this.createOverlayContainer()

          this.setupDOMStructure()
        }

        private createBlockContainer(): HTMLDivElement {
          const container = document.createElement("div")
          container.setAttribute("data-content-type", "table")

          this.applyContainerAttributes(container)
          return container
        }

        private createInnerTableContainer(): HTMLDivElement {
          const container = document.createElement("div")
          container.className = "table-container"
          return container
        }

        private createWidgetsContainer(): HTMLDivElement {
          const container = document.createElement("div")
          container.className = "table-controls"
          container.style.position = "relative"
          return container
        }

        private createOverlayContainer(): HTMLDivElement {
          const container = document.createElement("div")
          container.className = "table-selection-overlay-container"
          return container
        }

        private applyContainerAttributes(element: HTMLDivElement): void {
          Object.entries(this.containerAttributes).forEach(([key, value]) => {
            if (key !== "class") {
              element.setAttribute(key, value)
            }
          })
        }

        private setupDOMStructure(): void {
          const originalTable = this.dom
          const tableElement = originalTable.firstChild!

          // Move table into inner container
          this.innerTableContainer.appendChild(tableElement)

          // Build the hierarchy: blockContainer > originalTable > innerContainer + widgetsContainer
          originalTable.appendChild(this.innerTableContainer)
          originalTable.appendChild(this.widgetsContainer)
          originalTable.appendChild(this.overlayContainer)

          this.blockContainer.appendChild(originalTable)

          this.dom = this.blockContainer
        }

        ignoreMutation(mutation: ViewMutationRecord): boolean {
          const target = mutation.target as HTMLElement
          const isInsideTable = target.closest(".table-container")

          return !isInsideTable || super.ignoreMutation(mutation)
        }
      }

      const cellMinWidth =
        this.options.cellMinWidth < EMPTY_CELL_WIDTH
          ? EMPTY_CELL_WIDTH
          : this.options.cellMinWidth
      return new TiptapTableView(node, cellMinWidth, HTMLAttributes)
    }
  },
})

const TableCellNode = TableCell.extend<TableCellOptions>({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      "Mod-a": () => {
        const { state, view } = this.editor
        const { selection, doc } = state

        const $anchor = selection.$anchor
        const cellPos = cellAround($anchor)
        if (!cellPos) {
          return false
        }

        const cellNode = doc.nodeAt(cellPos.pos)
        if (!cellNode || !cellNode.textContent) {
          return false
        }

        const from = cellPos.pos + 1
        const to = cellPos.pos + cellNode.nodeSize - 1

        if (from >= to) {
          return true
        }

        const $from = doc.resolve(from)
        const $to = doc.resolve(to)

        const nextSel = TextSelection.between($from, $to, 1)
        if (!nextSel) {
          return true
        }

        if (state.selection.eq(nextSel)) {
          return true
        }

        view.dispatch(state.tr.setSelection(nextSel))
        return true
      },
    }
  },
})

export interface TableNodeOptions {
  /**
   * If set to false, the table extension will not be registered
   * @example table: false
   */
  table: Partial<TableOptions> | false
  /**
   * If set to false, the table extension will not be registered
   * @example tableCell: false
   */
  tableCell: Partial<TableCellOptions> | false
  /**
   * If set to false, the table extension will not be registered
   * @example tableHeader: false
   */
  tableHeader: Partial<TableHeaderOptions> | false
  /**
   * If set to false, the table extension will not be registered
   * @example tableRow: false
   */
  tableRow: Partial<TableRowOptions> | false
}

/**
 * The table kit is a collection of table editor extensions.
 *
 * It’s a good starting point for building your own table in Tiptap.
 */
export const TableKit = Extension.create<TableNodeOptions>({
  name: "tableKit",

  addExtensions() {
    const extensions = []

    if (this.options.table !== false) {
      extensions.push(TableNode.configure(this.options.table))
    }

    if (this.options.tableCell !== false) {
      extensions.push(TableCellNode.configure(this.options.tableCell))
    }

    if (this.options.tableHeader !== false) {
      extensions.push(TableHeader.configure(this.options.tableHeader))
    }

    if (this.options.tableRow !== false) {
      extensions.push(TableRow.configure(this.options.tableRow))
    }

    return extensions
  },
})
