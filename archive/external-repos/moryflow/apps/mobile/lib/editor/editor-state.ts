/**
 * 编辑器状态管理
 * 使用 Zustand 管理编辑器全局状态
 */

import { create } from 'zustand'
import type { EditorState } from './types'
import { createDefaultEditorState } from './EditorBridge'

/** 编辑器 Store 状态 */
interface EditorStoreState {
  /** 当前编辑器状态 */
  editorState: EditorState
  /** 是否已就绪 */
  isReady: boolean
  /** 是否正在加载 */
  isLoading: boolean
  /** 当前内容（Markdown） */
  content: string
  /** 是否有未保存的更改 */
  isDirty: boolean
  /** 是否聚焦 */
  isFocused: boolean
  /** 是否有选区 */
  hasSelection: boolean
  /** 选中的文本 */
  selectedText: string
  /** 错误信息 */
  error: string | null
}

/** 编辑器 Store 操作 */
interface EditorStoreActions {
  /** 设置编辑器状态 */
  setEditorState: (state: EditorState) => void
  /** 设置就绪状态 */
  setReady: (ready: boolean) => void
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void
  /** 设置内容 */
  setContent: (content: string) => void
  /** 标记为已保存 */
  markSaved: () => void
  /** 设置聚焦状态 */
  setFocused: (focused: boolean) => void
  /** 设置选区 */
  setSelection: (hasSelection: boolean, selectedText: string) => void
  /** 设置错误 */
  setError: (error: string | null) => void
  /** 重置状态 */
  reset: () => void
}

type EditorStore = EditorStoreState & EditorStoreActions

/** 初始状态 */
const initialState: EditorStoreState = {
  editorState: createDefaultEditorState(),
  isReady: false,
  isLoading: true,
  content: '',
  isDirty: false,
  isFocused: false,
  hasSelection: false,
  selectedText: '',
  error: null,
}

/**
 * 编辑器状态 Store
 */
export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,

  setEditorState: (editorState) => set({ editorState }),

  setReady: (isReady) => set({ isReady, isLoading: !isReady }),

  setLoading: (isLoading) => set({ isLoading }),

  setContent: (content) =>
    set((state) => ({
      content,
      isDirty: content !== state.content,
    })),

  markSaved: () => set({ isDirty: false }),

  setFocused: (isFocused) => set({ isFocused }),

  setSelection: (hasSelection, selectedText) => set({ hasSelection, selectedText }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}))

/**
 * 编辑器状态选择器
 */
export const editorSelectors = {
  /** 是否可以撤销 */
  canUndo: (state: EditorStore) => state.editorState.canUndo,
  /** 是否可以重做 */
  canRedo: (state: EditorStore) => state.editorState.canRedo,
  /** 是否加粗 */
  isBold: (state: EditorStore) => state.editorState.isBold,
  /** 是否斜体 */
  isItalic: (state: EditorStore) => state.editorState.isItalic,
  /** 标题级别 */
  headingLevel: (state: EditorStore) => state.editorState.headingLevel,
  /** 列表类型 */
  listType: (state: EditorStore) => state.editorState.listType,
}
