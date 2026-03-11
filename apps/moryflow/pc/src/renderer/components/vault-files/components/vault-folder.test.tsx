import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { VaultTreeNode } from '@shared/ipc';

import { VaultFolder } from './vault-folder';
import { useSyncVaultFilesStore } from '../vault-files-store';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@moryflow/ui/components/context-menu', () => ({
  ContextMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@moryflow/ui/animate/primitives/base/files', () => ({
  FolderItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FolderHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FolderTrigger: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  ),
  FolderIcon: ({ closeIcon }: { closeIcon: ReactNode }) => <span>{closeIcon}</span>,
  FolderPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('./node-context-menu', () => ({
  NodeContextMenu: ({
    items,
    onAction,
  }: {
    items: Array<{ action: string; labelKey: string }>;
    onAction: (action: any) => void;
  }) => (
    <div>
      {items.map((item) => (
        <button key={item.action} type="button" onClick={() => onAction(item.action)}>
          {item.labelKey}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./vault-file', () => ({
  VaultFile: () => null,
}));

const node: VaultTreeNode = {
  id: 'folder-1',
  name: 'Projects',
  type: 'folder',
  path: '/vault/Projects',
  children: [],
};

const syncSnapshot = (overrides: Record<string, unknown> = {}) =>
  renderHook(() =>
    useSyncVaultFilesStore({
      selectedId: null,
      onSelectFile: vi.fn(),
      onSelectNode: vi.fn(),
      onRename: vi.fn(),
      onDelete: vi.fn(),
      onCreateFile: vi.fn(),
      onCreateFolder: vi.fn(),
      onShowInFinder: vi.fn(),
      onPublish: vi.fn(),
      onMove: vi.fn(),
      draggedNodeId: null,
      setDraggedNodeId: vi.fn(),
      dropTargetId: null,
      setDropTargetId: vi.fn(),
      expandedPaths: [],
      onExpandedPathsChange: vi.fn(),
      ...overrides,
    })
  );

describe('VaultFolder', () => {
  it('expands the folder before creating a child file from the context menu', () => {
    const onCreateFile = vi.fn();
    const onExpandedPathsChange = vi.fn();
    const sync = syncSnapshot({ onCreateFile, onExpandedPathsChange });

    render(<VaultFolder node={node} />);

    fireEvent.click(screen.getByText('newFileMenu'));

    expect(onExpandedPathsChange).toHaveBeenCalledWith([node.path]);
    expect(onCreateFile).toHaveBeenCalledWith(node);
    sync.unmount();
  });

  it('expands the folder before creating a child folder from the context menu', () => {
    const onCreateFolder = vi.fn();
    const onExpandedPathsChange = vi.fn();
    const sync = syncSnapshot({ onCreateFolder, onExpandedPathsChange });

    render(<VaultFolder node={node} />);

    fireEvent.click(screen.getByText('newFolder'));

    expect(onExpandedPathsChange).toHaveBeenCalledWith([node.path]);
    expect(onCreateFolder).toHaveBeenCalledWith(node);
    sync.unmount();
  });

  it('invokes onCreateFolder when the folder context menu create folder item is clicked', () => {
    const onCreateFolder = vi.fn();
    const sync = syncSnapshot({ onCreateFolder });

    render(<VaultFolder node={node} />);

    fireEvent.click(screen.getByText('newFolder'));

    expect(onCreateFolder).toHaveBeenCalledWith(node);
    sync.unmount();
  });

  it('invokes onCreateFile when the folder context menu create file item is clicked', () => {
    const onCreateFile = vi.fn();
    const sync = syncSnapshot({ onCreateFile });

    render(<VaultFolder node={node} />);

    fireEvent.click(screen.getByText('newFileMenu'));

    expect(onCreateFile).toHaveBeenCalledWith(node);
    sync.unmount();
  });
});
