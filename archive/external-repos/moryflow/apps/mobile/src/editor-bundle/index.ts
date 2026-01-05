/**
 * 编辑器 Bundle 入口
 * 用于打包成独立的 Web 应用，供 React Native WebView 加载
 */

import { Editor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { Mention } from "@tiptap/extension-mention"
import { TaskList, TaskItem } from "@tiptap/extension-list"
import { Color, TextStyle } from "@tiptap/extension-text-style"
import { Placeholder, Selection } from "@tiptap/extensions"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Superscript } from "@tiptap/extension-superscript"
import { Subscript } from "@tiptap/extension-subscript"
import { TextAlign } from "@tiptap/extension-text-align"
import { Mathematics } from "@tiptap/extension-mathematics"
import { Emoji, gitHubEmojis } from "@tiptap/extension-emoji"

// 自定义扩展
import { HorizontalRule } from "@moryflow/tiptap/nodes/horizontal-rule-node/horizontal-rule-node-extension"
import { Image } from "@moryflow/tiptap/nodes/image-node/image-node-extension"
import { NodeBackground } from "@moryflow/tiptap/extensions/node-background-extension"
import { NodeAlignment } from "@moryflow/tiptap/extensions/node-alignment-extension"
import { UiState } from "@moryflow/tiptap/extensions/ui-state-extension"
import { TableKit } from "@moryflow/tiptap/nodes/table-node/extensions/table-node-extension"

// Bridge Client
import { BridgeClient, type EditorCommand } from "./bridge-client"

// 样式
import "@moryflow/tiptap/nodes/blockquote-node/blockquote-node.scss"
import "@moryflow/tiptap/nodes/code-block-node/code-block-node.scss"
import "@moryflow/tiptap/nodes/horizontal-rule-node/horizontal-rule-node.scss"
import "@moryflow/tiptap/nodes/list-node/list-node.scss"
import "@moryflow/tiptap/nodes/image-node/image-node.scss"
import "@moryflow/tiptap/nodes/heading-node/heading-node.scss"
import "@moryflow/tiptap/nodes/paragraph-node/paragraph-node.scss"
import "@moryflow/tiptap/nodes/table-node/styles/prosemirror-table.scss"
import "@moryflow/tiptap/nodes/table-node/styles/table-node.scss"
import "@moryflow/tiptap/styles/notion-editor.scss"

// ============ 初始化编辑器 ============

function initEditor(): void {
  const editorElement = document.getElementById("editor")
  if (!editorElement) {
    console.error("Editor element not found")
    return
  }

  const editor = new Editor({
    element: editorElement,
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        dropcursor: { width: 2 },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Start writing...",
        emptyNodeClass: "is-empty",
      }),
      Mention,
      Emoji.configure({
        emojis: gitHubEmojis.filter(
          (emoji) => !emoji.name.includes("regional")
        ),
        forceFallbackImages: true,
      }),
      TableKit.configure({
        table: {
          resizable: true,
          cellMinWidth: 120,
        },
      }),
      NodeBackground,
      NodeAlignment,
      UiState,
      TextStyle,
      Mathematics,
      Superscript,
      Subscript,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Selection,
      Image,
      Typography,
    ],
    editorProps: {
      attributes: {
        class: "notion-like-editor",
      },
    },
  })

  // 创建 Bridge 并挂载到全局
  const bridge = new BridgeClient(editor)
  ;(window as any).editorBridge = {
    handleCommand: (command: EditorCommand) => bridge.handleCommand(command),
  }

  // 通知 RN 编辑器已就绪
  bridge.sendMessage({ type: "ready" })
}

// 页面加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEditor)
} else {
  initEditor()
}
