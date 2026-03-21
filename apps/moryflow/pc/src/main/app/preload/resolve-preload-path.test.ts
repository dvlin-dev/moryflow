/* @vitest-environment node */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const existsSyncMock = vi.hoisted(() => vi.fn());

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
}));

import { resolvePreloadPath } from './resolve-preload-path';

describe('resolve-preload-path', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  beforeEach(() => {
    existsSyncMock.mockReset();
    delete process.env.ELECTRON_PRELOAD_ENTRY;
  });

  it('uses the packaged preload directory when the js preload bundle exists', () => {
    existsSyncMock.mockReturnValue(true);

    expect(resolvePreloadPath()).toBe(path.resolve(currentDir, '../../../preload/index.js'));
  });

  it('falls back to the packaged mjs preload bundle when the js bundle is absent', () => {
    existsSyncMock.mockReturnValue(false);

    expect(resolvePreloadPath()).toBe(path.resolve(currentDir, '../../../preload/index.mjs'));
  });

  it('preserves an absolute preload entry override', () => {
    process.env.ELECTRON_PRELOAD_ENTRY = '/tmp/custom-preload.js';

    expect(resolvePreloadPath()).toBe('/tmp/custom-preload.js');
  });
});
