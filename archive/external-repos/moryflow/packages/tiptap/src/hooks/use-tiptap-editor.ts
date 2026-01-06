import type { Editor } from "@tiptap/react"
import { useCurrentEditor, useEditorState } from "@tiptap/react"
import { useMemo } from "react"

export interface TiptapEditorState {
  editor: Editor | null
  editorState: Editor["state"] | null
  canCommand: Editor["can"] | null
}

/**
 * Hook that provides access to a Tiptap editor instance.
 *
 * Accepts an optional editor instance directly, or falls back to retrieving
 * the editor from the Tiptap context if available. This allows components
 * to work both when given an editor directly and when used within a Tiptap
 * editor context.
 *
 * @param providedEditor - Optional editor instance to use instead of the context editor
 * @returns The provided editor or the editor from context, whichever is available
 */
export function useTiptapEditor(
  providedEditor?: Editor | null
): TiptapEditorState {
  const { editor: coreEditor } = useCurrentEditor()
  const mainEditor = useMemo(
    () => providedEditor || coreEditor,
    [providedEditor, coreEditor]
  )

  const editorState = useEditorState({
    editor: mainEditor,
    selector(context): TiptapEditorState {
      if (!context.editor) {
        return {
          editor: null,
          editorState: null,
          canCommand: null,
        }
      }

      return {
        editor: context.editor,
        editorState: context.editor.state,
        canCommand: context.editor.can,
      }
    },
  })

  return editorState || { editor: null, editorState: null, canCommand: null }
}
