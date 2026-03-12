import { describe, expect, it } from 'vitest';
import { isMemorySearchFileOpenable, toMemorySearchFileNode } from './helpers';

describe('memory helpers', () => {
  it('preserves native local paths when creating tree nodes', () => {
    const node = toMemorySearchFileNode({
      id: 'file-1',
      fileId: 'file-1',
      sourceId: 'source-1',
      vaultId: 'vault-1',
      title: 'Alpha note',
      path: 'notes\\alpha.md',
      snippet: '',
      score: 0.9,
      disabled: false,
      localPath: 'C:\\vault\\notes\\alpha.md',
    });

    expect(node).toEqual({
      id: 'notes\\alpha.md',
      name: 'Alpha note',
      path: 'C:\\vault\\notes\\alpha.md',
      type: 'file',
    });
  });

  it('treats empty local paths as not openable without rewriting separators', () => {
    expect(
      isMemorySearchFileOpenable({
        id: 'file-2',
        fileId: 'file-2',
        sourceId: 'source-2',
        vaultId: 'vault-1',
        title: 'Beta note',
        path: 'notes/beta.md',
        snippet: '',
        score: 0.5,
        disabled: false,
        localPath: '   ',
      })
    ).toBe(false);
  });
});
