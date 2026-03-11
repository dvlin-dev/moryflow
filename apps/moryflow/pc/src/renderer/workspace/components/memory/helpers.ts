import type { MemorySearchFileItem, VaultTreeNode } from '@shared/ipc';

const normalizePath = (value: string): string => value.replace(/\\/g, '/').trim();

export const isMemorySearchFileOpenable = (item: MemorySearchFileItem): boolean =>
  !item.disabled && normalizePath(item.localPath ?? '').length > 0;

export const toMemorySearchFileNode = (item: MemorySearchFileItem): VaultTreeNode | null => {
  if (!isMemorySearchFileOpenable(item)) {
    return null;
  }
  const absolutePath = normalizePath(item.localPath ?? '');

  const fallbackName =
    normalizePath(item.path ?? '')
      .split('/')
      .pop() ||
    absolutePath.split('/').pop() ||
    absolutePath;
  const relativeId = normalizePath(item.path ?? '');

  return {
    id: relativeId.length > 0 ? relativeId : fallbackName,
    name: item.title.trim() || fallbackName,
    path: absolutePath,
    type: 'file',
  };
};
