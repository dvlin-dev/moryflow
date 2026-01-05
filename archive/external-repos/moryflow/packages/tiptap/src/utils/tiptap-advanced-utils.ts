import type { Attrs, Node } from "@tiptap/pm/model"
import { findNodePosition, isValidPosition } from "./tiptap-utils"
import type { NodeWithPos } from "@tiptap/react"
import { findParentNodeClosestToPos, type Editor } from "@tiptap/react"
import type { Selection } from "@tiptap/pm/state"
import { NodeSelection, TextSelection } from "@tiptap/pm/state"
import { cellAround, CellSelection } from "@tiptap/pm/tables"

/**
 * Splits an array into chunks of specified size
 */
export function chunkArray<T>(array: Array<T>, size: number): Array<Array<T>> {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
    array.slice(index * size, index * size + size)
  )
}

/**
 * Helper function to check if there's content above the current position
 */
export function hasContentAbove(editor: Editor | null): {
  hasContent: boolean
  content: string
} {
  if (!editor) return { hasContent: false, content: "" }

  const { state } = editor
  const { $from } = state.selection

  for (let i = $from.index(0) - 1; i >= 0; i--) {
    const node = state.doc.child(i)
    const content = node.textContent.trim()

    if (content) {
      return { hasContent: true, content }
    }
  }

  return { hasContent: false, content: "" }
}

/**
 * Gets the active attributes of a specific mark in the current editor selection.
 *
 * @param editor - The Tiptap editor instance.
 * @param markName - The name of the mark to look for (e.g., "highlight", "link").
 * @returns The attributes of the active mark, or `null` if the mark is not active.
 */
export function getActiveMarkAttrs(
  editor: Editor | null,
  markName: string
): Attrs | null {
  if (!editor) return null

  const { state } = editor
  const { from, to, empty, $from } = state.selection

  if (empty) {
    const mark = $from.marks().find((m) => m.type.name === markName)
    return mark?.attrs ?? null
  }

  const seen = new Set<string>()
  let foundAttrs: Attrs | null = null

  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return

    for (const mark of node.marks) {
      if (mark.type.name === markName && !seen.has(mark.type.name)) {
        seen.add(mark.type.name)
        foundAttrs = mark.attrs
      }
    }
  })

  return foundAttrs
}

/**
 * Finds the position of a node in the editor selection
 * @param params Object containing editor, node (optional), and nodePos (optional)
 * @returns The position of the node in the selection or null if not found
 */
export function findSelectionPosition(params: {
  editor: Editor
  node?: Node | null
  nodePos?: number | null
}): number | null {
  const { editor, node, nodePos } = params

  if (isValidPosition(nodePos)) return nodePos

  if (node) {
    const found = findNodePosition({ editor, node })
    if (found) return found.pos
  }

  const { selection } = editor.state
  if (!selection.empty) return null

  const resolvedPos = selection.$anchor
  const nodeDepth = 1
  const selectedNode = resolvedPos.node(nodeDepth)

  return selectedNode ? resolvedPos.before(nodeDepth) : null
}

/**
 * Gets the currently selected DOM element in the editor
 * @param editor The Tiptap editor instance
 * @returns The selected DOM element or null if no selection is present
 */
export function getSelectedDOMElement(editor: Editor): HTMLElement | null {
  const { state, view } = editor
  const { selection } = state

  if (selection instanceof NodeSelection) {
    return view.nodeDOM(selection.from) as HTMLElement | null
  }

  if (selection instanceof TextSelection) {
    const $anchor = selection.$anchor

    // Ensure the depth is sufficient to avoid errors
    if ($anchor.depth >= 1) {
      const dom = view.nodeDOM($anchor.before(1))
      if (dom instanceof HTMLElement) {
        return dom
      }
    }
  }

  return null
}

/**
 * Gets the closest node from the current selection in the editor based on criteria
 * @param editor The Tiptap editor instance
 * @param options Configuration options for finding the node
 * @returns An object containing the closest matching node, its position, and depth, or null if not found
 */
export function getClosestNode(
  editor: Editor | null,
  options?: {
    nodeName?: string
    isBlock?: boolean
    predicate?: (node: Node) => boolean
  }
) {
  if (!editor) return null

  const { selection } = editor.state
  const { $from } = selection
  const { nodeName, isBlock = true, predicate } = options || {} // Default to block nodes

  let depth = $from.depth
  while (depth > 0) {
    const node = $from.node(depth)

    // Check all conditions
    const matchesName = !nodeName || node.type.name === nodeName
    const matchesBlock = node.type.isBlock === isBlock
    const matchesPredicate = !predicate || predicate(node)

    if (matchesName && matchesBlock && matchesPredicate) {
      const pos = $from.before(depth)
      return { node, pos, depth }
    }
    depth--
  }
  return null
}

/**
 * Gets the closest node from a specific position in the document
 * @param editor The Tiptap editor instance
 * @param pos The position to search from
 * @param options Configuration options for finding the node
 * @returns An object containing the closest matching node, its position, and depth, or null if not found
 */
export function getClosestNodeByPos(
  editor: Editor | null,
  pos: number,
  options?: {
    nodeName?: string
    isBlock?: boolean
    predicate?: (node: Node) => boolean
  }
) {
  if (!editor) return null

  const docSize = editor.state.doc.content.size
  if (pos < 0 || pos > docSize) {
    console.warn(`Position ${pos} is out of bounds (doc size: ${docSize})`)
    return null
  }

  try {
    const $pos = editor.state.doc.resolve(pos)
    const { nodeName, isBlock = true, predicate } = options || {}

    let depth = $pos.depth
    while (depth > 0) {
      const node = $pos.node(depth)

      const matchesName = !nodeName || node.type.name === nodeName
      const matchesBlock = node.type.isBlock === isBlock
      const matchesPredicate = !predicate || predicate(node)

      if (matchesName && matchesBlock && matchesPredicate) {
        const nodePos = $pos.before(depth)
        return { node, pos: nodePos, depth }
      }
      depth--
    }
    return null
  } catch (error) {
    console.error("Error resolving position:", error)
    return null
  }
}

/**
 * Convenience function to find closest block node (maintains backward compatibility)
 */
export function getClosestBlockNode(editor: Editor | null) {
  return getClosestNode(editor, { isBlock: true })
}

/**
 * Convenience function to find closest node by name
 */
export function getClosestNodeByName(editor: Editor | null, nodeName: string) {
  return getClosestNode(editor, { nodeName })
}

/**
 * Find multiple matching nodes up the tree
 */
export function getAllMatchingNodes(
  editor: Editor | null,
  options?: {
    nodeName?: string
    isBlock?: boolean
    predicate?: (node: Node) => boolean
  }
) {
  if (!editor) return []

  const { selection } = editor.state
  const { nodeName, isBlock = true, predicate } = options || {}
  const matches = []

  const nodeMatches = (node: Node) => {
    const matchesName = !nodeName || node.type.name === nodeName
    const matchesBlock = node.type.isBlock === isBlock
    const matchesPredicate = !predicate || predicate(node)
    return matchesName && matchesBlock && matchesPredicate
  }

  if (selection instanceof NodeSelection) {
    const selectedNode = selection.node
    if (nodeMatches(selectedNode)) {
      matches.push({
        node: selectedNode,
        pos: selection.from,
        depth: 0,
      })
    }
  }

  const { $from } = selection
  let depth = $from.depth

  while (depth > 0) {
    const node = $from.node(depth)

    if (nodeMatches(node)) {
      const pos = $from.before(depth)
      matches.push({ node, pos, depth })
    }
    depth--
  }

  return matches
}

/**
 * Gets the anchor node and its position in the editor.
 * @param editor The Tiptap editor instance
 * @param allowEmptySelection If true, still returns the node at the cursor position even if selection is empty
 * @returns An object containing the anchor node and its position, or null if not found
 */
export function getAnchorNodeAndPos(
  editor: Editor | null,
  allowEmptySelection: boolean = true
): { node: Node; pos: number } | null {
  if (!editor) return null

  const { state } = editor
  const { selection } = state

  if (selection instanceof NodeSelection) {
    const node = selection.node
    const pos = selection.from

    if (node && isValidPosition(pos)) {
      return { node, pos }
    }
  }

  if (selection.empty && !allowEmptySelection) return null

  const $anchor = selection.$anchor
  const depth = 1 // explicitly use depth 1
  const node = $anchor.node(depth)
  const pos = $anchor.before(depth)

  return { node, pos }
}

/**
 * Checks if the current selection in the editor contains any text.
 *
 * @param editor - The Tiptap editor instance.
 * @returns `true` if the selection contains text, `false` otherwise.
 */
export function selectionHasText(editor: Editor | null): boolean {
  if (!editor) return false

  const { state } = editor
  const { selection, doc } = state

  if (selection.empty) return false

  const text = doc.textBetween(selection.from, selection.to, "\n", "\0")
  return text.trim().length > 0
}

/**
 * Retrieves a specific extension by name from the Tiptap editor.
 * @param editor - The Tiptap editor instance
 * @param extensionName - The name of the extension to retrieve
 * @returns The extension instance if found, otherwise null
 */
export function getEditorExtension(
  editor: Editor | null,
  extensionName: string
) {
  if (!editor) return null

  const extension = editor.extensionManager.extensions.find(
    (ext) => ext.name === extensionName
  )

  if (!extension) {
    console.warn(
      `Extension "${extensionName}" not found in the editor schema. Ensure it is included in the editor configuration.`
    )
    return null
  }

  return extension
}

/**
 * Retrieves all nodes of specified types from the current selection.
 * @param selection The current editor selection
 * @param allowedNodeTypes An array of node type names to look for (e.g., ["image", "table"])
 * @returns An array of objects containing the node and its position
 */
export function getSelectedNodesOfType(
  selection: Selection,
  allowedNodeTypes: string[]
): NodeWithPos[] {
  const results: NodeWithPos[] = []
  const allowed = new Set(allowedNodeTypes)

  if (selection instanceof CellSelection) {
    selection.forEachCell((node: Node, pos: number) => {
      if (allowed.has(node.type.name)) {
        results.push({ node, pos })
      }
    })
    return results
  }

  if (selection instanceof NodeSelection) {
    const { node, from: pos } = selection
    if (node && allowed.has(node.type.name)) {
      results.push({ node, pos })
    }
    return results
  }

  const { $anchor } = selection
  const cell = cellAround($anchor)

  if (cell) {
    const cellNode = selection.$anchor.doc.nodeAt(cell.pos)
    if (cellNode && allowed.has(cellNode.type.name)) {
      results.push({ node: cellNode, pos: cell.pos })
      return results
    }
  }

  // Fallback: find parent nodes of allowed types
  const parentNode = findParentNodeClosestToPos($anchor, (node) =>
    allowed.has(node.type.name)
  )

  if (parentNode) {
    results.push({ node: parentNode.node, pos: parentNode.pos })
  }

  return results
}
