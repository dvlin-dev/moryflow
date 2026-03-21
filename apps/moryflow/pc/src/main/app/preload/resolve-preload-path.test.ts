/* @vitest-environment node */

import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const existsSyncMock = vi.hoisted(() => vi.fn());

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
}));

import { resolvePreloadPathFrom } from './resolve-preload-path';

describe('resolve-preload-path', () => {
  const packagedMainDir = '/tmp/moryflow/dist/main';

  beforeEach(() => {
    existsSyncMock.mockReset();
    delete process.env.ELECTRON_PRELOAD_ENTRY;
  });

  it('uses the packaged preload directory when the js preload bundle exists', () => {
    existsSyncMock.mockReturnValue(true);

    expect(resolvePreloadPathFrom(packagedMainDir)).toBe(
      path.resolve('/tmp/moryflow/dist/preload/index.js')
    );
  });

  it('falls back to the packaged mjs preload bundle when the js bundle is absent', () => {
    existsSyncMock.mockReturnValue(false);

    expect(resolvePreloadPathFrom(packagedMainDir)).toBe(
      path.resolve('/tmp/moryflow/dist/preload/index.mjs')
    );
  });

  it('preserves an absolute preload entry override', () => {
    process.env.ELECTRON_PRELOAD_ENTRY = '/tmp/custom-preload.js';

    expect(resolvePreloadPathFrom(packagedMainDir)).toBe('/tmp/custom-preload.js');
  });

  it('resolves a relative preload entry override from packaged dist/main output', () => {
    process.env.ELECTRON_PRELOAD_ENTRY = '../preload/custom.js';

    expect(resolvePreloadPathFrom(packagedMainDir)).toBe(
      path.resolve('/tmp/moryflow/dist/preload/custom.js')
    );
  });
});
