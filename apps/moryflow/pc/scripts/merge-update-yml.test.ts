import { describe, it, expect } from 'vitest';
import { mergeUpdateFeeds } from './merge-update-yml';

const makeArm64Feed = (overrides?: Record<string, unknown>) => ({
  version: '0.3.0',
  files: [
    { url: 'MoryFlow-0.3.0-arm64.zip', sha512: 'arm64-zip-hash', size: 12345 },
    { url: 'MoryFlow-0.3.0-arm64.dmg', sha512: 'arm64-dmg-hash', size: 67890 },
  ],
  path: 'MoryFlow-0.3.0-arm64.zip',
  sha512: 'arm64-zip-hash',
  releaseDate: '2026-03-15T10:00:00.000Z',
  ...overrides,
});

const makeX64Feed = (overrides?: Record<string, unknown>) => ({
  version: '0.3.0',
  files: [
    { url: 'MoryFlow-0.3.0-x64.zip', sha512: 'x64-zip-hash', size: 22345 },
    { url: 'MoryFlow-0.3.0-x64.dmg', sha512: 'x64-dmg-hash', size: 77890 },
  ],
  path: 'MoryFlow-0.3.0-x64.zip',
  sha512: 'x64-zip-hash',
  releaseDate: '2026-03-15T10:05:00.000Z',
  ...overrides,
});

describe('mergeUpdateFeeds', () => {
  it('concatenates files arrays with arm64 first, then x64', () => {
    const result = mergeUpdateFeeds({
      arm64Feed: makeArm64Feed(),
      x64Feed: makeX64Feed(),
    });

    expect(result.files).toHaveLength(4);
    expect(result.files[0].url).toBe('MoryFlow-0.3.0-arm64.zip');
    expect(result.files[1].url).toBe('MoryFlow-0.3.0-arm64.dmg');
    expect(result.files[2].url).toBe('MoryFlow-0.3.0-x64.zip');
    expect(result.files[3].url).toBe('MoryFlow-0.3.0-x64.dmg');
  });

  it('uses version from arm64 feed', () => {
    const result = mergeUpdateFeeds({
      arm64Feed: makeArm64Feed({ version: '1.0.0' }),
      x64Feed: makeX64Feed({ version: '1.0.0-different' }),
    });

    expect(result.version).toBe('1.0.0');
  });

  it('uses releaseDate from arm64 feed', () => {
    const result = mergeUpdateFeeds({
      arm64Feed: makeArm64Feed({ releaseDate: '2026-03-15T10:00:00.000Z' }),
      x64Feed: makeX64Feed({ releaseDate: '2026-03-15T12:00:00.000Z' }),
    });

    expect(result.releaseDate).toBe('2026-03-15T10:00:00.000Z');
  });

  it('uses path from arm64 feed', () => {
    const result = mergeUpdateFeeds({
      arm64Feed: makeArm64Feed({ path: 'MoryFlow-0.3.0-arm64.zip' }),
      x64Feed: makeX64Feed({ path: 'MoryFlow-0.3.0-x64.zip' }),
    });

    expect(result.path).toBe('MoryFlow-0.3.0-arm64.zip');
  });

  it('uses sha512 from arm64 feed', () => {
    const result = mergeUpdateFeeds({
      arm64Feed: makeArm64Feed({ sha512: 'arm64-top-level-hash' }),
      x64Feed: makeX64Feed({ sha512: 'x64-top-level-hash' }),
    });

    expect(result.sha512).toBe('arm64-top-level-hash');
  });

  it('preserves all file entry fields (url, sha512, size)', () => {
    const result = mergeUpdateFeeds({
      arm64Feed: makeArm64Feed(),
      x64Feed: makeX64Feed(),
    });

    for (const file of result.files) {
      expect(file).toHaveProperty('url');
      expect(file).toHaveProperty('sha512');
      expect(file).toHaveProperty('size');
      expect(typeof file.url).toBe('string');
      expect(typeof file.sha512).toBe('string');
      expect(typeof file.size).toBe('number');
    }
  });

  it('throws when arm64 feed is missing files array', () => {
    expect(() =>
      mergeUpdateFeeds({
        arm64Feed: makeArm64Feed({ files: undefined }) as any,
        x64Feed: makeX64Feed(),
      })
    ).toThrow('arm64 feed is missing files array');
  });

  it('throws when x64 feed is missing files array', () => {
    expect(() =>
      mergeUpdateFeeds({
        arm64Feed: makeArm64Feed(),
        x64Feed: makeX64Feed({ files: undefined }) as any,
      })
    ).toThrow('x64 feed is missing files array');
  });

  it('handles empty files arrays gracefully', () => {
    const result = mergeUpdateFeeds({
      arm64Feed: makeArm64Feed({ files: [] }),
      x64Feed: makeX64Feed({ files: [] }),
    });

    expect(result.files).toHaveLength(0);
  });

  it('handles asymmetric file counts', () => {
    const result = mergeUpdateFeeds({
      arm64Feed: makeArm64Feed({
        files: [{ url: 'arm64-only.zip', sha512: 'hash', size: 100 }],
      }),
      x64Feed: makeX64Feed(),
    });

    expect(result.files).toHaveLength(3);
    expect(result.files[0].url).toBe('arm64-only.zip');
    expect(result.files[1].url).toBe('MoryFlow-0.3.0-x64.zip');
  });
});
