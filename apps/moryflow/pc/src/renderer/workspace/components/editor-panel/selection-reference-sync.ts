import {
  captureEditorSelectionReference,
  clearEditorSelectionReference,
  getEditorSelectionReference,
  type EditorSelectionReferenceInput,
} from '@/workspace/stores/editor-selection-reference-store';

type SyncEditorSelectionReferenceOptions = {
  payload: EditorSelectionReferenceInput | null;
  chatCollapsed: boolean;
  toggleChatPanel: () => void;
};

export const syncEditorSelectionReference = ({
  payload,
  chatCollapsed,
  toggleChatPanel,
}: SyncEditorSelectionReferenceOptions) => {
  if (!payload) {
    clearEditorSelectionReference();
    return;
  }

  const previous = getEditorSelectionReference();
  captureEditorSelectionReference(payload);

  if (!previous && chatCollapsed) {
    toggleChatPanel();
  }
};
