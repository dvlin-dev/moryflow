/* @vitest-environment node */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveRendererIndexPath, resolveRendererRoot } from './renderer-paths';

describe('renderer-paths', () => {
  it('resolves renderer root from the shared windows subtree to the app renderer directory', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    expect(resolveRendererRoot()).toBe(path.resolve(currentDir, '../../../../renderer'));
  });

  it('resolves the renderer entry file under the app renderer directory', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    expect(resolveRendererIndexPath()).toBe(
      path.resolve(currentDir, '../../../../renderer/index.html')
    );
  });
});
