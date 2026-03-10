/**
 * [INPUT]: SourceSearchRepository + VectorPrismaService + TestContainers
 * [OUTPUT]: current schema 下 chunk window 查询真实执行回归
 * [POS]: SourceSearchRepository 集成测试（需要 RUN_INTEGRATION_TESTS=1）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TestContainers } from '../../../test/helpers';
import { VectorPrismaModule } from '../../vector-prisma';
import { VectorPrismaService } from '../../vector-prisma/vector-prisma.service';
import { SourceSearchRepository } from '../source-search.repository';

const describeIf =
  process.env.RUN_INTEGRATION_TESTS === '1' ? describe : describe.skip;
const useExistingIntegrationInfra =
  process.env.USE_EXISTING_INTEGRATION_INFRA === '1';

const TEST_API_KEY_ID = 'api_key_source_search_repository_integration';

describeIf('SourceSearchRepository integration', () => {
  let moduleRef: TestingModule;
  let vectorPrisma: VectorPrismaService;
  let repository: SourceSearchRepository;

  beforeAll(async () => {
    if (!useExistingIntegrationInfra) {
      await TestContainers.start();
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        VectorPrismaModule,
      ],
      providers: [SourceSearchRepository],
    }).compile();

    await moduleRef.init();

    vectorPrisma = moduleRef.get(VectorPrismaService);
    repository = moduleRef.get(SourceSearchRepository);
  }, 60000);

  afterAll(async () => {
    await moduleRef?.close();
    if (!useExistingIntegrationInfra) {
      await TestContainers.stop();
    }
  });

  beforeEach(async () => {
    await vectorPrisma.$transaction([
      vectorPrisma.sourceChunk.deleteMany({
        where: { apiKeyId: TEST_API_KEY_ID },
      }),
      vectorPrisma.knowledgeSourceRevision.deleteMany({
        where: { apiKeyId: TEST_API_KEY_ID },
      }),
      vectorPrisma.knowledgeSource.deleteMany({
        where: { apiKeyId: TEST_API_KEY_ID },
      }),
    ]);
  });

  it('executes chunk window lookup against real PostgreSQL types', async () => {
    const source = await vectorPrisma.knowledgeSource.create({
      data: {
        apiKeyId: TEST_API_KEY_ID,
        sourceType: 'note_markdown',
        externalId: 'integration-source-1',
        title: 'Integration Source',
        status: 'ACTIVE',
      },
    });

    const revision = await vectorPrisma.knowledgeSourceRevision.create({
      data: {
        apiKeyId: TEST_API_KEY_ID,
        sourceId: source.id,
        ingestMode: 'INLINE_TEXT',
        status: 'INDEXED',
      },
    });

    await vectorPrisma.knowledgeSource.update({
      where: { id: source.id },
      data: { currentRevisionId: revision.id },
    });

    await vectorPrisma.sourceChunk.createMany({
      data: [
        {
          apiKeyId: TEST_API_KEY_ID,
          sourceId: source.id,
          revisionId: revision.id,
          chunkIndex: 0,
          chunkCount: 3,
          content: 'chunk zero',
          tokenCount: 2,
        },
        {
          apiKeyId: TEST_API_KEY_ID,
          sourceId: source.id,
          revisionId: revision.id,
          chunkIndex: 1,
          chunkCount: 3,
          content: 'chunk one',
          tokenCount: 2,
        },
        {
          apiKeyId: TEST_API_KEY_ID,
          sourceId: source.id,
          revisionId: revision.id,
          chunkIndex: 2,
          chunkCount: 3,
          content: 'chunk two',
          tokenCount: 2,
        },
      ],
    });

    const rows = await repository.findChunkWindowsForCandidates(
      TEST_API_KEY_ID,
      [
        {
          revisionId: revision.id,
          centerChunkIndex: 1,
        },
      ],
      1,
    );

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.chunkIndex)).toEqual([0, 1, 2]);
    expect(rows.every((row) => row.revisionId === revision.id)).toBe(true);
    expect(rows.every((row) => row.centerChunkIndex === 1)).toBe(true);
    expect(rows.map((row) => row.content)).toEqual([
      'chunk zero',
      'chunk one',
      'chunk two',
    ]);
  });
});
