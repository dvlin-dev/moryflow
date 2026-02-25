'use client';

import { useCallback, useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { deleteRow, deleteColumn, CellSelection } from '@tiptap/pm/tables';
import type { Transaction } from '@tiptap/pm/state';

// --- Hooks ---
import { useTiptapEditor } from '../../../../hooks/use-tiptap-editor';

// --- Lib ---
import { isExtensionAvailable } from '../../../../utils/tiptap-utils';
import type { Orientation } from '../../lib/tiptap-table-utils';
import { getTable, getTableSelectionType, selectCellsByCoords } from '../../lib/tiptap-table-utils';

// --- Icons ---
import { TrashIcon } from '@moryflow/ui/icons/trash-icon';

export interface UseTableDeleteRowColumnConfig {
  /**
   * The Tiptap editor instance. If omitted, the hook will use
   * the context/editor from `useTiptapEditor`.
   */
  editor?: Editor | null;
  /**
   * The index of the row or column to delete.
   */
  index?: number;
  /**
   * Whether you're deleting a row or a column.
   */
  orientation?: Orientation;
  /**
   * The position of the table in the document.
   */
  tablePos?: number;
  /**
   * Hide the button when deletion isn't currently possible.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Callback function called after a successful delete.
   */
  onDeleted?: () => void;
}

const REQUIRED_EXTENSIONS = ['table'];

export const tableDeleteRowColumnLabels: Record<Orientation, string> = {
  row: 'Delete row',
  column: 'Delete column',
};

/**
 * Checks if a table row/column delete can be performed
 * in the current editor state.
 */
function canDeleteRowColumn({
  editor,
  index,
  orientation,
  tablePos,
}: {
  editor: Editor | null;
  index?: number;
  orientation?: Orientation;
  tablePos?: number;
}): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, REQUIRED_EXTENSIONS)) {
    return false;
  }

  try {
    const table = getTable(editor, tablePos);
    if (!table) return false;

    const selectionType = getTableSelectionType(editor, index, orientation);
    if (!selectionType) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Executes the row/column deletion in the editor.
 */
function tableDeleteRowColumn({
  editor,
  index,
  orientation,
  tablePos,
}: {
  editor: Editor | null;
  index?: number;
  orientation?: Orientation;
  tablePos?: number;
}): boolean {
  if (!canDeleteRowColumn({ editor, index, orientation, tablePos }) || !editor) {
    return false;
  }

  try {
    const selectionType = getTableSelectionType(editor, index, orientation);
    if (!selectionType) return false;

    const { orientation: finalOrientation, index: finalIndex } = selectionType;

    const isRow = finalOrientation === 'row';
    const dispatch = (tr: Transaction) => editor.view.dispatch(tr);
    const deleteOperation = isRow ? deleteRow : deleteColumn;

    if (editor.state.selection instanceof CellSelection) {
      return deleteOperation(editor.state, dispatch);
    }

    const table = getTable(editor, tablePos);
    if (!table) return false;

    const cellCoords = isRow ? { row: finalIndex, col: 0 } : { row: 0, col: finalIndex };

    const cellState = selectCellsByCoords(editor, table.pos, [cellCoords], {
      mode: 'state',
    });

    if (!cellState) return false;

    return deleteOperation(cellState, dispatch);
  } catch (error) {
    console.error(`Error deleting table row/column:`, error);
    return false;
  }
}

/**
 * Determines if the delete button should be shown
 * based on editor state and config.
 */
function shouldShowButton({
  editor,
  index,
  orientation,
  hideWhenUnavailable,
  tablePos,
}: {
  editor: Editor | null;
  index?: number;
  orientation?: Orientation;
  hideWhenUnavailable: boolean;
  tablePos?: number;
}): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isExtensionAvailable(editor, REQUIRED_EXTENSIONS)) return false;
  return hideWhenUnavailable ? canDeleteRowColumn({ editor, index, orientation, tablePos }) : true;
}

/**
 * Custom hook that provides **table row/column deletion**
 * functionality for the Tiptap editor.
 *
 * @example
 * ```tsx
 * // Simple usage with default editor context
 * function DeleteRowButton() {
 *   const { isVisible, handleDelete } = useTableDeleteRowColumn({
 *     index: 0,
 *     orientation: "row",
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleDelete}>Delete Row</button>
 * }
 *
 * // Advanced usage with custom editor instance
 * function DeleteColumnButton({ editor }: { editor: Editor }) {
 *   const { isVisible, handleDelete, label, canDeleteRowColumn, Icon } = useTableDeleteRowColumn({
 *     editor,
 *     index: 1,
 *     orientation: "column",
 *     hideWhenUnavailable: true,
 *     onDeleted: () => console.log("Column deleted!"),
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <button
 *       onClick={handleDelete}
 *       aria-disabled={!canDeleteRowColumn}
 *       aria-label={label}
 *     >
 *       <Icon /> Delete Column
 *     </button>
 *   )
 * }
 * ```
 */
export function useTableDeleteRowColumn(config: UseTableDeleteRowColumnConfig) {
  const {
    editor: providedEditor,
    index,
    orientation,
    tablePos,
    hideWhenUnavailable = false,
    onDeleted,
  } = config;

  const { editor } = useTiptapEditor(providedEditor);

  const selectionType = getTableSelectionType(editor, index, orientation);

  const isVisible = shouldShowButton({
    editor,
    index,
    orientation,
    hideWhenUnavailable,
  });

  const canPerformDelete = canDeleteRowColumn({
    editor,
    index,
    orientation,
    tablePos,
  });

  const handleDelete = useCallback(() => {
    const success = tableDeleteRowColumn({
      editor,
      index,
      orientation,
      tablePos,
    });
    if (success) onDeleted?.();
    return success;
  }, [editor, index, orientation, tablePos, onDeleted]);

  const label = useMemo(() => {
    return tableDeleteRowColumnLabels[selectionType?.orientation || 'row'];
  }, [selectionType]);

  return {
    isVisible,
    canDeleteRowColumn: canPerformDelete,
    handleDelete,
    label,
    Icon: TrashIcon,
  };
}
