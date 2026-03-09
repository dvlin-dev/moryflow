import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('packages/api tsconfig', () => {
  it('includes explicit web platform libs for fetch transport types', () => {
    const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
    const raw = fs.readFileSync(tsconfigPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      compilerOptions?: {
        lib?: string[];
      };
    };

    expect(parsed.compilerOptions?.lib).toEqual(
      expect.arrayContaining(['ES2022', 'DOM', 'DOM.Iterable'])
    );
  });
});
