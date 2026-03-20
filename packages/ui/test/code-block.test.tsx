import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('code-block implementation contracts', () => {
  it('uses shiki core modules instead of importing the full shiki bundle', () => {
    const filePath = path.resolve(process.cwd(), 'src/ai/code-block.tsx');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).not.toContain("from 'shiki';");
    expect(source).toContain("from 'shiki/core';");
    expect(source).toContain("from 'shiki/langs';");
    expect(source).toContain("from 'shiki/themes';");
    expect(source).toContain("from 'shiki/engine/javascript';");
  });
});
