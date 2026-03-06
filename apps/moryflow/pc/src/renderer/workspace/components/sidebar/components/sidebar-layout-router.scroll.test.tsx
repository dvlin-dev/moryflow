import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarLayoutRouter } from './sidebar-layout-router';

type SidebarPanelsMockState = {
  destination: 'agent' | 'agent-module' | 'skills' | 'sites';
  sidebarMode: 'home' | 'chat';
  vault: { path: string } | null;
  tree: Array<{ id: string; name: string; type: 'file'; path: string }>;
  expandedPaths: string[];
  treeState: 'idle' | 'loading' | 'error';
  treeError: string | null;
  selectedId: string | null;
  onOpenThread: ReturnType<typeof vi.fn>;
  onSelectNode: ReturnType<typeof vi.fn>;
  onExpandedPathsChange: ReturnType<typeof vi.fn>;
  onOpenFile: ReturnType<typeof vi.fn>;
  onRename: ReturnType<typeof vi.fn>;
  onDelete: ReturnType<typeof vi.fn>;
  onCreateFile: ReturnType<typeof vi.fn>;
  onShowInFinder: ReturnType<typeof vi.fn>;
  onMove: ReturnType<typeof vi.fn>;
  onCreateFileInRoot: ReturnType<typeof vi.fn>;
  onCreateFolderInRoot: ReturnType<typeof vi.fn>;
  onPublish: ReturnType<typeof vi.fn>;
};

let mockState: SidebarPanelsMockState;

vi.mock('../hooks/use-sidebar-panels-store', () => ({
  useSidebarPanelsStore: (selector: (state: SidebarPanelsMockState) => unknown) =>
    selector(mockState),
}));

vi.mock('./chat-threads-list', () => ({
  ChatThreadsList: () => <div data-testid="threads-list">threads</div>,
}));

vi.mock('./sidebar-files', () => ({
  SidebarFiles: () => <div data-testid="files-list">files</div>,
}));

vi.mock('./sidebar-create-menu', () => ({
  SidebarCreateMenu: () => <div data-testid="create-menu">create-menu</div>,
}));

vi.mock('./vault-selector', () => ({
  VaultSelector: () => <div data-testid="vault-selector">vault-selector</div>,
}));

const createState = (overrides: Partial<SidebarPanelsMockState> = {}): SidebarPanelsMockState => ({
  destination: 'agent',
  sidebarMode: 'home',
  vault: { path: '/vault' },
  tree: [],
  expandedPaths: [],
  treeState: 'idle',
  treeError: null,
  selectedId: null,
  onOpenThread: vi.fn(),
  onSelectNode: vi.fn(),
  onExpandedPathsChange: vi.fn(),
  onOpenFile: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
  onCreateFile: vi.fn(),
  onShowInFinder: vi.fn(),
  onMove: vi.fn(),
  onCreateFileInRoot: vi.fn(),
  onCreateFolderInRoot: vi.fn(),
  onPublish: vi.fn(),
  ...overrides,
});

describe('SidebarLayoutRouter scroll containers', () => {
  beforeEach(() => {
    mockState = createState();
  });

  it('keeps chat threads inside a dedicated scroll container', () => {
    mockState = createState({ sidebarMode: 'chat' });

    const { container } = render(<SidebarLayoutRouter />);
    const panel = screen.getByRole('tabpanel');

    expect(panel.getAttribute('id')).toBe('sidebar-mode-panel-chat');
    expect(screen.queryByTestId('threads-list')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="scroll-area"]')).toHaveLength(1);
  });

  it('keeps home files inside a dedicated scroll container', () => {
    const { container } = render(<SidebarLayoutRouter />);
    const panel = screen.getByRole('tabpanel');

    expect(panel.getAttribute('id')).toBe('sidebar-mode-panel-home');
    expect(screen.queryByTestId('vault-selector')).not.toBeNull();
    expect(screen.queryByTestId('files-list')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="scroll-area"]')).toHaveLength(1);
  });
});
