/**
 * [PROVIDES]: Editor 选区引用 store + methods（capture/clear）
 * [DEPENDS]: zustand (vanilla)
 * [POS]: Editor 与 Chat Pane 之间的选中文本共享状态（PC）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export const MAX_SELECTION_CHARS = 10_000;
const MAX_SELECTION_PREVIEW_CHARS = 120;

export type EditorSelectionReference = {
  filePath: string;
  text: string;
  preview: string;
  charCount: number;
  capturedAt: number;
  captureVersion: number;
  isTruncated: boolean;
};

export type EditorSelectionReferenceInput = {
  filePath: string;
  text: string;
  capturedAt?: number;
};

type EditorSelectionReferenceStoreState = {
  reference: EditorSelectionReference | null;
  setReference: (reference: EditorSelectionReference | null) => void;
};

const editorSelectionReferenceStore = createStore<EditorSelectionReferenceStoreState>((set) => ({
  reference: null,
  setReference: (reference) => set({ reference }),
}));

let selectionCaptureVersionSeed = 0;

const nextSelectionCaptureVersion = (): number => {
  selectionCaptureVersionSeed += 1;
  return selectionCaptureVersionSeed;
};

const normalizePreview = (value: string): string => {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= MAX_SELECTION_PREVIEW_CHARS) {
    return compact;
  }
  return `${compact.slice(0, MAX_SELECTION_PREVIEW_CHARS)}...`;
};

const normalizeText = (value: string): { text: string; isTruncated: boolean } | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length <= MAX_SELECTION_CHARS) {
    return {
      text: trimmed,
      isTruncated: false,
    };
  }
  return {
    text: trimmed.slice(0, MAX_SELECTION_CHARS),
    isTruncated: true,
  };
};

const isSameReference = (
  current: EditorSelectionReference | null,
  next: EditorSelectionReference | null
): boolean => {
  if (current === next) {
    return true;
  }
  if (!current || !next) {
    return false;
  }
  return (
    current.filePath === next.filePath &&
    current.text === next.text &&
    current.preview === next.preview &&
    current.charCount === next.charCount &&
    current.capturedAt === next.capturedAt &&
    current.captureVersion === next.captureVersion &&
    current.isTruncated === next.isTruncated
  );
};

export const buildEditorSelectionReference = (
  input: EditorSelectionReferenceInput
): EditorSelectionReference | null => {
  const normalized = normalizeText(input.text);
  if (!normalized) {
    return null;
  }
  return {
    filePath: input.filePath,
    text: normalized.text,
    preview: normalizePreview(normalized.text),
    charCount: normalized.text.length,
    capturedAt: input.capturedAt ?? Date.now(),
    captureVersion: nextSelectionCaptureVersion(),
    isTruncated: normalized.isTruncated,
  };
};

export const getEditorSelectionReference = (): EditorSelectionReference | null =>
  editorSelectionReferenceStore.getState().reference;

export const setEditorSelectionReference = (
  reference: EditorSelectionReference | null
): { changed: boolean; previous: EditorSelectionReference | null } => {
  const state = editorSelectionReferenceStore.getState();
  const previous = state.reference;
  if (isSameReference(previous, reference)) {
    return { changed: false, previous };
  }
  state.setReference(reference);
  return { changed: true, previous };
};

export const captureEditorSelectionReference = (input: EditorSelectionReferenceInput) => {
  const reference = buildEditorSelectionReference(input);
  return setEditorSelectionReference(reference);
};

export const clearEditorSelectionReference = () => {
  const state = editorSelectionReferenceStore.getState();
  if (state.reference === null) {
    return false;
  }
  state.setReference(null);
  return true;
};

export const useEditorSelectionReferenceStore = <T>(
  selector: (state: EditorSelectionReferenceStoreState) => T
): T => useStore(editorSelectionReferenceStore, selector);
