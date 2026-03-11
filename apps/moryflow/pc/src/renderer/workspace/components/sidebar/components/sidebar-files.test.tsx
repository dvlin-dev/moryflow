import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarFiles } from './sidebar-files';
import type { SidebarFilesProps } from '../const';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@moryflow/ui/components/context-menu', () => ({
  ContextMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  ContextMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ContextMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/vault-files', () => ({
  VaultFiles: () => <div data-testid="vault-files">vault-files</div>,
}));

const createProps = (overrides: Partial<SidebarFilesProps> = {}): SidebarFilesProps => ({
  vault: { path: '/vault' },
  tree: [
    {
      id: 'file-1',
      name: 'note.md',
      type: 'file',
      path: '/vault/note.md',
    },
  ],
  expandedPaths: [],
  treeState: 'idle',
  treeError: null,
  selectedId: null,
  onSelectNode: vi.fn(),
  onExpandedPathsChange: vi.fn(),
  onOpenFile: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
  onCreateFile: vi.fn(),
  onCreateFolder: vi.fn(),
  onShowInFinder: vi.fn(),
  onMove: vi.fn(),
  onCreateFileInRoot: vi.fn(),
  onCreateFolderInRoot: vi.fn(),
  onPublish: vi.fn(),
  ...overrides,
});

describe('SidebarFiles', () => {
  it('keeps a full-height trigger area without reintroducing local clipping', () => {
    render(<SidebarFiles {...createProps()} />);

    const wrapper = screen.getByTestId('vault-files').parentElement;
    const classes = wrapper?.className.split(/\s+/) ?? [];

    expect(wrapper).not.toBeNull();
    expect(classes).toContain('h-full');
    expect(classes).toContain('py-1');
    expect(classes).not.toContain('overflow-hidden');
  });

  it('keeps root create file and create folder actions available from the blank-area context menu', () => {
    const onCreateFileInRoot = vi.fn();
    const onCreateFolderInRoot = vi.fn();

    render(
      <SidebarFiles
        {...createProps({
          onCreateFileInRoot,
          onCreateFolderInRoot,
        })}
      />
    );

    fireEvent.click(screen.getByText('newNote'));
    fireEvent.click(screen.getByText('newFolder'));

    expect(onCreateFileInRoot).toHaveBeenCalledTimes(1);
    expect(onCreateFolderInRoot).toHaveBeenCalledTimes(1);
  });
});
