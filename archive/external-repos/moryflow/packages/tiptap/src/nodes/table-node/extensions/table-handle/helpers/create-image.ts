import type { Editor } from "@tiptap/core"

const STYLE_PROPS: (keyof CSSStyleDeclaration | string)[] = [
  // Box & border
  "boxSizing",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderRadius",
  // Spacing
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  // Typography
  "color",
  "font",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textDecoration",
  "textAlign",
  "verticalAlign",
  "whiteSpace",
  // Sizing
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
  // Table specifics
  "backgroundClip",
]

const toDash = (p: string) => p.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())

/**
 * Copy a curated list of computed styles from source -> target
 * (Works for TD/TH and most inline content you'd expect inside.)
 */
function copyComputedStyles(source: HTMLElement, target: HTMLElement) {
  const cs = getComputedStyle(source)

  for (const p of STYLE_PROPS) {
    const prop = String(p)
    const cssProp = toDash(prop)
    const val = cs.getPropertyValue(cssProp)
    if (val) target.style.setProperty(cssProp, val)
  }

  // Ensure long content doesn't overflow the drag image
  target.style.overflow = "hidden"
  target.style.textOverflow = "ellipsis"
  // Respect existing wrapping if set on the source; otherwise prefer single line
  if (cs.whiteSpace === "" || cs.whiteSpace === "normal") {
    target.style.whiteSpace = "nowrap"
  }
}

/**
 * Deep clone a node and copy computed styles element-by-element.
 * Avoids the browser's default cloning which loses computed styles.
 */
function cloneWithStyles(root: HTMLElement): HTMLElement {
  const clone = root.cloneNode(true) as HTMLElement

  // Iterative walk to avoid recursion limits
  const q: Array<{ src: Element; dst: Element }> = [{ src: root, dst: clone }]
  while (q.length) {
    const { src, dst } = q.shift()!
    if (src instanceof HTMLElement && dst instanceof HTMLElement) {
      copyComputedStyles(src, dst)
    }
    const srcChildren = Array.from(src.children)
    const dstChildren = Array.from(dst.children)
    const len = Math.min(srcChildren.length, dstChildren.length)
    for (let i = 0; i < len; i++) {
      const srcChild = srcChildren[i]
      const dstChild = dstChildren[i]
      if (srcChild && dstChild) {
        q.push({ src: srcChild, dst: dstChild })
      }
    }
  }

  return clone
}

/**
 * Apply crisp, rounded, off-screen wrapper styling for drag image.
 */
function styleDragWrapper(el: HTMLElement, maxWidth: number) {
  Object.assign(el.style, {
    position: "fixed",
    top: "-10000px",
    left: "-10000px",
    pointerEvents: "none",
    zIndex: "2147483647",
    maxWidth: `${maxWidth}px`,
    borderRadius: "12px",
    background: "transparent",
    filter:
      "drop-shadow(0 8px 24px rgba(0,0,0,0.18)) drop-shadow(0 2px 8px rgba(0,0,0,0.10))",
    overflow: "hidden",
  } as CSSStyleDeclaration)
}

/**
 * Scale an element down if it exceeds the max width, keeping crisp layout.
 * Assumes the element is already positioned off-screen (so attaching to body is safe).
 */
function scaleToFit(el: HTMLElement, maxWidth: number): void {
  // Attach once (if not already) so measurements are correct.
  if (!el.isConnected) document.body.appendChild(el)
  const rect = el.getBoundingClientRect()
  if (rect.width > maxWidth && rect.width > 0) {
    const scale = maxWidth / rect.width
    el.style.transformOrigin = "top left"
    el.style.transform = `scale(${scale})`
  }
}

/**
 * Copy table-level styles that affect layout.
 */
function applyTableBoxStyles(
  srcTable: HTMLTableElement,
  dstTable: HTMLTableElement
) {
  const tcs = getComputedStyle(srcTable)
  dstTable.style.borderCollapse = tcs.borderCollapse
  dstTable.style.borderSpacing = tcs.borderSpacing
  dstTable.style.tableLayout = "fixed" // consistent drag image
  dstTable.className = srcTable.className
}

/**
 * Lock a cell's width to its rendered width.
 */
function lockCellWidth(fromCell: HTMLElement, toCell: HTMLElement) {
  const rect = fromCell.getBoundingClientRect()
  if (rect.width > 0) {
    toCell.style.width = `${rect.width}px`
    toCell.style.maxWidth = `${rect.width}px`
  }
}

/**
 * Build a 1-row preview table.
 */
function buildRowPreview(
  tableEl: HTMLTableElement,
  rowIndex: number
): HTMLTableElement | null {
  const body = tableEl.tBodies?.[0] ?? tableEl.querySelector("tbody")
  if (!body) return null

  const row = body.rows?.[rowIndex] as HTMLTableRowElement | undefined
  if (!row) return null

  const tableClone = document.createElement("table")
  const tbodyClone = document.createElement("tbody")
  const rowClone = cloneWithStyles(row) as HTMLTableRowElement

  applyTableBoxStyles(tableEl, tableClone)

  // Lock each cell width
  for (let i = 0; i < row.cells.length; i++) {
    const src = row.cells[i] as HTMLElement
    const dst = rowClone.cells[i] as HTMLElement | undefined
    if (dst) lockCellWidth(src, dst)
  }

  tbodyClone.appendChild(rowClone)
  tableClone.appendChild(tbodyClone)
  return tableClone
}

/**
 * Build a 1-column preview table (one cell per row).
 */
function buildColumnPreview(
  tableEl: HTMLTableElement,
  colIndex: number
): HTMLTableElement | null {
  const body = tableEl.tBodies?.[0] ?? tableEl.querySelector("tbody")
  if (!body) return null

  const tableClone = document.createElement("table")
  const tbodyClone = document.createElement("tbody")
  applyTableBoxStyles(tableEl, tableClone)

  let firstCellWidth = 0

  for (let r = 0; r < body.rows.length; r++) {
    const srcRow = body.rows[r]
    if (!srcRow) continue
    const srcCell = srcRow.cells?.[colIndex] as HTMLElement | undefined
    if (!srcCell) continue

    const tr = document.createElement("tr")
    const cellClone = cloneWithStyles(srcCell)

    const rect = srcCell.getBoundingClientRect()
    if (!firstCellWidth && rect.width > 0) firstCellWidth = rect.width
    lockCellWidth(srcCell, cellClone)

    tr.appendChild(cellClone)
    tbodyClone.appendChild(tr)
  }

  if (firstCellWidth > 0) {
    tableClone.style.width = `${firstCellWidth}px`
    tableClone.style.maxWidth = `${firstCellWidth}px`
  }

  tableClone.appendChild(tbodyClone)
  return tableClone
}

/**
 * Public API
 * Creates a polished drag image for a row/column from a TipTap/ProseMirror table.
 * - Subtle rounded corners & shadow
 * - Scales down if it exceeds editor width
 * - Preserves computed styles to look 1:1 with the table
 */
export function createTableDragImage(
  editor: Editor,
  orientation: "row" | "col",
  index: number,
  tablePos: number
): HTMLElement {
  const editorRect = editor.view.dom.getBoundingClientRect()
  const maxWidth = Math.max(0, editorRect.width)

  const wrapper = document.createElement("div")
  styleDragWrapper(wrapper, maxWidth)

  const tableEl = editor.view.nodeDOM(tablePos) as HTMLTableElement | null
  if (!tableEl) {
    document.body.appendChild(wrapper)
    return wrapper
  }

  const tableRect = tableEl.getBoundingClientRect()
  const dragWidth = Math.min(tableRect.width, editorRect.width)
  wrapper.style.width = `${dragWidth}px`

  const preview =
    orientation === "row"
      ? buildRowPreview(tableEl, index)
      : buildColumnPreview(tableEl, index)

  if (preview) {
    const card = document.createElement("div")
    Object.assign(card.style, {
      background: "var(--drag-image-bg, transparent)",
      overflow: "hidden",
    } as CSSStyleDeclaration)

    card.appendChild(preview)
    wrapper.appendChild(card)
  }

  // Measure & scale after attaching
  scaleToFit(wrapper, maxWidth)

  return wrapper
}
// === END UTILS ===
