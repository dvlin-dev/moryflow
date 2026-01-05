import { Extension } from "@tiptap/core"
import type { TableHandlesState } from "../table-handle"
import {
  TableHandlePlugin,
  tableHandlePluginKey,
} from "../table-handle/table-handle-plugin"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableHandle: {
      freezeHandles: () => ReturnType
      unfreezeHandles: () => ReturnType
    }
  }

  interface EditorEvents {
    tableHandleState: TableHandlesState
  }
}

export const TableHandleExtension = Extension.create({
  name: "tableHandleExtension",

  addCommands() {
    return {
      freezeHandles:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(tableHandlePluginKey, true)
          return true
        },

      unfreezeHandles:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(tableHandlePluginKey, false)
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const { editor } = this
    return [
      TableHandlePlugin(editor, (state) => {
        this.editor.emit("tableHandleState", state)
      }),
    ]
  },
})
