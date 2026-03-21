import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_GLOBAL_PREFIX_EXCLUDES } from '../src/common/http/internal-routes';
import { MemoxInternalMetricsController } from '../src/memox/memox-internal-metrics.controller';
import { MemoxTelemetryService } from '../src/memox/memox-telemetry.service';

describe('Memox internal metrics (e2e)', () => {
  let app: INestApplication<App>;
  const internalToken = 'internal-test-token';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MemoxInternalMetricsController],
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
          provide: MemoxTelemetryService,
          useValue: {
            getSnapshot: vi.fn(async () => ({
              generatedAt: '2026-03-21T00:00:00.000Z',
              consumer: {
                batches: 2,
                claimed: 5,
                acknowledged: 4,
                failed: 1,
                retryScheduled: 1,
                deadLettered: 0,
                poison: 0,
              },
              projection: {
                upsertRequests: 3,
                deleteRequests: 1,
                identityResolves: 3,
                identityLookups: 1,
                identityLookupMisses: 0,
                revisionCreates: 2,
                revisionFinalizes: 2,
                unchangedSkips: 1,
                sourceDeletes: 1,
              },
              outbox: {
                pendingCount: 2,
                deadLetteredCount: 0,
                oldestPendingAgeMs: 120000,
                oldestDeadLetteredAgeMs: null,
              },
            })),
          },
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

  it('rejects requests without internal auth token', async () => {
    await request(app.getHttpServer())
      .get('/internal/metrics/memox')
      .expect(401);
  });

  it('exposes memox telemetry snapshot on internal route when token is valid', async () => {
    const response = await request(app.getHttpServer())
      .get('/internal/metrics/memox')
      .set('Authorization', `Bearer ${internalToken}`)
      .expect(200);

    expect(response.body.consumer.claimed).toBe(5);
    expect(response.body.projection.identityResolves).toBe(3);
    expect(response.body.outbox.pendingCount).toBe(2);
  });

  it('does not expose memox metrics behind api prefix', async () => {
    await request(app.getHttpServer())
      .get('/api/internal/metrics/memox')
      .set('Authorization', `Bearer ${internalToken}`)
      .expect(404);
  });
});
