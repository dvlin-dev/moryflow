import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadModule = async () => {
  const module = await import('../github-api');
  return module;
};

describe('fetchGitHubStars', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns null when the upstream response is not ok and no cache is warm', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const { fetchGitHubStars } = await loadModule();
    await expect(fetchGitHubStars()).resolves.toBeNull();
  });

  it('returns null when the upstream request throws and no cache is warm', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const { fetchGitHubStars } = await loadModule();
    await expect(fetchGitHubStars()).resolves.toBeNull();
  });

  it('caches the latest successful star count', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stargazers_count: 42 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchGitHubStars } = await loadModule();
    await expect(fetchGitHubStars()).resolves.toEqual({ stars: 42 });
    await expect(fetchGitHubStars()).resolves.toEqual({ stars: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves the warm cache even if a later upstream call would fail', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stargazers_count: 7 }),
      })
      .mockRejectedValueOnce(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchGitHubStars } = await loadModule();
    await expect(fetchGitHubStars()).resolves.toEqual({ stars: 7 });
    await expect(fetchGitHubStars()).resolves.toEqual({ stars: 7 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('fetchLatestRelease', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns null when the upstream response is not ok and no cache is warm', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const { fetchLatestRelease } = await loadModule();
    await expect(fetchLatestRelease()).resolves.toBeNull();
  });

  it('returns null when no stable release exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { tag_name: 'v1.0.0', draft: true, prerelease: false, html_url: '', assets: [] },
        ],
      })
    );

    const { fetchLatestRelease } = await loadModule();
    await expect(fetchLatestRelease()).resolves.toBeNull();
  });

  it('parses a stable release correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            tag_name: 'v0.3.0',
            draft: false,
            prerelease: false,
            html_url: 'https://github.com/dvlin-dev/moryflow/releases/tag/v0.3.0',
            assets: [
              { name: 'Moryflow-0.3.0-arm64.dmg', browser_download_url: 'https://dl/arm64.dmg' },
              { name: 'Moryflow-0.3.0-x64.dmg', browser_download_url: 'https://dl/x64.dmg' },
            ],
          },
        ],
      })
    );

    const { fetchLatestRelease } = await loadModule();
    const result = await fetchLatestRelease();
    expect(result).toMatchObject({
      version: '0.3.0',
      tag: 'v0.3.0',
      assets: {
        'darwin-arm64': 'https://dl/arm64.dmg',
        'darwin-x64': 'https://dl/x64.dmg',
      },
    });
  });
});
