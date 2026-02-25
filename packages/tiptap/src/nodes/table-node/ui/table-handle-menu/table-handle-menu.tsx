import { useCallback, useMemo, useState, createContext, useContext } from 'react';
import type { Editor } from '@tiptap/react';
import { TableMap } from '@tiptap/pm/tables';
import type { Node } from '@tiptap/pm/model';

// --- Hooks ---
import { useTiptapEditor } from '../../../../hooks/use-tiptap-editor';
import { cn, isValidPosition, SR_ONLY } from '../../../../utils/tiptap-utils';
import type { Orientation } from '../../lib/tiptap-table-utils';
import { selectCellsByCoords } from '../../lib/tiptap-table-utils';

// --- Icons ---
import { MoreVertical } from '@moryflow/ui/icons/more-vertical-icon';

// --- UI Primitives ---
import { Button } from '../../../../ui-primitive/button';
import { Combobox, ComboboxList } from '../../../../ui-primitive/combobox';
import { Menu, MenuButton, MenuContent, MenuGroup, MenuItem } from '../../../../ui-primitive/menu';
import { Separator } from '../../../../ui-primitive/separator';

// --- Tiptap UI ---
import { useTableDuplicateRowColumn } from '../table-duplicate-row-column-button';
import { useTableMoveRowColumn } from '../table-move-row-column-button';
import { useTableClearRowColumnContent } from '../table-clear-row-column-content-button';
import { useTableHeaderRowColumn } from '../table-header-row-column-button';
import { useTableAddRowColumn } from '../table-add-row-column-button';
import { useTableDeleteRowColumn } from '../table-delete-row-column-button';
import { useTableSortRowColumn } from '../table-sort-row-column-button';
import { ColorMenu } from '../../../../ui/color-menu';
import { TableAlignMenu } from '../table-alignment-menu';

import { dragEnd } from '../../extensions/table-handle';

import './table-handle-menu.scss';

/* -------------------------------------------------------------------------------------------------
 * Types & Interfaces
 * ----------------------------------------------------------------------------------------------- */

interface BaseProps {
  editor?: Editor | null;
  orientation: Orientation;
  index?: number;
  tableNode?: Node;
  tablePos?: number;
}

interface TableHandleMenuProps extends BaseProps {
  onToggleOtherHandle?: (visible: boolean) => void;
  onOpenChange?: (open: boolean) => void;
  dragStart?: (e: React.DragEvent) => void;
}

type TableHandleContextValue = BaseProps;

interface TableActionItemProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  shortcutBadge?: React.ReactNode;
}

const MENU_PLACEMENT_MAP: Record<Orientation, React.ComponentProps<typeof Menu>['placement']> = {
  row: 'top-start',
  column: 'bottom-start',
};

const ARIA_LABELS: Record<Orientation, string> = {
  row: 'Row actions',
  column: 'Column actions',
};

/* -------------------------------------------------------------------------------------------------
 * Context
 * ----------------------------------------------------------------------------------------------- */

const TableHandleContext = createContext<TableHandleContextValue | null>(null);

function useTableHandleContext() {
  const context = useContext(TableHandleContext);
  if (!context) {
    throw new Error('useTableHandleContext must be used within TableHandleProvider');
  }
  return context;
}

/* -------------------------------------------------------------------------------------------------
 * Hooks
 * ----------------------------------------------------------------------------------------------- */

/**
 * Hook to manage table handle menu state and interactions
 */
function useTableHandleMenu(
  onToggleOtherHandle?: (visible: boolean) => void,
  onOpenChange?: (open: boolean) => void
) {
  const { editor, orientation, index, tableNode, tablePos } = useTableHandleContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const menuPlacement = useMemo(() => MENU_PLACEMENT_MAP[orientation], [orientation]);

  const selectRowOrColumn = useCallback(() => {
    if (!editor || !tableNode || !isValidPosition(tablePos) || !isValidPosition(index)) return;

    try {
      const { width, height } = TableMap.get(tableNode);
      const start = orientation === 'row' ? { row: index, col: 0 } : { row: 0, col: index };
      const end =
        orientation === 'row' ? { row: index, col: width - 1 } : { row: height - 1, col: index };

      selectCellsByCoords(editor, tablePos, [start, end], {
        mode: 'dispatch',
        dispatch: editor.view.dispatch.bind(editor.view),
      });
    } catch (error) {
      console.warn('Failed to select row/column:', error);
    }
  }, [editor, tableNode, tablePos, orientation, index]);

  const handleMenuToggle = useCallback(
    (isOpen: boolean) => {
      if (!editor) return;

      setIsMenuOpen(isOpen);
      onOpenChange?.(isOpen);

      if (isOpen) {
        editor.commands.freezeHandles();
        selectRowOrColumn();
        onToggleOtherHandle?.(false);
      } else {
        editor.commands.unfreezeHandles();
        onToggleOtherHandle?.(true);
      }
    },
    [editor, onOpenChange, onToggleOtherHandle, selectRowOrColumn]
  );

  const resetMenu = useCallback(() => {
    if (!editor) return;

    setIsMenuOpen(false);
    onOpenChange?.(false);
    editor.commands.unfreezeHandles();
    onToggleOtherHandle?.(true);
  }, [editor, onOpenChange, onToggleOtherHandle]);

  return {
    isMenuOpen,
    isDragging,
    setIsDragging,
    menuPlacement,
    handleMenuToggle,
    resetMenu,
  };
}

/**
 * Hook to get filtered action items based on orientation
 */
function useTableActionItems() {
  const { editor, index, orientation, tablePos } = useTableHandleContext();

  const deleteAction = useTableDeleteRowColumn({
    editor,
    index,
    orientation,
    tablePos,
  });
  const duplicateAction = useTableDuplicateRowColumn({
    editor,
    index,
    orientation,
    tablePos,
  });

  // Sort actions
  const sortAscAction = useTableSortRowColumn({
    editor,
    tablePos,
    index,
    orientation,
    direction: 'asc',
    hideWhenUnavailable: true,
  });

  const sortDescAction = useTableSortRowColumn({
    editor,
    tablePos,
    index,
    orientation,
    direction: 'desc',
    hideWhenUnavailable: true,
  });

  const clearContentAction = useTableClearRowColumnContent({
    editor,
    index,
    orientation,
    tablePos,
    resetAttrs: true,
    hideWhenUnavailable: true,
  });

  const headerAction = useTableHeaderRowColumn({
    editor,
    index,
    orientation,
    tablePos,
    hideWhenUnavailable: true,
  });

  const moveUpAction = useTableMoveRowColumn({
    editor,
    index,
    tablePos,
    orientation: 'row',
    direction: 'up',
    hideWhenUnavailable: true,
  });

  const moveDownAction = useTableMoveRowColumn({
    editor,
    index,
    tablePos,
    orientation: 'row',
    direction: 'down',
    hideWhenUnavailable: true,
  });

  const moveLeftAction = useTableMoveRowColumn({
    editor,
    index,
    tablePos,
    orientation: 'column',
    direction: 'left',
    hideWhenUnavailable: true,
  });

  const moveRightAction = useTableMoveRowColumn({
    editor,
    index,
    tablePos,
    orientation: 'column',
    direction: 'right',
    hideWhenUnavailable: true,
  });

  const addAbove = useTableAddRowColumn({
    editor,
    index,
    tablePos,
    orientation: 'row',
    side: 'above',
    hideWhenUnavailable: true,
  });

  const addBelow = useTableAddRowColumn({
    editor,
    index,
    tablePos,
    orientation: 'row',
    side: 'below',
    hideWhenUnavailable: true,
  });

  const addLeft = useTableAddRowColumn({
    editor,
    index,
    tablePos,
    orientation: 'column',
    side: 'left',
    hideWhenUnavailable: true,
  });

  const addRight = useTableAddRowColumn({
    editor,
    index,
    tablePos,
    orientation: 'column',
    side: 'right',
    hideWhenUnavailable: true,
  });

  const moveActions = useMemo(
    () => ({
      moveUp: moveUpAction,
      moveDown: moveDownAction,
      moveLeft: moveLeftAction,
      moveRight: moveRightAction,
    }),
    [moveUpAction, moveDownAction, moveLeftAction, moveRightAction]
  );

  const addActions = useMemo(
    () => ({
      addAbove,
      addBelow,
      addLeft,
      addRight,
    }),
    [addAbove, addBelow, addLeft, addRight]
  );

  const sortActions = useMemo(
    () => ({
      sortAsc: sortAscAction,
      sortDesc: sortDescAction,
    }),
    [sortAscAction, sortDescAction]
  );

  const getSortItems = useCallback(() => {
    const items: TableActionItemProps[] = [];

    if (sortActions.sortAsc.isVisible) {
      items.push({
        icon: sortActions.sortAsc.Icon,
        label: sortActions.sortAsc.label,
        disabled: !sortActions.sortAsc.canSortRowColumn,
        onClick: sortActions.sortAsc.handleSort,
      });
    }

    if (sortActions.sortDesc.isVisible) {
      items.push({
        icon: sortActions.sortDesc.Icon,
        label: sortActions.sortDesc.label,
        disabled: !sortActions.sortDesc.canSortRowColumn,
        onClick: sortActions.sortDesc.handleSort,
      });
    }

    return items;
  }, [sortActions]);

  const getActionItems = useCallback(() => {
    const items: TableActionItemProps[] = [];

    if (orientation === 'row') {
      if (addActions.addAbove.isVisible) {
        items.push({
          icon: addActions.addAbove.Icon,
          label: addActions.addAbove.label,
          disabled: !addActions.addAbove.canAddRowColumn,
          onClick: addActions.addAbove.handleAdd,
        });
      }
      if (addActions.addBelow.isVisible) {
        items.push({
          icon: addActions.addBelow.Icon,
          label: addActions.addBelow.label,
          disabled: !addActions.addBelow.canAddRowColumn,
          onClick: addActions.addBelow.handleAdd,
        });
      }
    } else {
      if (addActions.addLeft.isVisible) {
        items.push({
          icon: addActions.addLeft.Icon,
          label: addActions.addLeft.label,
          disabled: !addActions.addLeft.canAddRowColumn,
          onClick: addActions.addLeft.handleAdd,
        });
      }
      if (addActions.addRight.isVisible) {
        items.push({
          icon: addActions.addRight.Icon,
          label: addActions.addRight.label,
          disabled: !addActions.addRight.canAddRowColumn,
          onClick: addActions.addRight.handleAdd,
        });
      }
    }

    return items;
  }, [orientation, addActions]);

  const getMoveItems = useCallback(() => {
    const items: TableActionItemProps[] = [];

    if (orientation === 'row') {
      if (moveActions.moveUp.isVisible) {
        items.push({
          icon: moveActions.moveUp.Icon,
          label: moveActions.moveUp.label,
          disabled: !moveActions.moveUp.canMoveRowColumn,
          onClick: moveActions.moveUp.handleMove,
        });
      }
      if (moveActions.moveDown.isVisible) {
        items.push({
          icon: moveActions.moveDown.Icon,
          label: moveActions.moveDown.label,
          disabled: !moveActions.moveDown.canMoveRowColumn,
          onClick: moveActions.moveDown.handleMove,
        });
      }
    } else {
      if (moveActions.moveLeft.isVisible) {
        items.push({
          icon: moveActions.moveLeft.Icon,
          label: moveActions.moveLeft.label,
          disabled: !moveActions.moveLeft.canMoveRowColumn,
          onClick: moveActions.moveLeft.handleMove,
        });
      }
      if (moveActions.moveRight.isVisible) {
        items.push({
          icon: moveActions.moveRight.Icon,
          label: moveActions.moveRight.label,
          disabled: !moveActions.moveRight.canMoveRowColumn,
          onClick: moveActions.moveRight.handleMove,
        });
      }
    }

    return items;
  }, [orientation, moveActions]);

  return {
    deleteAction,
    duplicateAction,
    clearContentAction,
    headerAction,
    addItems: getActionItems(),
    moveItems: getMoveItems(),
    sortItems: getSortItems(),
  };
}

/* -------------------------------------------------------------------------------------------------
 * Components
 * ----------------------------------------------------------------------------------------------- */

/**
 * Individual action item component
 */
const TableActionItem = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  isActive = false,
  shortcutBadge,
}: TableActionItemProps) => (
  <MenuItem
    render={<Button data-style="ghost" data-active-state={isActive ? 'on' : 'off'} />}
    onClick={onClick}
    disabled={disabled}
  >
    <Icon className="tiptap-button-icon" />
    <span className="tiptap-button-text">{label}</span>
    {shortcutBadge}
  </MenuItem>
);

/**
 * Action group component containing add and delete actions
 */
const TableActionGroup = () => {
  const { index, orientation } = useTableHandleContext();
  const {
    deleteAction,
    duplicateAction,
    clearContentAction,
    headerAction,
    addItems,
    moveItems,
    sortItems,
  } = useTableActionItems();

  const hasActions =
    deleteAction.isVisible || duplicateAction.isVisible || clearContentAction.isVisible;
  const hasAddItems = addItems.length > 0;
  const hasMoveItems = moveItems.length > 0;
  const hasSortItems = sortItems.length > 0;
  const hasHeaderAction = headerAction.isVisible && index === 0;

  if (!hasActions && !hasAddItems && !hasMoveItems && !hasSortItems && !hasHeaderAction) {
    return null;
  }

  return (
    <>
      {/* Header Toggle Action - Only for first row/column */}
      {hasHeaderAction && (
        <>
          <MenuGroup>
            <TableActionItem
              icon={headerAction.Icon}
              label={headerAction.label}
              disabled={!headerAction.canToggleHeader}
              isActive={headerAction.isActive}
              onClick={headerAction.handleToggle}
            />
          </MenuGroup>
          <Separator orientation="horizontal" />
        </>
      )}

      {/* Move Actions */}
      {hasMoveItems && (
        <>
          <MenuGroup>
            {moveItems.map((item, i) => (
              <TableActionItem key={`move-${i}`} {...item} />
            ))}
          </MenuGroup>
          <Separator orientation="horizontal" />
        </>
      )}

      {/* Add Actions */}
      {hasAddItems && (
        <>
          <MenuGroup>
            {addItems.map((item, i) => (
              <TableActionItem key={`add-${i}`} {...item} />
            ))}
          </MenuGroup>
          <Separator orientation="horizontal" />
        </>
      )}

      {/* Sort Actions */}
      {hasSortItems && (
        <>
          <MenuGroup>
            {sortItems.map((item, i) => (
              <TableActionItem key={`sort-${i}`} {...item} />
            ))}
          </MenuGroup>
          <Separator orientation="horizontal" />
        </>
      )}

      {/* Actions */}
      <>
        <MenuGroup>
          <ColorMenu />
          <TableAlignMenu index={index} orientation={orientation} />
          {clearContentAction.isVisible && (
            <TableActionItem
              icon={clearContentAction.Icon}
              label={clearContentAction.label}
              disabled={!clearContentAction.canClearRowColumnContent}
              onClick={clearContentAction.handleClear}
            />
          )}
        </MenuGroup>
        <Separator orientation="horizontal" />
      </>

      {hasActions && (
        <MenuGroup>
          {duplicateAction.isVisible && (
            <TableActionItem
              icon={duplicateAction.Icon}
              label={duplicateAction.label}
              disabled={!duplicateAction.canDuplicateRowColumn}
              onClick={duplicateAction.handleDuplicate}
            />
          )}

          {deleteAction.isVisible && (
            <TableActionItem
              icon={deleteAction.Icon}
              label={deleteAction.label}
              disabled={!deleteAction.canDeleteRowColumn}
              onClick={deleteAction.handleDelete}
            />
          )}
        </MenuGroup>
      )}
    </>
  );
};

/**
 * Menu content component
 */
const TableActionMenu = () => {
  const { resetMenu } = useTableHandleMenu();

  return (
    <MenuContent autoFocusOnShow autoFocusOnHide={false} modal onClose={resetMenu}>
      <Combobox style={SR_ONLY} />
      <ComboboxList style={{ minWidth: '15rem' }}>
        <TableActionGroup />
      </ComboboxList>
    </MenuContent>
  );
};

/**
 * Main table handle menu component
 */
export const TableHandleMenu = ({
  editor: providedEditor,
  orientation,
  index,
  tableNode,
  tablePos,
  onToggleOtherHandle,
  onOpenChange,
  dragStart,
}: TableHandleMenuProps) => {
  const { editor } = useTiptapEditor(providedEditor);

  const contextValue = useMemo<TableHandleContextValue>(
    () => ({
      editor,
      orientation,
      index,
      tableNode,
      tablePos,
    }),
    [editor, orientation, index, tableNode, tablePos]
  );

  return (
    <TableHandleContext.Provider value={contextValue}>
      <TableHandleMenuContent
        onToggleOtherHandle={onToggleOtherHandle}
        onOpenChange={onOpenChange}
        dragStart={dragStart}
      />
    </TableHandleContext.Provider>
  );
};

/**
 * Internal menu content component
 */
const TableHandleMenuContent = ({
  onToggleOtherHandle,
  onOpenChange,
  dragStart,
}: Pick<TableHandleMenuProps, 'onToggleOtherHandle' | 'onOpenChange' | 'dragStart'>) => {
  const { orientation } = useTableHandleContext();
  const { isMenuOpen, isDragging, setIsDragging, menuPlacement, handleMenuToggle } =
    useTableHandleMenu(onToggleOtherHandle, onOpenChange);

  const ariaLabel = ARIA_LABELS[orientation];

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      setIsDragging(true);
      dragStart?.(e);
    },
    [dragStart, setIsDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragEnd();
  }, [setIsDragging]);

  return (
    <Menu
      open={isMenuOpen}
      onOpenChange={handleMenuToggle}
      placement={menuPlacement}
      trigger={
        <MenuButton
          className={cn(
            'tiptap-table-handle-menu',
            isMenuOpen && 'menu-opened',
            isDragging && 'is-dragging',
            orientation
          )}
          draggable={true}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <MoreVertical className="tiptap-button-icon" />
        </MenuButton>
      }
    >
      <TableActionMenu />
    </Menu>
  );
};

export { TableActionMenu };
