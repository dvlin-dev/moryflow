import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vinxi/http', () => ({
  defineEventHandler: (handler: unknown) => handler,
}));

const loadHandler = async () => {
  const module = await import('../api/v1/github-stars');
  return module.default;
};

describe('github stars route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns null when the upstream response is not ok and no cache is warm', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      })
    );

    const handler = await loadHandler();

    await expect(handler({} as never)).resolves.toBeNull();
  });

  it('returns null when the upstream request throws and no cache is warm', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const handler = await loadHandler();

    await expect(handler({} as never)).resolves.toBeNull();
  });

  it('caches the latest successful star count', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stargazers_count: 42 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const handler = await loadHandler();

    await expect(handler({} as never)).resolves.toEqual({ stars: 42 });
    await expect(handler({} as never)).resolves.toEqual({ stars: 42 });
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

    const handler = await loadHandler();

    await expect(handler({} as never)).resolves.toEqual({ stars: 7 });
    await expect(handler({} as never)).resolves.toEqual({ stars: 7 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
