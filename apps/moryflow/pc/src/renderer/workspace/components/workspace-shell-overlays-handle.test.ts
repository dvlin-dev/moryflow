import { describe, expect, it } from 'vitest';
import type { SearchFileHit } from '@shared/ipc';
import { toSearchHitFileNode } from './workspace-shell-overlays-handle';

const createHit = (overrides: Partial<SearchFileHit>): SearchFileHit => ({
  type: 'file',
  docId: 'doc-1',
  vaultPath: '/vault',
  filePath: '/vault/notes/today.md',
  relativePath: 'notes/today.md',
  fileName: 'today.md',
  score: 0.5,
  snippet: 'today',
  updatedAt: Date.now(),
  ...overrides,
});

describe('toSearchHitFileNode', () => {
  it('优先使用索引内 relativePath 作为树节点 id', () => {
    const node = toSearchHitFileNode(createHit({ relativePath: 'docs/guide.md' }));
    expect(node?.id).toBe('docs/guide.md');
    expect(node?.path).toBe('/vault/notes/today.md');
  });

  it('relativePath 缺失时按 vaultPath + filePath 反推相对 id', () => {
    const node = toSearchHitFileNode(
      createHit({
        vaultPath: 'C:\\vault',
        filePath: 'C:\\vault\\projects\\plan.md',
        relativePath: '',
      })
    );
    expect(node?.id).toBe('projects/plan.md');
    expect(node?.path).toBe('C:\\vault\\projects\\plan.md');
  });

  it('filePath 为空时返回 null，避免构造非法节点', () => {
    const node = toSearchHitFileNode(createHit({ filePath: '   ' }));
    expect(node).toBeNull();
  });
});
