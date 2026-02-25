'use client';

import { useCallback, useEffect, useState } from 'react';
import { type Editor } from '@tiptap/react';
import { useHotkeys } from 'react-hotkeys-hook';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';

// --- Hooks ---
import { useTiptapEditor } from '../../hooks/use-tiptap-editor';
import { useIsBreakpoint } from '../../hooks/use-is-breakpoint';

// --- Icons ---
import { TypeIcon } from '@moryflow/ui/icons/type-icon';

// --- Lib ---
import {
  findNodePosition,
  isNodeInSchema,
  isValidPosition,
  selectionWithinConvertibleTypes,
} from '../../utils/tiptap-utils';

export const TEXT_SHORTCUT_KEY = 'mod+alt+0';

/**
 * Configuration for the text/paragraph functionality
 */
export interface UseTextConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * Whether the button should hide when text conversion is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Callback function called after a successful conversion.
   */
  onToggled?: () => void;
}

/**
 * Returns whether we can toggle/turn the current selection into a paragraph.
 * - When `turnInto === false`, it just checks the direct ability to set paragraph on the selection.
 * - When `turnInto === true`, it additionally requires the selection to be within convertible types.
 */
export function canToggleText(editor: Editor | null, turnInto: boolean = true): boolean {
  if (!editor) return false;
  if (!editor.schema.nodes.paragraph) return false;

  if (!turnInto) {
    return editor.can().setNode('paragraph');
  }

  // Ensure selection is in nodes we're allowed to convert
  if (
    !selectionWithinConvertibleTypes(editor, [
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'taskList',
      'blockquote',
      'codeBlock',
    ])
  )
    return false;

  // Either we can set paragraph directly on the selection,
  // or we can clear formatting/nodes to arrive at a paragraph.
  return editor.can().setNode('paragraph') || editor.can().clearNodes();
}

/**
 * Checks if paragraph is currently active
 */
export function isParagraphActive(editor: Editor | null): boolean {
  if (!editor) return false;
  return editor.isActive('paragraph');
}

/**
 * Converts the current selection or node to paragraph
 */
export function toggleParagraph(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canToggleText(editor)) return false;

  try {
    const view = editor.view;
    let state = view.state;
    let tr = state.tr;

    // No selection, find the the cursor position
    if (state.selection.empty || state.selection instanceof TextSelection) {
      const pos = findNodePosition({
        editor,
        node: state.selection.$anchor.node(1),
      })?.pos;
      if (!isValidPosition(pos)) return false;

      tr = tr.setSelection(NodeSelection.create(state.doc, pos));
      view.dispatch(tr);
      state = view.state;
    }

    const selection = state.selection;
    let chain = editor.chain().focus();

    // Handle NodeSelection
    if (selection instanceof NodeSelection) {
      const firstChild = selection.node.firstChild?.firstChild;
      const lastChild = selection.node.lastChild?.lastChild;

      const from = firstChild ? selection.from + firstChild.nodeSize : selection.from + 1;

      const to = lastChild ? selection.to - lastChild.nodeSize : selection.to - 1;

      const resolvedFrom = state.doc.resolve(from);
      const resolvedTo = state.doc.resolve(to);

      chain = chain.setTextSelection(TextSelection.between(resolvedFrom, resolvedTo)).clearNodes();
    }

    if (!editor.isActive('paragraph')) {
      chain.setNode('paragraph').run();
    }

    editor.chain().focus().selectTextblockEnd().run();

    return true;
  } catch {
    return false;
  }
}

/**
 * Determines if the text button should be shown
 */
export function shouldShowButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
}): boolean {
  const { editor, hideWhenUnavailable } = props;

  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('paragraph', editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canToggleText(editor);
  }

  return true;
}

/**
 * Custom hook that provides text/paragraph functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage - no params needed
 * function MySimpleTextButton() {
 *   const { isVisible, handleToggle, isActive } = useText()
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleToggle}>Text</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedTextButton() {
 *   const { isVisible, handleToggle, label, isActive } = useText({
 *     editor: myEditor,
 *     hideWhenUnavailable: true,
 *     onToggled: () => console.log('Text converted!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleToggle}
 *       aria-label={label}
 *       aria-pressed={isActive}
 *     >
 *       Convert to Text
 *     </MyButton>
 *   )
 * }
 * ```
 */
export function useText(config?: UseTextConfig) {
  const { editor: providedEditor, hideWhenUnavailable = false, onToggled } = config || {};

  const { editor } = useTiptapEditor(providedEditor);
  const isMobile = useIsBreakpoint();
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const canToggle = canToggleText(editor);
  const isActive = isParagraphActive(editor);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      setIsVisible(shouldShowButton({ editor, hideWhenUnavailable }));
    };

    handleSelectionUpdate();

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, hideWhenUnavailable]);

  const handleToggle = useCallback(() => {
    if (!editor) return false;

    const success = toggleParagraph(editor);
    if (success) {
      onToggled?.();
    }
    return success;
  }, [editor, onToggled]);

  useHotkeys(
    TEXT_SHORTCUT_KEY,
    (event) => {
      event.preventDefault();
      handleToggle();
    },
    {
      enabled: isVisible && canToggle,
      enableOnContentEditable: !isMobile,
      enableOnFormTags: true,
    }
  );

  return {
    isVisible,
    isActive,
    handleToggle,
    canToggle,
    label: 'Text',
    shortcutKeys: TEXT_SHORTCUT_KEY,
    Icon: TypeIcon,
  };
}
