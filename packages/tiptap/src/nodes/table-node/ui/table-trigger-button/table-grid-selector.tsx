import { forwardRef, useMemo, useCallback } from 'react';

// --- UI Primitives ---
import { Button } from '../../../../ui-primitive/button';

// --- Lib ---
import { cn } from '../../../../utils/tiptap-utils';

// --- Icons ---
import { TableColumnIcon } from '@moryflow/ui/icons/table-column-icon';
import { TableRowIcon } from '@moryflow/ui/icons/table-row-icon';

import './table-grid-selector.scss';

// --- Types ---
export interface CellCoordinates {
  row: number;
  col: number;
}

export interface TableGridSelectorProps {
  /**
   * Initial number of rows to display in the grid
   * @default 8
   */
  maxRows?: number;
  /**
   * Initial number of columns to display in the grid
   * @default 8
   */
  maxCols?: number;
  /**
   * Currently hovered cell coordinates
   */
  hoveredCell: CellCoordinates | null;
  /**
   * Callback when a cell is hovered
   */
  onCellHover: (row: number, col: number) => void;
  /**
   * Callback when a cell is clicked
   */
  onCellClick: (row: number, col: number) => void;
  /**
   * Callback when mouse leaves the grid
   */
  onMouseLeave?: () => void;
  /**
   * Whether the grid cells should be disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * Additional class name for the container
   */
  className?: string;
  /**
   * Whether to show the size indicator
   * @default true
   */
  showSizeIndicator?: boolean;
}

interface GridCellProps {
  row: number;
  col: number;
  isSelected: boolean;
  disabled: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

const isCellSelected = (cell: CellCoordinates, hoveredCell: CellCoordinates | null): boolean => {
  if (!hoveredCell) return false;
  return cell.row <= hoveredCell.row && cell.col <= hoveredCell.col;
};

const generateGridCells = (rows: number, cols: number): CellCoordinates[] => {
  const totalCells = rows * cols;
  return Array.from({ length: totalCells }, (_, index) => ({
    row: Math.floor(index / cols),
    col: index % cols,
  }));
};

const GridCell = ({ row, col, isSelected, disabled, onMouseEnter, onClick }: GridCellProps) => (
  <Button
    data-size="small"
    type="button"
    className={cn('tiptap-table-grid-cell', isSelected && 'selected')}
    disabled={disabled}
    onMouseEnter={onMouseEnter}
    onClick={onClick}
    aria-label={`Select ${row + 1}x${col + 1} table`}
  />
);

const SizeIndicator = ({ hoveredCell }: { hoveredCell: CellCoordinates | null }) => {
  const columns = hoveredCell ? hoveredCell.col + 1 : 1;
  const rows = hoveredCell ? hoveredCell.row + 1 : 1;

  return (
    <div className="tiptap-table-size-indicator">
      <div className="tiptap-table-size-indicator-item">
        <TableColumnIcon className="tiptap-table-column-icon" />
        <span className="tiptap-table-size-indicator-text">{columns}</span>
      </div>
      <span className="tiptap-table-size-indicator-delimiter">x</span>
      <div className="tiptap-table-size-indicator-item">
        <TableRowIcon className="tiptap-table-row-icon" />
        <span className="tiptap-table-size-indicator-text">{rows}</span>
      </div>
    </div>
  );
};

/**
 * Reusable table grid selector component for selecting table dimensions.
 *
 * @example
 * ```tsx
 * const [hoveredCell, setHoveredCell] = useState<CellCoordinates | null>(null)
 *
 * <TableGridSelector
 *   maxRows={8}
 *   maxCols={8}
 *   hoveredCell={hoveredCell}
 *   onCellHover={(row, col) => setHoveredCell({ row, col })}
 *   onCellClick={(row, col) => insertTable(row + 1, col + 1)}
 *   onMouseLeave={() => setHoveredCell(null)}
 * />
 * ```
 */
export const TableGridSelector = forwardRef<HTMLDivElement, TableGridSelectorProps>(
  (
    {
      maxRows = 8,
      maxCols = 8,
      hoveredCell,
      onCellHover,
      onCellClick,
      onMouseLeave,
      disabled = false,
      className,
      showSizeIndicator = true,
    },
    ref
  ) => {
    const gridCells = useMemo(() => generateGridCells(maxRows, maxCols), [maxRows, maxCols]);

    const gridStyle = useMemo(
      () =>
        ({
          '--tt-table-columns': maxCols,
          '--tt-table-rows': maxRows,
        }) as React.CSSProperties,
      [maxCols, maxRows]
    );

    const handleCellHover = useCallback(
      (row: number, col: number) => () => onCellHover(row, col),
      [onCellHover]
    );

    const handleCellClick = useCallback(
      (row: number, col: number) => () => onCellClick(row, col),
      [onCellClick]
    );

    return (
      <>
        <div
          ref={ref}
          className={cn('tiptap-table-grid', className)}
          onMouseLeave={onMouseLeave}
          style={gridStyle}
        >
          {gridCells.map((cell, index) => (
            <GridCell
              key={index}
              row={cell.row}
              col={cell.col}
              isSelected={isCellSelected(cell, hoveredCell)}
              disabled={disabled}
              onMouseEnter={handleCellHover(cell.row, cell.col)}
              onClick={handleCellClick(cell.row, cell.col)}
            />
          ))}
        </div>

        {showSizeIndicator && <SizeIndicator hoveredCell={hoveredCell} />}
      </>
    );
  }
);

TableGridSelector.displayName = 'TableGridSelector';
