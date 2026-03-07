import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MEMOX_API } from '@/lib/api-paths';

const mocks = vi.hoisted(() => ({
  createApiKeyClient: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/features/playground-shared/api-key-client', () => ({
  createApiKeyClient: mocks.createApiKeyClient,
}));

describe('memox api', () => {
  beforeEach(() => {
    mocks.delete.mockReset();
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.put.mockReset();
    mocks.patch.mockReset();
    mocks.createApiKeyClient.mockReset();

    mocks.createApiKeyClient.mockReturnValue({
      delete: mocks.delete,
      get: mocks.get,
      post: mocks.post,
      put: mocks.put,
      patch: mocks.patch,
    });
  });

  it('deleteMemory uses api key client delete method', async () => {
    mocks.delete.mockResolvedValue(undefined);
    const { deleteMemory } = await import('./api');

    await deleteMemory('ah_test_key', 'memory_1');

    expect(mocks.createApiKeyClient).toHaveBeenCalledWith({ apiKey: 'ah_test_key' });
    expect(mocks.delete).toHaveBeenCalledWith(`${MEMOX_API.MEMORIES}/memory_1`);
  });

  it('exportMemories uses memory_export_id from create response', async () => {
    mocks.post
      .mockResolvedValueOnce({ memory_export_id: 'export_1' })
      .mockResolvedValueOnce({ ok: true });
    const { exportMemories } = await import('./api');

    await exportMemories('ah_test_key', { project_id: 'project_1' });

    expect(mocks.post).toHaveBeenNthCalledWith(1, MEMOX_API.EXPORTS, { project_id: 'project_1' });
    expect(mocks.post).toHaveBeenNthCalledWith(2, MEMOX_API.EXPORTS_GET, {
      memory_export_id: 'export_1',
    });
  });
});
