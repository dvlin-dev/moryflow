import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VaultFiles } from './index';
import type { VaultFilesProps } from './const';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@moryflow/ui/animate/primitives/base/files', () => ({
  Files: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="files-root" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('./components/vault-folder', () => ({
  VaultFolder: ({ node }: { node: { name: string } }) => <div>{node.name}</div>,
}));

vi.mock('./components/vault-file', () => ({
  VaultFile: ({ node }: { node: { name: string } }) => <div>{node.name}</div>,
}));

const createProps = (overrides: Partial<VaultFilesProps> = {}): VaultFilesProps => ({
  nodes: [
    {
      id: 'file-1',
      name: 'note.md',
      type: 'file',
      path: '/vault/note.md',
    },
  ],
  vaultPath: '/vault',
  selectedId: null,
  expandedPaths: [],
  onExpandedPathsChange: vi.fn(),
  onSelectFile: vi.fn(),
  onSelectNode: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
  onCreateFile: vi.fn(),
  onShowInFinder: vi.fn(),
  onPublish: vi.fn(),
  onMove: vi.fn(),
  onCreateFileInRoot: vi.fn(),
  ...overrides,
});

describe('VaultFiles', () => {
  it('does not clip overflow on the root wrapper inside sidebar scroll containers', () => {
    const { container } = render(<VaultFiles {...createProps()} />);

    const wrapper = container.firstElementChild as HTMLElement | null;
    const classes = wrapper?.className.split(/\s+/) ?? [];

    expect(screen.getByTestId('files-root')).not.toBeNull();
    expect(classes).toContain('min-h-full');
    expect(classes).toContain('w-full');
    expect(classes).not.toContain('overflow-hidden');
  });
});
