import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_GLOBAL_PREFIX_EXCLUDES } from '../src/common/http/internal-routes';
import { SyncInternalMetricsController } from '../src/sync/sync-internal-metrics.controller';
import { SyncTelemetryService } from '../src/sync/sync-telemetry.service';

describe('Sync internal metrics (e2e)', () => {
  let app: INestApplication<App>;
  const internalToken = 'internal-test-token';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SyncInternalMetricsController],
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
          provide: SyncTelemetryService,
          useValue: {
            getSnapshot: vi.fn(async () => ({
              generatedAt: '2026-03-06T00:00:00.000Z',
              diff: {
                requests: 1,
                failures: 0,
                lastActionCount: 2,
                actions: { upload: 1, download: 1, delete: 0, conflict: 0 },
                duration: { totalMs: 12, lastMs: 12, maxMs: 12 },
                avgDurationMs: 12,
              },
              commit: {
                requests: 1,
                failures: 0,
                successes: 1,
                conflicts: 0,
                lastReceiptCount: 2,
                duration: { totalMs: 8, lastMs: 8, maxMs: 8 },
                avgDurationMs: 8,
              },
              orphanCleanup: {
                requests: 1,
                failures: 0,
                accepted: 1,
                objectsRequested: 1,
                deleted: 1,
                retried: 0,
                skipped: 0,
                duration: { totalMs: 3, lastMs: 3, maxMs: 3 },
                avgDurationMs: 3,
              },
              outbox: {
                pendingCount: 4,
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
      .get('/internal/metrics/sync')
      .expect(401);
  });

  it('exposes sync metrics snapshot on internal route when token is valid', async () => {
    const response = await request(app.getHttpServer())
      .get('/internal/metrics/sync')
      .set('Authorization', `Bearer ${internalToken}`)
      .expect(200);

    expect(response.body.diff.actions.upload).toBe(1);
    expect(response.body.commit.successes).toBe(1);
    expect(response.body.outbox.pendingCount).toBe(4);
  });

  it('does not expose sync metrics behind api prefix', async () => {
    await request(app.getHttpServer())
      .get('/api/internal/metrics/sync')
      .set('Authorization', `Bearer ${internalToken}`)
      .expect(404);
  });
});
