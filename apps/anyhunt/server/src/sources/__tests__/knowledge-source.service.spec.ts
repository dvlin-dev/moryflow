import { describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { KnowledgeSourceService } from '../knowledge-source.service';
import type { KnowledgeSourceRepository } from '../knowledge-source.repository';

function createRepositoryMock() {
  return {
    createSource: vi.fn(),
    getRequired: vi.fn(),
  };
}

describe('KnowledgeSourceService', () => {
  it('创建知识源', async () => {
    const repository = createRepositoryMock();
    repository.createSource.mockResolvedValue({ id: 'source-1', title: 'Doc' });
    const service = new KnowledgeSourceService(
      repository as unknown as KnowledgeSourceRepository,
    );

    const result = await service.create('api-key-1', {
      sourceType: 'vault_file',
      title: 'Doc',
    });

    expect(repository.createSource).toHaveBeenCalledWith('api-key-1', {
      sourceType: 'vault_file',
      title: 'Doc',
    });
    expect(result).toEqual({ id: 'source-1', title: 'Doc' });
  });

  it('透传仓储层冲突错误', async () => {
    const repository = createRepositoryMock();
    repository.createSource.mockRejectedValue(
      new ConflictException('Knowledge source already exists'),
    );
    const service = new KnowledgeSourceService(
      repository as unknown as KnowledgeSourceRepository,
    );

    await expect(
      service.create('api-key-1', {
        sourceType: 'vault_file',
        title: 'Doc',
        externalId: 'file-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
