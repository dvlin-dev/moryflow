import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';

// --Hooks ---
import { useTiptapEditor } from '../../../../hooks/use-tiptap-editor';

// --Lib ---
import { isExtensionAvailable } from '../../../../utils/tiptap-utils';
import { getTable, RESIZE_MIN_WIDTH } from '../../lib/tiptap-table-utils';

// --Icons ---
import { MoveHorizontalIcon } from '@moryflow/ui/icons/move-horizontal-icon';

export interface UseTableFitToWidthConfig {
  /**
   * The Tiptap editor instance. If omitted, the hook will use
   * the editor from `useTiptapEditor`.
   */
  editor?: Editor | null;
  /**
   * Hide the button when the action isn't currently possible.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Called after the table width is successfully adjusted.
   */
  onWidthAdjusted?: () => void;
}

/**
 * Required Tiptap extensions for this feature to work.
 * - `table` to target the node and update attributes
 * - `tableHandleExtension` (or your table controls) to ensure table tooling is enabled
 */
const REQUIRED_EXTENSIONS = ['table', 'tableHandleExtension'];

/**
 * Returns whether a "fit to width" action can run in the current state.
 * Checks: editor presence, editability, required extensions,
 * and that the selection is somewhere inside a table.
 */
function canFitTableToWidth(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, REQUIRED_EXTENSIONS)) {
    return false;
  }

  try {
    return (
      editor.isActive('table') || editor.isActive('tableCell') || editor.isActive('tableHeader')
    );
  } catch {
    return false;
  }
}

/**
 * Automatically adjusts table column widths to fit the editor's available width.
 *
 * This function finds the table containing the current selection and distributes
 * the available editor width equally across all columns, accounting for padding
 * and respecting any user-configured minimum cell width settings.
 *
 * @param editor - The ProseMirror editor instance, or null
 * @returns true if the table width was successfully set, false otherwise
 */
function setTableAutoWidth(editor: Editor | null): boolean {
  if (!canFitTableToWidth(editor) || !editor) return false;

  try {
    const table = getTable(editor);
    if (!table) return false;

    // Calculate the editor width available for the table
    const editorElement = editor.view.dom as HTMLElement;
    const style = getComputedStyle(editorElement);

    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;

    const editorWidth = editorElement.clientWidth - paddingLeft - paddingRight;

    const columnCount = table.map.width;
    if (columnCount === 0) return false;

    let colWidth = 0;
    const availableWidth = editorWidth - columnCount - 8;
    colWidth = Math.floor(availableWidth / columnCount);

    // We are not using what what user set cellMinWidth
    // Instead, we use a reasonable minimum width for usability.
    const finalColWidth = Math.max(colWidth, RESIZE_MIN_WIDTH);

    const tr = editor.state.tr;
    table.node.descendants((child, childPos) => {
      if (child.type.name === 'tableCell' || child.type.name === 'tableHeader') {
        const absolutePos = table.start + childPos;
        const colspan = child.attrs.colspan || 1;

        const colwidthArray = Array(colspan).fill(finalColWidth);
        tr.setNodeMarkup(absolutePos, undefined, {
          ...child.attrs,
          colwidth: colwidthArray,
        });
      }
    });

    if (tr.docChanged) {
      editor.view.dispatch(tr);
    }

    return true;
  } catch (error) {
    console.error('Error setting table auto width:', error);
    return false;
  }
}

/**
 * Executes the "fit to width" operation. Safely no-ops if unavailable.
 * Returns `true` on success, `false` otherwise.
 */
function tableFitToWidth({ editor }: { editor: Editor | null }) {
  if (!canFitTableToWidth(editor) || !editor) {
    return false;
  }

  try {
    return setTableAutoWidth(editor);
  } catch (error) {
    console.error('Error adjusting table width:', error);
    return false;
  }
}

/**
 * Determines whether a UI control should be visible based on the editor
 * state and `hideWhenUnavailable` setting.
 */
function shouldShowButton({
  editor,
  hideWhenUnavailable,
}: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
}): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isExtensionAvailable(editor, REQUIRED_EXTENSIONS)) return false;

  return hideWhenUnavailable ? canFitTableToWidth(editor) : true;
}

/**
 * React hook that provides a **Fit table to container width** action for Tiptap.
 *
 * What it does:
 * - Sets the current table's `width` to `"100%"`
 * - Clears cell-level `colwidth` so the table can expand fluidly
 *
 * Returned API:
 * - `isVisible`: whether a button should be shown
 * - `canFitToWidth`: whether the action can execute now
 * - `handleFitToWidth()`: runs the action; returns `true` on success
 * - `label`: UI label, e.g. "Fit to width"
 * - `Icon`: a presentational icon component
 *
 * @example
 * // Minimal button
 * function FitToWidthButton() {
 *   const { isVisible, canFitToWidth, handleFitToWidth, label, Icon } =
 *     useTableFitToWidth({ hideWhenUnavailable: true })
 *
 *   if (!isVisible) return null
 *   return (
 *     <button onClick={handleFitToWidth} disabled={!canFitToWidth} aria-label={label}>
 *       <Icon /> {label}
 *     </button>
 *   )
 * }
 *
 * @example
 * // Using a provided editor instance and a success callback
 * function FitToWidthWithCallback({ editor }: { editor: Editor }) {
 *   const { handleFitToWidth, canFitToWidth } = useTableFitToWidth({
 *     editor,
 *     hideWhenUnavailable: true,
 *     onWidthAdjusted: () => console.log("Table set to auto width"),
 *   })
 *   return (
 *     <button onClick={handleFitToWidth} disabled={!canFitToWidth}>
 *       Fit to container
 *     </button>
 *   )
 * }
 */
export function useTableFitToWidth(config: UseTableFitToWidthConfig = {}) {
  const { editor: providedEditor, hideWhenUnavailable = false, onWidthAdjusted } = config;

  const { editor } = useTiptapEditor(providedEditor);

  const isVisible = shouldShowButton({
    editor,
    hideWhenUnavailable,
  });

  const canPerformAction = canFitTableToWidth(editor);

  const handleFitToWidth = useCallback(() => {
    const success = tableFitToWidth({ editor });
    if (success) onWidthAdjusted?.();
    return success;
  }, [editor, onWidthAdjusted]);

  const label = 'Fit to width';
  const Icon = MoveHorizontalIcon;

  return {
    isVisible,
    canFitToWidth: canPerformAction,
    handleFitToWidth,
    label,
    Icon,
  };
}
