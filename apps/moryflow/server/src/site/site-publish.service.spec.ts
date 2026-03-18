import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { SitePublishService } from './site-publish.service';
import { SiteStatus } from '../../generated/prisma/enums';
import type { PrismaService } from '../prisma';

describe('SitePublishService', () => {
  let prisma: {
    site: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };
  let service: SitePublishService;

  beforeEach(() => {
    prisma = {
      site: {
        findUnique: vi.fn(),
      },
    };
    configService = {
      get: vi.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          R2_ACCOUNT_ID: 'account',
          R2_ACCESS_KEY_ID: 'key',
          R2_SECRET_ACCESS_KEY: 'secret',
          R2_SITES_BUCKET_NAME: 'bucket',
        };
        return values[key] ?? fallback ?? '';
      }),
    };

    service = new SitePublishService(
      configService as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  });

  it('rebuilds site meta from db when the existing _meta.json is invalid', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Body: {
          transformToString: vi.fn().mockResolvedValue('{'),
        },
      })
      .mockResolvedValueOnce({});

    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      type: 'MARKDOWN',
      subdomain: 'demo',
      status: SiteStatus.ACTIVE,
      title: 'Demo',
      showWatermark: true,
      expiresAt: new Date('2026-04-01T00:00:00.000Z'),
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      pages: [
        {
          path: '/',
          title: 'Home',
        },
      ],
    });

    (
      service as unknown as { getClient: () => { send: typeof send } }
    ).getClient = () => ({ send });

    await service.updateSiteMeta('demo', {
      status: 'OFFLINE',
      showWatermark: false,
      expiresAt: null,
    });

    expect(prisma.site.findUnique).toHaveBeenCalledWith({
      where: { subdomain: 'demo' },
      include: {
        pages: {
          orderBy: { path: 'asc' },
        },
      },
    });

    const uploadCommand = send.mock.calls[1]?.[0];
    expect(uploadCommand).toBeInstanceOf(PutObjectCommand);
    expect(uploadCommand.input.Key).toBe('sites/demo/_meta.json');
    expect(uploadCommand.input.ContentType).toBe('application/json');

    const uploadedMeta = JSON.parse(
      (uploadCommand.input.Body as Buffer).toString('utf-8'),
    ) as Record<string, unknown>;

    expect(uploadedMeta).toMatchObject({
      siteId: 'site-1',
      subdomain: 'demo',
      status: 'OFFLINE',
      title: 'Demo',
      showWatermark: false,
      routes: [
        {
          path: '/',
          title: 'Home',
        },
      ],
    });
    expect(uploadedMeta).not.toHaveProperty('expiresAt');
  });

  it('throws when reading _meta.json fails with a bucket-level 404 error', async () => {
    const send = vi.fn().mockRejectedValue(
      Object.assign(new Error('bucket missing'), {
        name: 'NoSuchBucket',
        $metadata: {
          httpStatusCode: 404,
        },
      }),
    );

    (
      service as unknown as { getClient: () => { send: typeof send } }
    ).getClient = () => ({ send });

    await expect(
      service.updateSiteMeta('demo', {
        status: 'OFFLINE',
      }),
    ).rejects.toThrow('bucket missing');
  });

  it('treats invalid _meta.json as owned when published pages already exist for the site', async () => {
    const send = vi.fn().mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue('{'),
      },
    });

    prisma.site.findUnique.mockResolvedValue({
      subdomain: 'demo',
      _count: {
        pages: 2,
      },
    });

    (
      service as unknown as { getClient: () => { send: typeof send } }
    ).getClient = () => ({ send });

    await expect(
      service.hasOwnedSiteMeta('demo', 'site-1', true),
    ).resolves.toBe(true);

    expect(prisma.site.findUnique).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      select: {
        subdomain: true,
        _count: {
          select: {
            pages: true,
          },
        },
      },
    });
  });

  it('does not treat invalid _meta.json as owned when no published pages exist', async () => {
    const send = vi.fn().mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue('{'),
      },
    });

    prisma.site.findUnique.mockResolvedValue({
      subdomain: 'demo',
      _count: {
        pages: 0,
      },
    });

    (
      service as unknown as { getClient: () => { send: typeof send } }
    ).getClient = () => ({ send });

    await expect(
      service.hasOwnedSiteMeta('demo', 'site-1', true),
    ).resolves.toBe(false);
  });

  it('does not rebuild _meta.json from db for an unpublished site', async () => {
    const send = vi.fn().mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue('{'),
      },
    });

    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      type: 'MARKDOWN',
      subdomain: 'demo',
      status: SiteStatus.ACTIVE,
      title: 'Draft',
      showWatermark: true,
      expiresAt: null,
      publishedAt: null,
      pages: [],
    });

    (
      service as unknown as { getClient: () => { send: typeof send } }
    ).getClient = () => ({ send });

    await service.updateSiteMeta('demo', {
      status: 'OFFLINE',
    });

    expect(prisma.site.findUnique).toHaveBeenCalledWith({
      where: { subdomain: 'demo' },
      include: {
        pages: {
          orderBy: { path: 'asc' },
        },
      },
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
