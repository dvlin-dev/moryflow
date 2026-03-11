/* @vitest-environment node */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const packageJsonPath = resolve(__dirname, '../package.json');

function readPackageManifest(): PackageManifest {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageManifest;
}

describe('@moryflow/pc package manifest', () => {
  it('declares react renderer runtime packages as production dependencies', () => {
    const manifest = readPackageManifest();

    expect(manifest.dependencies).toMatchObject({
      react: '19.2.3',
      'react-dom': '19.2.3',
    });
    expect(manifest.devDependencies?.react).toBeUndefined();
    expect(manifest.devDependencies?.['react-dom']).toBeUndefined();
  });
});
