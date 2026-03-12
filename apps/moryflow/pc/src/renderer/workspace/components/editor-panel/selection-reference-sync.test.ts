import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureEditorSelectionReference,
  clearEditorSelectionReference,
  getEditorSelectionReference,
} from '@/workspace/stores/editor-selection-reference-store';

import { syncEditorSelectionReference } from './selection-reference-sync';

describe('syncEditorSelectionReference', () => {
  beforeEach(() => {
    clearEditorSelectionReference();
  });

  it('clears the chat selection reference after editor selection is removed', () => {
    captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'quoted text',
    });

    syncEditorSelectionReference({
      payload: null,
      chatCollapsed: false,
      toggleChatPanel: vi.fn(),
    });

    expect(getEditorSelectionReference()).toBeNull();
  });

  it('opens the chat panel when the first selection is captured while chat is collapsed', () => {
    const toggleChatPanel = vi.fn();

    syncEditorSelectionReference({
      payload: {
        filePath: '/vault/note.md',
        text: 'quoted text',
      },
      chatCollapsed: true,
      toggleChatPanel,
    });

    expect(getEditorSelectionReference()?.text).toBe('quoted text');
    expect(toggleChatPanel).toHaveBeenCalledTimes(1);
  });

  it('does not reopen the chat panel when a selection already exists', () => {
    const toggleChatPanel = vi.fn();
    captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'existing text',
    });

    syncEditorSelectionReference({
      payload: {
        filePath: '/vault/note.md',
        text: 'new text',
      },
      chatCollapsed: true,
      toggleChatPanel,
    });

    expect(getEditorSelectionReference()?.text).toBe('new text');
    expect(toggleChatPanel).not.toHaveBeenCalled();
  });
});
