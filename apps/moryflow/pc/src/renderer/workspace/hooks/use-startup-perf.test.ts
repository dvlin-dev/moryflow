import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('use-startup-perf source contracts', () => {
  it('does not eagerly warm up the code-block highlighter chunk', () => {
    const filePath = path.resolve(
      process.cwd(),
      'src/renderer/workspace/hooks/use-startup-perf.ts'
    );
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).not.toContain("import('@moryflow/ui/ai/code-block')");
  });
});
