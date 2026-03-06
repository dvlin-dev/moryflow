import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarFiles } from './sidebar-files';
import type { SidebarFilesProps } from '../const';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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
  onShowInFinder: vi.fn(),
  onMove: vi.fn(),
  onCreateFileInRoot: vi.fn(),
  onCreateFolderInRoot: vi.fn(),
  onPublish: vi.fn(),
  ...overrides,
});

describe('SidebarFiles', () => {
  it('does not clip height locally so parent scroll container owns overflow', () => {
    render(<SidebarFiles {...createProps()} />);

    const wrapper = screen.getByTestId('vault-files').parentElement;
    const classes = wrapper?.className.split(/\s+/) ?? [];

    expect(wrapper).not.toBeNull();
    expect(classes).toContain('py-1');
    expect(classes).not.toContain('h-full');
    expect(classes).not.toContain('overflow-hidden');
  });
});
