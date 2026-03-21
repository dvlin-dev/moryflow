/* @vitest-environment node */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveRendererIndexPathFrom, resolveRendererRootFrom } from './renderer-paths';

describe('renderer-paths', () => {
  it('resolves renderer root relative to packaged dist/main output', () => {
    expect(resolveRendererRootFrom('/tmp/moryflow/dist/main')).toBe(
      path.resolve('/tmp/moryflow/dist/renderer')
    );
  });

  it('resolves the renderer entry file under packaged dist/renderer output', () => {
    expect(resolveRendererIndexPathFrom('/tmp/moryflow/dist/main')).toBe(
      path.resolve('/tmp/moryflow/dist/renderer/index.html')
    );
  });
});
