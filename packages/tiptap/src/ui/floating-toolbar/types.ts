import type { Editor } from "@tiptap/react"

export interface FloatingToolbarProps {
  /**
   * Tiptap editor instance. If not provided, uses context.
   */
  editor?: Editor | null
  /**
   * Additional condition to hide the toolbar.
   * Useful for hiding when AI is active or other business logic.
   */
  hideWhen?: boolean
}

export interface MoreOptionsProps {
  /**
   * Tiptap editor instance. If not provided, uses context.
   */
  editor?: Editor | null
  /**
   * Whether to hide when no options are available.
   * @default false
   */
  hideWhenUnavailable?: boolean
}
