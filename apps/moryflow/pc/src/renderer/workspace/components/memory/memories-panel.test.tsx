import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MemoryFact } from '@shared/ipc';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@moryflow/ui/components/sheet', () => ({
  Sheet: ({ children, open }: any) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@moryflow/ui/components/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@moryflow/ui/components/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock('@moryflow/ui/components/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@moryflow/ui/components/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@moryflow/ui/components/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('./helpers', () => ({
  relativeTime: (date: string | null) => (date ? '1h ago' : 'Never'),
}));

import { MemoriesPanel } from './memories-panel';

const now = new Date().toISOString();

const testFacts: MemoryFact[] = [
  {
    id: 'fact-1',
    text: 'Prefers TypeScript',
    kind: 'manual',
    readOnly: false,
    metadata: null,
    categories: ['preference'],
    sourceId: null,
    sourceRevisionId: null,
    sourceType: null,
    derivedKey: null,
    expirationDate: null,
    factScope: 'personal',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'fact-2',
    text: 'Works on cloud sync',
    kind: 'manual',
    readOnly: false,
    metadata: { origin: 'agent_tool' },
    categories: ['context'],
    sourceId: null,
    sourceRevisionId: null,
    sourceType: null,
    derivedKey: null,
    expirationDate: null,
    factScope: 'personal',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'fact-3',
    text: 'Enjoys running',
    kind: 'manual',
    readOnly: false,
    metadata: null,
    categories: ['interest'],
    sourceId: null,
    sourceRevisionId: null,
    sourceType: null,
    derivedKey: null,
    expirationDate: null,
    factScope: 'personal',
    createdAt: now,
    updatedAt: now,
  },
];

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  facts: testFacts,
  selectedFactId: null as string | null,
  onSelectFact: vi.fn(),
  onCreateFact: vi.fn(),
  onUpdateFact: vi.fn(),
  onDeleteFact: vi.fn(),
  onBatchDeleteFacts: vi.fn(),
  onFeedbackFact: vi.fn(),
};

describe('MemoriesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('"From conversations" filter shows only AI-saved facts', () => {
    render(<MemoriesPanel {...defaultProps} />);

    // Click "From conversations" tab
    const conversationsTab = screen.getByText('memoriesFilterConversations');
    fireEvent.click(conversationsTab);

    // fact-2 (agent_tool origin) should be visible
    expect(screen.getByText('Works on cloud sync')).toBeTruthy();
    // fact-1 and fact-3 (no agent_tool origin) should not be visible
    expect(screen.queryByText('Prefers TypeScript')).toBeNull();
    expect(screen.queryByText('Enjoys running')).toBeNull();
  });

  it('"Manual" filter excludes AI-saved facts', () => {
    render(<MemoriesPanel {...defaultProps} />);

    // Click "Manual" tab
    const manualTab = screen.getByText('memoriesFilterManual');
    fireEvent.click(manualTab);

    // fact-1 and fact-3 (manual, no agent_tool) should be visible
    expect(screen.getByText('Prefers TypeScript')).toBeTruthy();
    expect(screen.getByText('Enjoys running')).toBeTruthy();
    // fact-2 (agent_tool origin) should not be visible
    expect(screen.queryByText('Works on cloud sync')).toBeNull();
  });

  it('"All" filter shows everything by default', () => {
    render(<MemoriesPanel {...defaultProps} />);

    // Default tab is "All", all facts should be visible
    expect(screen.getByText('Prefers TypeScript')).toBeTruthy();
    expect(screen.getByText('Works on cloud sync')).toBeTruthy();
    expect(screen.getByText('Enjoys running')).toBeTruthy();
  });

  it('batch delete calls onBatchDeleteFacts with correct IDs', () => {
    render(<MemoriesPanel {...defaultProps} />);

    // Select fact-1 and fact-3 via checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // fact-1
    fireEvent.click(checkboxes[2]); // fact-3

    // Click "Delete selected" button
    const deleteSelectedBtn = screen.getByText('memoriesDeleteSelected');
    fireEvent.click(deleteSelectedBtn);

    // Confirm in the batch delete dialog
    const deleteAllBtn = screen.getByText('memoriesDeleteAll');
    fireEvent.click(deleteAllBtn);

    expect(defaultProps.onBatchDeleteFacts).toHaveBeenCalledTimes(1);
    const calledIds = defaultProps.onBatchDeleteFacts.mock.calls[0][0] as string[];
    expect(calledIds.sort()).toEqual(['fact-1', 'fact-3']);
  });

  it('delete single fact shows confirmation dialog', () => {
    render(<MemoriesPanel {...defaultProps} selectedFactId="fact-1" />);

    // The Delete button in the detail pane
    const deleteButton = screen.getByText('memoriesDelete');
    fireEvent.click(deleteButton);

    // Confirmation dialog should appear
    expect(screen.getByText('memoriesDeleteTitle')).toBeTruthy();
    expect(screen.getByText('memoriesDeleteDescription')).toBeTruthy();
  });
});
