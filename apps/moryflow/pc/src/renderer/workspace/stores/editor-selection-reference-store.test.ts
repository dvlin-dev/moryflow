import { beforeEach, describe, expect, it } from 'vitest';

import {
  MAX_SELECTION_CHARS,
  buildEditorSelectionReference,
  captureEditorSelectionReference,
  clearEditorSelectionReference,
  getEditorSelectionReference,
} from './editor-selection-reference-store';

describe('editor-selection-reference-store', () => {
  beforeEach(() => {
    clearEditorSelectionReference();
  });

  it('truncates selection text to 1w chars', () => {
    const oversized = 'a'.repeat(MAX_SELECTION_CHARS + 123);
    const reference = buildEditorSelectionReference({
      filePath: '/vault/note.md',
      text: oversized,
      capturedAt: 1,
    });

    expect(reference).not.toBeNull();
    expect(reference?.charCount).toBe(MAX_SELECTION_CHARS);
    expect(reference?.text.length).toBe(MAX_SELECTION_CHARS);
    expect(reference?.isTruncated).toBe(true);
  });

  it('skips store write when normalized reference is unchanged', () => {
    const first = captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'hello world',
      capturedAt: 1,
    });
    const second = captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'hello world',
      capturedAt: 2,
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(getEditorSelectionReference()?.capturedAt).toBe(1);
  });

  it('clears selection reference', () => {
    captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'hello world',
    });
    const changed = clearEditorSelectionReference();

    expect(changed).toBe(true);
    expect(getEditorSelectionReference()).toBeNull();
    expect(clearEditorSelectionReference()).toBe(false);
  });
});
