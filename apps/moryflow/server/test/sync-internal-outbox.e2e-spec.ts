import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_GLOBAL_PREFIX_EXCLUDES } from '../src/common/http/internal-routes';
import { SyncInternalOutboxController } from '../src/sync/sync-internal-outbox.controller';
import { FileLifecycleOutboxService } from '../src/sync/file-lifecycle-outbox.service';

describe('Sync internal outbox (e2e)', () => {
  let app: INestApplication<App>;
  const internalToken = 'internal-test-token';
  const fileLifecycleOutboxService = {
    claimPendingBatch: vi.fn(async () => [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        userId: 'user-1',
        vaultId: 'vault-1',
        fileId: 'file-1',
        eventType: 'file_upserted',
        payload: { path: 'notes/a.md' },
        createdAt: new Date('2026-03-06T00:00:00.000Z'),
        processedAt: null,
        leasedBy: 'consumer-a',
        leaseExpiresAt: new Date('2026-03-06T00:00:30.000Z'),
      },
    ]),
    ackClaimedBatch: vi.fn(async () => 1),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SyncInternalOutboxController],
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
          provide: FileLifecycleOutboxService,
          useValue: fileLifecycleOutboxService,
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

  it('rejects outbox claim without internal auth token', async () => {
    await request(app.getHttpServer())
      .post('/internal/sync/outbox/claim')
      .send({
        consumerId: 'consumer-a',
        limit: 10,
        leaseMs: 30_000,
      })
      .expect(401);
  });

  it('claims a leased outbox batch on internal route when token is valid', async () => {
    const response = await request(app.getHttpServer())
      .post('/internal/sync/outbox/claim')
      .set('Authorization', `Bearer ${internalToken}`)
      .send({
        consumerId: 'consumer-a',
        limit: 10,
        leaseMs: 30_000,
      })
      .expect(201);

    expect(fileLifecycleOutboxService.claimPendingBatch).toHaveBeenCalledWith({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });
    expect(response.body.events).toHaveLength(1);
    expect(response.body.events[0]?.eventType).toBe('file_upserted');
  });

  it('acks a claimed outbox batch on internal route when token is valid', async () => {
    const response = await request(app.getHttpServer())
      .post('/internal/sync/outbox/ack')
      .set('Authorization', `Bearer ${internalToken}`)
      .send({
        consumerId: 'consumer-a',
        ids: ['550e8400-e29b-41d4-a716-446655440010'],
      })
      .expect(201);

    expect(fileLifecycleOutboxService.ackClaimedBatch).toHaveBeenCalledWith(
      'consumer-a',
      ['550e8400-e29b-41d4-a716-446655440010'],
    );
    expect(response.body.acknowledged).toBe(1);
  });

  it('does not expose outbox control plane behind api prefix', async () => {
    await request(app.getHttpServer())
      .post('/api/internal/sync/outbox/claim')
      .set('Authorization', `Bearer ${internalToken}`)
      .send({
        consumerId: 'consumer-a',
        limit: 10,
        leaseMs: 30_000,
      })
      .expect(404);
  });
});
