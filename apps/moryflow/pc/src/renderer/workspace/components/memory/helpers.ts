import type { MemorySearchFileItem, VaultTreeNode } from '@shared/ipc';

export function relativeTime(date: string | null): string {
  if (!date) return 'Never';
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString();
}

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
