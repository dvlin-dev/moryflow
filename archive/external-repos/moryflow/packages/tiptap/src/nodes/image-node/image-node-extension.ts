import { ReactNodeViewRenderer } from "@tiptap/react"
import type { ImageOptions } from "@tiptap/extension-image"
import { Image as TiptapImage } from "@tiptap/extension-image"
import { ImageNodeView } from "./image-node-view"
import type { Node } from "@tiptap/pm/model"
import { TextSelection } from "@tiptap/pm/state"

interface ImageAttributes {
  src: string | null
  alt?: string | null
  title?: string | null
  width?: string | null
  height?: string | null
  "data-align"?: string | null
}

const parseImageAttributes = (img: Element): Partial<ImageAttributes> => ({
  src: img.getAttribute("src"),
  alt: img.getAttribute("alt"),
  title: img.getAttribute("title"),
  width: img.getAttribute("width"),
  height: img.getAttribute("height"),
})

function buildImageHTMLAttributes(
  attrs: ImageAttributes
): Record<string, string> {
  const result: Record<string, string> = { src: attrs.src || "" }

  if (attrs.alt) result.alt = attrs.alt
  if (attrs.title) result.title = attrs.title
  if (attrs.width) result.width = attrs.width
  if (attrs.height) result.height = attrs.height

  return result
}

export const Image = TiptapImage.extend<ImageOptions>({
  content: "inline*",

  addAttributes() {
    return {
      ...this.parent?.(),
      "data-align": {
        default: null,
      },
      showCaption: {
        default: false,
        parseHTML: (element) => {
          return (
            element.tagName === "FIGURE" ||
            element.getAttribute("data-show-caption") === "true"
          )
        },
        renderHTML: (attributes) => {
          if (!attributes.showCaption) return {}
          return { "data-show-caption": "true" }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (node) => {
          const img = node.querySelector("img")
          if (!img) return false

          return {
            ...parseImageAttributes(img),
            "data-align": node.getAttribute("data-align"),
            showCaption: true,
          }
        },
        contentElement: "figcaption",
      },
      {
        tag: "img[src]",
        getAttrs: (node) => {
          if (node.closest("figure")) return false

          return {
            ...parseImageAttributes(node),
            "data-align": node.getAttribute("data-align"),
            showCaption: false,
          }
        },
      },
    ]
  },

  renderHTML({ node }) {
    const { src, alt, title, width, height, showCaption } = node.attrs
    const align = node.attrs["data-align"]

    const imgAttrs = buildImageHTMLAttributes({
      src,
      alt,
      title,
      width,
      height,
    })

    const hasContent = node.content.size > 0

    if (showCaption || hasContent) {
      const figureAttrs: Record<string, string> = {
        "data-url": src || "",
      }
      if (showCaption) figureAttrs["data-show-caption"] = "true"
      if (align) figureAttrs["data-align"] = align

      return ["figure", figureAttrs, ["img", imgAttrs], ["figcaption", {}, 0]]
    }

    if (align) imgAttrs["data-align"] = align
    return ["img", imgAttrs]
  },

  addKeyboardShortcuts() {
    return {
      "Mod-a": ({ editor }) => {
        const { state, view } = editor
        const { selection } = state
        const { $from } = selection

        let imagePos: number | null = null
        let imageNode: Node | null = null

        for (let depth = $from.depth; depth >= 0; depth--) {
          const nodeAtDepth = $from.node(depth)
          if (nodeAtDepth.type === this.type) {
            imageNode = nodeAtDepth
            // posBefore is the resolved position *before* this node
            imagePos = depth === 0 ? 0 : $from.before(depth)
            break
          }
        }

        // Not inside an Image → let default behavior happen
        if (!imageNode || imagePos == null) {
          return false
        }

        // If the caption/content is empty, allow the default progressive select-all
        const contentIsEmpty =
          imageNode.content.size === 0 || imageNode.textContent.length === 0

        if (contentIsEmpty) {
          return false
        }

        // Compute the content range of the image node:
        // content starts at (nodePos + 1) and ends at (nodePos + node.nodeSize - 1)
        const start = imagePos + 1
        const end = imagePos + imageNode.nodeSize - 1

        const tr = state.tr.setSelection(
          TextSelection.create(state.doc, start, end)
        )
        view.dispatch(tr)

        return true
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView, {
      stopEvent: ({ event }) => {
        const isDragEvent = /dragstart|dragover|dragend|drop/.test(event.type)
        if (isDragEvent) return false

        return !/mousedown|drag|drop/.test(event.type)
      },
    })
  },
})

export default Image
