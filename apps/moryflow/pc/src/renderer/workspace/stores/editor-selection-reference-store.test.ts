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

  it('refreshes reference identity when same selection is captured again', () => {
    const first = captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'hello world',
      capturedAt: 1,
    });
    const firstReference = getEditorSelectionReference();
    const second = captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'hello world',
      capturedAt: 2,
    });
    const secondReference = getEditorSelectionReference();

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(true);
    expect(secondReference?.capturedAt).toBe(2);
    expect(secondReference?.captureVersion).not.toBe(firstReference?.captureVersion);
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
