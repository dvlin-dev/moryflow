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

  it('declares @radix-ui/react-compose-refs because viewport code imports it directly', () => {
    const manifestPath = path.resolve(process.cwd(), 'package.json');
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(
      manifest.dependencies?.['@radix-ui/react-compose-refs'] ??
        manifest.devDependencies?.['@radix-ui/react-compose-refs']
    ).toBeTruthy();
  });

  it('declares nanoid because prompt input code imports it directly', () => {
    const manifestPath = path.resolve(process.cwd(), 'package.json');
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(manifest.dependencies?.nanoid ?? manifest.devDependencies?.nanoid).toBeTruthy();
  });
});
