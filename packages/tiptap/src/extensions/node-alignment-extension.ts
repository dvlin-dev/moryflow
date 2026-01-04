import type { NodeWithPos } from "@tiptap/core"
import { Extension } from "@tiptap/core"
import type { EditorState, Transaction } from "@tiptap/pm/state"
import { getSelectedNodesOfType } from "../utils/tiptap-advanced-utils"
import { updateNodesAttr } from "../utils/tiptap-utils"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    nodeAlignment: {
      setNodeTextAlign: (textAlign: string) => ReturnType
      unsetNodeTextAlign: () => ReturnType
      toggleNodeTextAlign: (textAlign: string) => ReturnType
      setNodeVAlign: (verticalAlign: string) => ReturnType
      unsetNodeVAlign: () => ReturnType
      toggleNodeVAlign: (verticalAlign: string) => ReturnType
      setNodeAlignment: (
        textAlign?: string,
        verticalAlign?: string
      ) => ReturnType
      unsetNodeAlignment: () => ReturnType
    }
  }
}

export interface NodeAlignmentOptions {
  /**
   * Node types that should support alignment
   * @default ["paragraph", "heading", "blockquote", "tableCell", "tableHeader"]
   */
  types: string[]
  /**
   * Use inline style instead of data attribute
   * @default true
   */
  useStyle?: boolean
  /**
   * Valid text alignment values
   * @default ["left", "center", "right", "justify"]
   */
  textAlignValues: string[]
  /**
   * Valid vertical alignment values
   * @default ["top", "middle", "bottom"]
   */
  verticalAlignValues: string[]
}

function getToggleValue(
  targets: NodeWithPos[],
  attributeName: string,
  inputValue: string
): string | null {
  if (targets.length === 0) return null

  for (const target of targets) {
    const currentValue = target.node.attrs?.[attributeName] ?? null
    if (currentValue !== inputValue) {
      return inputValue
    }
  }
  return null
}

export const NodeAlignment = Extension.create<NodeAlignmentOptions>({
  name: "nodeAlignment",

  addOptions() {
    return {
      types: ["paragraph", "heading", "blockquote", "tableCell", "tableHeader"],
      useStyle: true,
      textAlignValues: ["left", "center", "right", "justify"],
      verticalAlignValues: ["top", "middle", "bottom"],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          nodeTextAlign: {
            default: null as string | null,

            parseHTML: (element: HTMLElement) => {
              const styleAlign = element.style?.textAlign
              if (
                styleAlign &&
                this.options.textAlignValues.includes(styleAlign)
              ) {
                return styleAlign
              }

              const dataAlign = element.getAttribute("data-node-text-align")
              if (
                dataAlign &&
                this.options.textAlignValues.includes(dataAlign)
              ) {
                return dataAlign
              }
              return null
            },

            renderHTML: (attributes) => {
              const align = attributes.nodeTextAlign as string | null
              if (!align || !this.options.textAlignValues.includes(align))
                return {}

              if (this.options.useStyle) {
                return { style: `text-align: ${align}` }
              } else {
                return { "data-node-text-align": align }
              }
            },
          },

          nodeVerticalAlign: {
            default: null as string | null,

            parseHTML: (element: HTMLElement) => {
              const styleVAlign = element.style?.verticalAlign
              if (
                styleVAlign &&
                this.options.verticalAlignValues.includes(styleVAlign)
              ) {
                return styleVAlign
              }
              const dataVAlign = element.getAttribute(
                "data-node-vertical-align"
              )
              if (
                dataVAlign &&
                this.options.verticalAlignValues.includes(dataVAlign)
              ) {
                return dataVAlign
              }
              return null
            },

            renderHTML: (attributes) => {
              const vAlign = attributes.nodeVerticalAlign as string | null
              if (!vAlign || !this.options.verticalAlignValues.includes(vAlign))
                return {}

              if (this.options.useStyle) {
                return { style: `vertical-align: ${vAlign}` }
              } else {
                return { "data-node-vertical-align": vAlign }
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    const executeAlignmentCommand = (
      attributeName: "nodeTextAlign" | "nodeVerticalAlign",
      getTargetValue: (
        targets: NodeWithPos[],
        inputValue?: string
      ) => string | null
    ) => {
      return (inputValue?: string) =>
        ({ state, tr }: { state: EditorState; tr: Transaction }) => {
          const targets = getSelectedNodesOfType(
            state.selection,
            this.options.types
          )
          if (targets.length === 0) return false
          const targetValue = getTargetValue(targets, inputValue)
          return updateNodesAttr(tr, targets, attributeName, targetValue)
        }
    }

    return {
      // TEXT ALIGN
      setNodeTextAlign: executeAlignmentCommand(
        "nodeTextAlign",
        (_, inputValue) => {
          if (!inputValue || !this.options.textAlignValues.includes(inputValue))
            return null
          return inputValue
        }
      ),
      unsetNodeTextAlign: executeAlignmentCommand("nodeTextAlign", () => null),
      toggleNodeTextAlign: executeAlignmentCommand(
        "nodeTextAlign",
        (targets, inputValue) => {
          if (!inputValue || !this.options.textAlignValues.includes(inputValue))
            return null
          return getToggleValue(targets, "nodeTextAlign", inputValue)
        }
      ),

      // VERTICAL ALIGN
      setNodeVAlign: executeAlignmentCommand(
        "nodeVerticalAlign",
        (_, inputValue) => {
          if (
            !inputValue ||
            !this.options.verticalAlignValues.includes(inputValue)
          )
            return null
          return inputValue
        }
      ),
      unsetNodeVAlign: executeAlignmentCommand("nodeVerticalAlign", () => null),
      toggleNodeVAlign: executeAlignmentCommand(
        "nodeVerticalAlign",
        (targets, inputValue) => {
          if (
            !inputValue ||
            !this.options.verticalAlignValues.includes(inputValue)
          )
            return null
          return getToggleValue(targets, "nodeVerticalAlign", inputValue)
        }
      ),

      // BOTH
      setNodeAlignment:
        (textAlign?: string, verticalAlign?: string) =>
        ({ state, tr }: { state: EditorState; tr: Transaction }) => {
          const targets = getSelectedNodesOfType(
            state.selection,
            this.options.types
          )
          if (targets.length === 0) return false

          let hasChanges = false

          for (const { node, pos } of targets) {
            const newAttrs = { ...node.attrs }

            if (textAlign && this.options.textAlignValues.includes(textAlign)) {
              newAttrs.nodeTextAlign = textAlign
              hasChanges = true
            }

            if (
              verticalAlign &&
              this.options.verticalAlignValues.includes(verticalAlign)
            ) {
              newAttrs.nodeVerticalAlign = verticalAlign
              hasChanges = true
            }

            if (hasChanges) tr.setNodeMarkup(pos, undefined, newAttrs)
          }

          return hasChanges
        },

      unsetNodeAlignment:
        () =>
        ({ state, tr }: { state: EditorState; tr: Transaction }) => {
          const targets = getSelectedNodesOfType(
            state.selection,
            this.options.types
          )
          if (targets.length === 0) return false

          let hasChanges = false

          for (const { node, pos } of targets) {
            const hasText = node.attrs?.nodeTextAlign ?? null
            const hasV = node.attrs?.nodeVerticalAlign ?? null

            if (hasText || hasV) {
              const newAttrs = {
                ...node.attrs,
                nodeTextAlign: null,
                nodeVerticalAlign: null,
              }
              tr.setNodeMarkup(pos, undefined, newAttrs)
              hasChanges = true
            }
          }

          return hasChanges
        },
    }
  },
})
