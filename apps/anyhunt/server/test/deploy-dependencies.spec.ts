import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface PackageJson {
  dependencies?: Record<string, string>;
}

describe('deploy dependency constraints', () => {
  it('pins fast-xml-parser to the last known deploy-safe release', () => {
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson;

    expect(packageJson.dependencies?.['fast-xml-parser']).toBe('5.3.3');
  });
});
