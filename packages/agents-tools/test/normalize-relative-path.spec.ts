import { describe, it, expect } from 'vitest';
import path from 'path';
import { normalizeRelativePath } from '../src/shared';

describe('normalizeRelativePath', () => {
  const root = '/Users/test/vault';

  it('返回 Vault 内的相对路径', () => {
    const absolute = path.join(root, 'notes', 'a.md');
    const result = normalizeRelativePath(root, absolute, path);
    expect(result).toBe('notes/a.md');
  });

  it('Vault 根目录返回 .', () => {
    const result = normalizeRelativePath(root, root, path);
    expect(result).toBe('.');
  });

  it('Vault 外路径保持为绝对路径', () => {
    const absolute = `${root}2/notes/a.md`;
    const result = normalizeRelativePath(root, absolute, path);
    expect(result).toBe(absolute);
  });
});
