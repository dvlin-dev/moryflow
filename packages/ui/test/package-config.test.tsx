import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('@moryflow/ui package manifest', () => {
  it('declares tailwindcss because exported styles import it directly', () => {
    const manifestPath = path.resolve(process.cwd(), 'package.json');
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(manifest.dependencies?.tailwindcss ?? manifest.devDependencies?.tailwindcss).toBeTruthy();
  });
});
