/**
 * [INPUT]: MemoryService, EntityService, VectorPrismaService, TestContainers
 * [OUTPUT]: Memory/Entity 主链路集成回归（create/list/search/history/delete + entity counts）
 * [POS]: Memox Memory/Entity 集成测试（需要 RUN_INTEGRATION_TESTS=1）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { TestContainers } from '../../../test/helpers';
import { VectorPrismaModule } from '../../vector-prisma';
import { VectorPrismaService } from '../../vector-prisma/vector-prisma.service';
import { EmbeddingService } from '../../embedding/embedding.service';
import { BillingService } from '../../billing/billing.service';
import { R2Service } from '../../storage/r2.service';
import { MemoryService } from '../memory.service';
import { MemoryRepository } from '../memory.repository';
import { MemoryLlmService } from '../services/memory-llm.service';
import { EntityService } from '../../entity/entity.service';
import { EntityRepository } from '../../entity/entity.repository';
import { MEMOX_MEMORY_EXPORT_QUEUE } from '../../queue/queue.constants';

const describeIf =
  process.env.RUN_INTEGRATION_TESTS === '1' ? describe : describe.skip;
const useExistingIntegrationInfra =
  process.env.USE_EXISTING_INTEGRATION_INFRA === '1';

const TEST_API_KEY_ID = 'api_key_memory_integration';
const TEST_PLATFORM_USER_ID = 'platform_user_memory_integration';
const TEST_ENTITY_USER_ID = 'memory-user-1';
const FIXED_EMBEDDING = Array.from({ length: 1536 }, () => 0.01);

function buildCreateMemoryInput(content: string, expirationDate: string) {
  return {
    messages: [{ role: 'user', content }],
    user_id: TEST_ENTITY_USER_ID,
    infer: false,
    output_format: 'v1.0' as const,
    immutable: false,
    async_mode: true,
    enable_graph: false,
    expiration_date: expirationDate,
  };
}

function buildSearchInput(query: string) {
  return {
    query,
    user_id: TEST_ENTITY_USER_ID,
    top_k: 10,
    output_format: 'v1.0' as const,
    rerank: false,
    keyword_search: false,
    filter_memories: false,
    only_metadata_based_search: false,
  };
}

const billingServiceMock = {
  deductOrThrow: vi.fn().mockResolvedValue({
    deduct: {
      breakdown: [],
    },
  }),
  refundOnFailure: vi.fn().mockResolvedValue(undefined),
};

const embeddingServiceMock = {
  generateEmbedding: vi.fn().mockResolvedValue({
    embedding: FIXED_EMBEDDING,
    model: 'test-embedding',
    dimensions: FIXED_EMBEDDING.length,
  }),
};

const memoryLlmServiceMock = {
  inferMemoriesFromMessages: vi
    .fn()
    .mockImplementation(async (params: { fallbackText: string }) => [
      params.fallbackText,
    ]),
  extractTags: vi.fn().mockResolvedValue({
    categories: ['integration'],
    keywords: ['memory'],
  }),
  extractGraph: vi.fn().mockResolvedValue(null),
};

const r2ServiceMock = {
  uploadStream: vi.fn().mockResolvedValue(undefined),
};

const memoryExportQueueMock = {
  add: vi.fn().mockResolvedValue({ id: 'memory-export-job-test' }),
};

describeIf('Memory/Entity integration', () => {
  let moduleRef: TestingModule;
  let vectorPrisma: VectorPrismaService;
  let memoryService: MemoryService;
  let entityService: EntityService;

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
      providers: [
        MemoryService,
        MemoryRepository,
        EntityService,
        EntityRepository,
        {
          provide: EmbeddingService,
          useValue: embeddingServiceMock,
        },
        {
          provide: BillingService,
          useValue: billingServiceMock,
        },
        {
          provide: R2Service,
          useValue: r2ServiceMock,
        },
        {
          provide: MemoryLlmService,
          useValue: memoryLlmServiceMock,
        },
        {
          provide: getQueueToken(MEMOX_MEMORY_EXPORT_QUEUE),
          useValue: memoryExportQueueMock,
        },
      ],
    }).compile();

    await moduleRef.init();

    vectorPrisma = moduleRef.get(VectorPrismaService);
    memoryService = moduleRef.get(MemoryService);
    entityService = moduleRef.get(EntityService);
  }, 60000);

  afterAll(async () => {
    await moduleRef?.close();
    if (!useExistingIntegrationInfra) {
      await TestContainers.stop();
    }
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    await vectorPrisma.$transaction([
      vectorPrisma.memoryFeedback.deleteMany({
        where: { apiKeyId: TEST_API_KEY_ID },
      }),
      vectorPrisma.memoryHistory.deleteMany({
        where: { apiKeyId: TEST_API_KEY_ID },
      }),
      vectorPrisma.memoryExport.deleteMany({
        where: { apiKeyId: TEST_API_KEY_ID },
      }),
      vectorPrisma.memory.deleteMany({
        where: { apiKeyId: TEST_API_KEY_ID },
      }),
      vectorPrisma.memoxEntity.deleteMany({
        where: { apiKeyId: TEST_API_KEY_ID },
      }),
    ]);
  });

  it('should exclude expired memories from list/search and persist history for active memory', async () => {
    const activeResults = (await memoryService.create(
      TEST_PLATFORM_USER_ID,
      TEST_API_KEY_ID,
      buildCreateMemoryInput(
        'remember active memory',
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ),
    )) as Array<Record<string, unknown>>;
    const expiredResults = (await memoryService.create(
      TEST_PLATFORM_USER_ID,
      TEST_API_KEY_ID,
      buildCreateMemoryInput(
        'remember expired memory',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ),
    )) as Array<Record<string, unknown>>;

    const activeMemoryId = String(activeResults[0]?.id);
    const expiredMemoryId = String(expiredResults[0]?.id);

    expect(activeMemoryId).toBeTruthy();
    expect(expiredMemoryId).toBeTruthy();

    const listed = await memoryService.list(TEST_API_KEY_ID, {
      user_id: TEST_ENTITY_USER_ID,
      page: 1,
      page_size: 10,
    });

    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(activeMemoryId);

    const searched = (await memoryService.search(
      TEST_PLATFORM_USER_ID,
      TEST_API_KEY_ID,
      buildSearchInput('remember memory'),
    )) as Array<Record<string, unknown>>;

    expect(searched).toHaveLength(1);
    expect(searched[0]?.id).toBe(activeMemoryId);

    const history = await memoryService.history(
      TEST_API_KEY_ID,
      activeMemoryId,
    );
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      memory_id: activeMemoryId,
      event: 'ADD',
      user_id: TEST_ENTITY_USER_ID,
    });

    await memoryService.delete(TEST_API_KEY_ID, activeMemoryId);

    const remainingIds = (
      await vectorPrisma.memory.findMany({
        where: { apiKeyId: TEST_API_KEY_ID },
        select: { id: true },
      })
    ).map((memory) => memory.id);

    expect(remainingIds).toEqual([expiredMemoryId]);
  });

  it('should count only non-expired memories in entity totals', async () => {
    await entityService.createUser(TEST_API_KEY_ID, {
      user_id: TEST_ENTITY_USER_ID,
    });

    await memoryService.create(
      TEST_PLATFORM_USER_ID,
      TEST_API_KEY_ID,
      buildCreateMemoryInput(
        'active entity memory',
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ),
    );

    await memoryService.create(
      TEST_PLATFORM_USER_ID,
      TEST_API_KEY_ID,
      buildCreateMemoryInput(
        'expired entity memory',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ),
    );

    const entities = await entityService.listEntities(TEST_API_KEY_ID, {});

    expect(entities).toHaveLength(1);
    expect(entities[0]).toMatchObject({
      id: TEST_ENTITY_USER_ID,
      type: 'user',
      total_memories: 1,
    });
  });
});
