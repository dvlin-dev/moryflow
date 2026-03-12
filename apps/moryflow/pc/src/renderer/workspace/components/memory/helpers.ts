import type { MemorySearchFileItem, VaultTreeNode } from '@shared/ipc';

const trimPath = (value: string): string => value.trim();
const basename = (value: string): string => {
  const segments = value.split(/[\\/]+/).filter((segment) => segment.length > 0);
  return segments.at(-1) ?? value;
};

export const isMemorySearchFileOpenable = (item: MemorySearchFileItem): boolean =>
  !item.disabled && trimPath(item.localPath ?? '').length > 0;

export const toMemorySearchFileNode = (item: MemorySearchFileItem): VaultTreeNode | null => {
  if (!isMemorySearchFileOpenable(item)) {
    return null;
  }
  const absolutePath = trimPath(item.localPath ?? '');
  const relativePath = trimPath(item.path ?? '');

  const fallbackName = basename(relativePath) || basename(absolutePath) || absolutePath;

  return {
    id: relativePath.length > 0 ? relativePath : fallbackName,
    name: item.title.trim() || fallbackName,
    path: absolutePath,
    type: 'file',
  };
};
