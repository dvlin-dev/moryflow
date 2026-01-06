/**
 * 编辑器类型定义
 */

import type { EditorBridge } from './EditorBridge'

/** 编辑器状态 */
export interface EditorState {
  /** 是否加粗 */
  isBold: boolean
  /** 是否斜体 */
  isItalic: boolean
  /** 是否下划线 */
  isUnderline: boolean
  /** 是否删除线 */
  isStrike: boolean
  /** 当前标题级别 (0 表示非标题) */
  headingLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** 是否在列表中 */
  isInList: boolean
  /** 列表类型 */
  listType: 'bullet' | 'ordered' | 'task' | null
  /** 是否在代码块中 */
  isInCodeBlock: boolean
  /** 是否在引用块中 */
  isInBlockquote: boolean
  /** 是否可撤销 */
  canUndo: boolean
  /** 是否可重做 */
  canRedo: boolean
}

/** 发送到 WebView 的命令类型 */
export type EditorCommand =
  | { type: 'setContent'; markdown: string }
  | { type: 'getContent' }
  | { type: 'toggleBold' }
  | { type: 'toggleItalic' }
  | { type: 'toggleUnderline' }
  | { type: 'toggleStrike' }
  | { type: 'setHeading'; level: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'toggleBulletList' }
  | { type: 'toggleOrderedList' }
  | { type: 'toggleTaskList' }
  | { type: 'toggleCodeBlock' }
  | { type: 'toggleBlockquote' }
  | { type: 'insertImage'; src: string; alt?: string }
  | { type: 'insertTable'; rows: number; cols: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'focus' }
  | { type: 'blur' }

/** 从 WebView 接收的消息类型 */
export type EditorMessage =
  | { type: 'ready' }
  | { type: 'contentChange'; html: string; markdown: string }
  | { type: 'stateChange'; state: EditorState }
  | { type: 'selectionChange'; hasSelection: boolean; selectedText: string }
  | { type: 'focus' }
  | { type: 'blur' }
  | { type: 'scroll' }
  | { type: 'error'; message: string; stack?: string }
  | { type: 'requestImage' }

/** EditorWebView 组件属性 */
export interface EditorWebViewProps {
  /** 初始 Markdown 内容 */
  initialContent?: string
  /** 内容变化回调 */
  onContentChange?: (markdown: string) => void
  /** 编辑器就绪回调 */
  onReady?: () => void
  /** Bridge 就绪回调 */
  onBridgeReady?: (bridge: EditorBridge) => void
  /** 编辑器状态变化回调 */
  onStateChange?: (state: EditorState) => void
  /** 选区变化回调 */
  onSelectionChange?: (hasSelection: boolean, selectedText: string) => void
  /** 焦点变化回调 */
  onFocusChange?: (focused: boolean) => void
  /** 滚动回调 */
  onScroll?: () => void
  /** 错误回调 */
  onError?: (error: { message: string; stack?: string }) => void
  /** 是否只读 */
  readOnly?: boolean
  /** 占位符文本 */
  placeholder?: string
}

/** EditorToolbar 组件属性 */
export interface EditorToolbarProps {
  /** 当前编辑器状态 */
  state: EditorState
  /** 发送命令回调 */
  onCommand: (command: EditorCommand) => void
  /** 是否可见 */
  visible?: boolean
  /** 样式 */
  style?: object
}
