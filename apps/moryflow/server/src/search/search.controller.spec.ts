import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { SearchController } from './search.controller';
import type { SearchService } from './search.service';

describe('SearchController', () => {
  it('delegates search requests', async () => {
    const search = vi.fn().mockResolvedValue({ results: [], count: 0 });
    const controller = new SearchController({
      search,
    } as unknown as SearchService);

    const result = await controller.search(
      { user: { id: 'user-1' } } as never,
      {
        query: 'hello',
        vaultId: '11111111-1111-4111-8111-111111111111',
        topK: 5,
      },
    );

    expect(search).toHaveBeenCalledWith('user-1', {
      query: 'hello',
      vaultId: '11111111-1111-4111-8111-111111111111',
      topK: 5,
    });
    expect(result).toEqual({ results: [], count: 0 });
  });

  it('marks query-style POST endpoint as 200 OK', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        SearchController.prototype.search,
      ),
    ).toBe(HttpStatus.OK);
  });
});
