import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { APP_PIPE } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { INTERNAL_GLOBAL_PREFIX_EXCLUDES } from '../src/common/http/internal-routes';
import { MemoxWorkspaceContentControlController } from '../src/memox/memox-workspace-content-control.controller';
import { MemoxWorkspaceContentControlService } from '../src/memox/memox-workspace-content-control.service';

describe('Memox workspace content replay (e2e)', () => {
  let app: INestApplication<App>;
  const internalToken = 'internal-test-token';
  const controlService = {
    redriveDeadLetters: vi.fn(async () => 2),
    replayOutbox: vi.fn(async () => ({
      claimed: 3,
      acknowledged: 3,
      failedIds: [],
      deadLetteredIds: [],
      drained: true,
    })),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MemoxWorkspaceContentControlController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: string) => {
              if (key === 'INTERNAL_API_TOKEN') return internalToken;
              return fallback;
            },
          },
        },
        {
          provide: MemoxWorkspaceContentControlService,
          useValue: controlService,
        },
        {
          provide: APP_PIPE,
          useClass: ZodValidationPipe,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [...INTERNAL_GLOBAL_PREFIX_EXCLUDES],
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects replay requests without internal auth token', async () => {
    await request(app.getHttpServer())
      .post('/internal/sync/memox/workspace-content/replay')
      .send({})
      .expect(401);
  });

  it('accepts minimal replay request body and applies default replay parameters', async () => {
    const response = await request(app.getHttpServer())
      .post('/internal/sync/memox/workspace-content/replay')
      .set('Authorization', `Bearer ${internalToken}`)
      .send({})
      .expect(201);

    expect(controlService.redriveDeadLetters).not.toHaveBeenCalled();
    expect(controlService.replayOutbox).toHaveBeenCalledWith({
      batchSize: 20,
      maxBatches: 10,
      leaseMs: 60_000,
      consumerId: undefined,
    });
    expect(response.body).toEqual({
      redrivenCount: 0,
      claimed: 3,
      acknowledged: 3,
      failedIds: [],
      deadLetteredIds: [],
      drained: true,
    });
  });

  it('does not expose replay control behind api prefix', async () => {
    await request(app.getHttpServer())
      .post('/api/internal/sync/memox/workspace-content/replay')
      .set('Authorization', `Bearer ${internalToken}`)
      .send({})
      .expect(404);
  });
});
