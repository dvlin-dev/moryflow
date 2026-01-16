import { useCallback } from "react"
import type { Editor } from "@tiptap/react"
import { mergeCells, splitCell } from "@tiptap/pm/tables"

// --- Hooks ---
import { useTiptapEditor } from "../../../../hooks/use-tiptap-editor"

// --- Lib ---
import { isExtensionAvailable } from "../../../../utils/tiptap-utils"

// --- Icons ---
import { TableCellMergeIcon } from "@anyhunt/ui/icons/table-cell-merge-icon"
import { TableCellSplitIcon } from "@anyhunt/ui/icons/table-cell-split-icon"

export type MergeSplitAction = "merge" | "split"

export interface UseTableMergeSplitCellConfig {
  /**
   * The Tiptap editor instance. If omitted, the hook will use
   * the context/editor from `useTiptapEditor`.
   */
  editor?: Editor | null
  /**
   * The action to perform - merge or split cells.
   */
  action: MergeSplitAction
  /**
   * Hide the button when the action isn't currently possible.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful merge or split.
   */
  onExecuted?: (action: MergeSplitAction) => void
}

const REQUIRED_EXTENSIONS = ["table"]

export const tableMergeSplitCellLabels: Record<MergeSplitAction, string> = {
  merge: "Merge cells",
  split: "Split cell",
}

export const tableMergeSplitCellIcons = {
  merge: TableCellMergeIcon,
  split: TableCellSplitIcon,
}

/**
 * Checks if a table cell merge can be performed
 * in the current editor state.
 */
function canMergeCells(editor: Editor | null): boolean {
  if (
    !editor ||
    !editor.isEditable ||
    !isExtensionAvailable(editor, REQUIRED_EXTENSIONS)
  ) {
    return false
  }

  try {
    return mergeCells(editor.state, undefined)
  } catch {
    return false
  }
}

/**
 * Checks if a table cell split can be performed
 * in the current editor state.
 */
function canSplitCell(editor: Editor | null): boolean {
  if (
    !editor ||
    !editor.isEditable ||
    !isExtensionAvailable(editor, REQUIRED_EXTENSIONS)
  ) {
    return false
  }

  try {
    return splitCell(editor.state, undefined)
  } catch {
    return false
  }
}

/**
 * Executes the cell merge operation in the editor.
 */
function tableMergeCells(editor: Editor | null): boolean {
  if (!canMergeCells(editor) || !editor) return false

  try {
    const { state, view } = editor
    return mergeCells(state, view.dispatch.bind(view))
  } catch (error) {
    console.error("Error merging table cells:", error)
    return false
  }
}

/**
 * Executes the cell split operation in the editor.
 */
function tableSplitCell(editor: Editor | null): boolean {
  if (!canSplitCell(editor) || !editor) return false

  try {
    const { state, view } = editor
    return splitCell(state, view.dispatch.bind(view))
  } catch (error) {
    console.error("Error splitting table cell:", error)
    return false
  }
}

/**
 * Executes the merge/split operation in the editor.
 */
function tableMergeSplitCell({
  editor,
  action,
}: {
  editor: Editor | null
  action: MergeSplitAction
}): boolean {
  if (!editor) return false

  try {
    return action === "merge" ? tableMergeCells(editor) : tableSplitCell(editor)
  } catch (error) {
    console.error(`Error ${action}ing table cell:`, error)
    return false
  }
}

/**
 * Determines if the merge/split button should be shown
 * based on editor state and config.
 */
function shouldShowButton({
  editor,
  action,
  hideWhenUnavailable,
}: {
  editor: Editor | null
  action: MergeSplitAction
  hideWhenUnavailable: boolean
}): boolean {
  if (!editor || !editor.isEditable) return false
  if (!isExtensionAvailable(editor, REQUIRED_EXTENSIONS)) return false

  if (hideWhenUnavailable) {
    return action === "merge" ? canMergeCells(editor) : canSplitCell(editor)
  }

  return true
}

/**
 * Custom hook that provides **table cell merge/split**
 * functionality for the Tiptap editor.
 *
 * @example
 * ```tsx
 * // Simple merge button
 * function MergeCellsButton() {
 *   const { isVisible, handleExecute, canExecute, label, Icon } = useTableMergeSplitCell({
 *     action: "merge",
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <button
 *       onClick={handleExecute}
 *       disabled={!canExecute}
 *       aria-label={label}
 *     >
 *       <Icon /> {label}
 *     </button>
 *   )
 * }
 *
 * // Split cell button with callback
 * function SplitCellButton({ editor }: { editor: Editor }) {
 *   const { isVisible, handleExecute, label, canExecute, Icon } = useTableMergeSplitCell({
 *     editor,
 *     action: "split",
 *     hideWhenUnavailable: true,
 *     onExecuted: (action) => console.log(`${action} completed!`),
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <button
 *       onClick={handleExecute}
 *       disabled={!canExecute}
 *       aria-label={label}
 *     >
 *       <Icon /> {label}
 *     </button>
 *   )
 * }
 *
 * // Dynamic merge/split button based on context
 * function MergeSplitButton() {
 *   const mergeAction = useTableMergeSplitCell({
 *     action: "merge",
 *     hideWhenUnavailable: true,
 *   })
 *
 *   const splitAction = useTableMergeSplitCell({
 *     action: "split",
 *     hideWhenUnavailable: true,
 *   })
 *
 *   if (mergeAction.isVisible) {
 *     return (
 *       <button
 *         onClick={mergeAction.handleExecute}
 *         disabled={!mergeAction.canExecute}
 *       >
 *         {mergeAction.label}
 *       </button>
 *     )
 *   }
 *
 *   if (splitAction.isVisible) {
 *     return (
 *       <button
 *         onClick={splitAction.handleExecute}
 *         disabled={!splitAction.canExecute}
 *       >
 *         {splitAction.label}
 *       </button>
 *     )
 *   }
 *
 *   return null
 * }
 * ```
 */
export function useTableMergeSplitCell(config: UseTableMergeSplitCellConfig) {
  const {
    editor: providedEditor,
    action,
    hideWhenUnavailable = false,
    onExecuted,
  } = config

  const { editor } = useTiptapEditor(providedEditor)

  const isVisible = shouldShowButton({
    editor,
    action,
    hideWhenUnavailable,
  })

  const canPerformAction =
    action === "merge" ? canMergeCells(editor) : canSplitCell(editor)

  const handleExecute = useCallback(() => {
    const success = tableMergeSplitCell({
      editor,
      action,
    })

    if (success) {
      onExecuted?.(action)
    }
    return success
  }, [editor, action, onExecuted])

  return {
    isVisible,
    canExecute: canPerformAction,
    handleExecute,
    label: tableMergeSplitCellLabels[action],
    Icon: tableMergeSplitCellIcons[action],
  }
}
