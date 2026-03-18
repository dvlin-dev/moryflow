import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSiteService } from './admin-site.service';
import { SiteStatus } from '../../../generated/prisma/enums';
import type { PrismaService } from '../../prisma';
import type { SitePublishService } from '../../site/site-publish.service';

function createModelMock() {
  return {
    findUnique: vi.fn().mockResolvedValue(undefined),
    findFirst: vi.fn().mockResolvedValue(undefined),
    findMany: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(undefined),
    createMany: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    updateMany: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteMany: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(undefined),
    aggregate: vi.fn().mockResolvedValue(undefined),
    groupBy: vi.fn().mockResolvedValue(undefined),
  };
}

describe('AdminSiteService', () => {
  let prisma: {
    site: ReturnType<typeof createModelMock>;
    $transaction: ReturnType<typeof vi.fn>;
  };
  let sitePublishService: {
    hasOwnedSiteMeta: ReturnType<typeof vi.fn>;
    updateSiteMetaStatus: ReturnType<typeof vi.fn>;
    updateSiteMeta: ReturnType<typeof vi.fn>;
  };
  let service: AdminSiteService;

  beforeEach(() => {
    prisma = {
      site: createModelMock(),
      $transaction: vi.fn(async (callback) => callback(prisma)),
    };
    prisma.site.updateMany.mockResolvedValue({ count: 1 });
    sitePublishService = {
      hasOwnedSiteMeta: vi.fn().mockResolvedValue(false),
      updateSiteMetaStatus: vi.fn().mockResolvedValue(undefined),
      updateSiteMeta: vi.fn().mockResolvedValue(undefined),
    };
    service = new AdminSiteService(
      prisma as unknown as PrismaService,
      sitePublishService as unknown as SitePublishService,
    );
  });

  it('syncs worker meta when an admin forces a site offline and worker metadata exists', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      status: SiteStatus.ACTIVE,
    });

    await service.offlineSite('site-1', 'admin-1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.site.update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: { status: SiteStatus.OFFLINE },
    });
    expect(sitePublishService.updateSiteMetaStatus).toHaveBeenCalledWith(
      'demo',
      'OFFLINE',
    );
  });

  it('skips worker meta sync when a site has no worker metadata and is forced offline', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: null,
      status: SiteStatus.ACTIVE,
    });

    await service.offlineSite('site-1', 'admin-1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.site.update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: { status: SiteStatus.OFFLINE },
    });
    expect(sitePublishService.updateSiteMetaStatus).not.toHaveBeenCalled();
  });

  it('syncs worker meta when an admin restores a site online and worker metadata exists', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      status: SiteStatus.OFFLINE,
    });

    await service.onlineSite('site-1', 'admin-1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.site.update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: { status: SiteStatus.ACTIVE },
    });
    expect(sitePublishService.updateSiteMetaStatus).toHaveBeenCalledWith(
      'demo',
      'ACTIVE',
    );
  });

  it('syncs worker meta when an admin updates site runtime config and worker metadata exists', async () => {
    const expiresAt = new Date('2026-04-01T00:00:00.000Z');

    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      status: SiteStatus.ACTIVE,
    });
    prisma.site.update.mockResolvedValue(undefined);

    const getSiteByIdSpy = vi
      .spyOn(service, 'getSiteById')
      .mockResolvedValue({ id: 'site-1' } as never);

    await service.updateSite(
      'site-1',
      {
        showWatermark: false,
        expiresAt,
      },
      'admin-1',
    );

    expect(prisma.site.update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: {
        expiresAt,
        showWatermark: false,
      },
    });
    expect(sitePublishService.updateSiteMeta).toHaveBeenCalledWith('demo', {
      expiresAt: '2026-04-01T00:00:00.000Z',
      showWatermark: false,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(sitePublishService.updateSiteMetaStatus).not.toHaveBeenCalled();
    expect(getSiteByIdSpy).toHaveBeenCalledWith('site-1');
  });

  it('clears worker expiry meta when worker metadata exists and an admin removes site expiry', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      status: SiteStatus.ACTIVE,
    });
    prisma.site.update.mockResolvedValue(undefined);

    const getSiteByIdSpy = vi
      .spyOn(service, 'getSiteById')
      .mockResolvedValue({ id: 'site-1' } as never);

    await service.updateSite(
      'site-1',
      {
        expiresAt: null,
      },
      'admin-1',
    );

    expect(sitePublishService.updateSiteMeta).toHaveBeenCalledWith('demo', {
      expiresAt: null,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(getSiteByIdSpy).toHaveBeenCalledWith('site-1');
  });

  it('skips worker meta sync when a site has no worker metadata and is updated in admin', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: null,
      status: SiteStatus.ACTIVE,
    });
    prisma.site.update.mockResolvedValue(undefined);

    const getSiteByIdSpy = vi
      .spyOn(service, 'getSiteById')
      .mockResolvedValue({ id: 'site-1' } as never);

    await service.updateSite(
      'site-1',
      {
        showWatermark: false,
        expiresAt: new Date('2026-04-01T00:00:00.000Z'),
      },
      'admin-1',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(sitePublishService.updateSiteMeta).not.toHaveBeenCalled();
    expect(getSiteByIdSpy).toHaveBeenCalledWith('site-1');
  });

  it('syncs worker meta for an unpublished site when the existing worker metadata belongs to that site', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: null,
      status: SiteStatus.ACTIVE,
    });
    sitePublishService.hasOwnedSiteMeta.mockResolvedValue(true);

    await service.offlineSite('site-1', 'admin-1');

    expect(sitePublishService.hasOwnedSiteMeta).toHaveBeenCalledWith(
      'demo',
      'site-1',
      true,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(sitePublishService.updateSiteMetaStatus).toHaveBeenCalledWith(
      'demo',
      'OFFLINE',
    );
  });

  it('falls back to db-only admin updates when unpublished worker metadata ownership cannot be checked', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: null,
      status: SiteStatus.ACTIVE,
    });
    sitePublishService.hasOwnedSiteMeta.mockResolvedValue(false);
    prisma.site.update.mockResolvedValue(undefined);

    const getSiteByIdSpy = vi
      .spyOn(service, 'getSiteById')
      .mockResolvedValue({ id: 'site-1' } as never);

    await service.updateSite(
      'site-1',
      {
        expiresAt: undefined,
        showWatermark: false,
      },
      'admin-1',
    );

    expect(sitePublishService.hasOwnedSiteMeta).toHaveBeenCalledWith(
      'demo',
      'site-1',
      true,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(sitePublishService.updateSiteMeta).not.toHaveBeenCalled();
    expect(getSiteByIdSpy).toHaveBeenCalledWith('site-1');
  });

  it('retries worker status sync for a published site that is already offline', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      status: SiteStatus.OFFLINE,
    });

    await service.offlineSite('site-1', 'admin-1');

    expect(prisma.site.update).not.toHaveBeenCalled();
    expect(sitePublishService.updateSiteMetaStatus).toHaveBeenCalledWith(
      'demo',
      'OFFLINE',
    );
  });

  it('retries worker status sync for a published site that is already online', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      status: SiteStatus.ACTIVE,
    });

    await service.onlineSite('site-1', 'admin-1');

    expect(prisma.site.update).not.toHaveBeenCalled();
    expect(sitePublishService.updateSiteMetaStatus).toHaveBeenCalledWith(
      'demo',
      'ACTIVE',
    );
  });

  it('rolls back db status when syncing offline worker metadata fails', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      status: SiteStatus.ACTIVE,
    });
    prisma.site.update.mockResolvedValue(undefined);
    sitePublishService.updateSiteMetaStatus.mockRejectedValue(
      new Error('r2 unavailable'),
    );

    await expect(service.offlineSite('site-1', 'admin-1')).rejects.toThrow(
      'r2 unavailable',
    );

    expect(prisma.site.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'site-1' },
      data: { status: SiteStatus.OFFLINE },
    });
    expect(prisma.site.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'site-1',
        status: SiteStatus.OFFLINE,
      },
      data: { status: SiteStatus.ACTIVE },
    });
  });

  it('rolls back db runtime config when syncing worker metadata fails', async () => {
    const expiresAt = new Date('2026-04-01T00:00:00.000Z');

    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      status: SiteStatus.ACTIVE,
      expiresAt: new Date('2026-03-20T00:00:00.000Z'),
      showWatermark: true,
    });
    prisma.site.update.mockResolvedValue(undefined);
    sitePublishService.updateSiteMeta.mockRejectedValue(
      new Error('meta write failed'),
    );

    await expect(
      service.updateSite(
        'site-1',
        {
          expiresAt,
          showWatermark: false,
        },
        'admin-1',
      ),
    ).rejects.toThrow('meta write failed');

    expect(prisma.site.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'site-1' },
      data: {
        expiresAt,
        showWatermark: false,
      },
    });
    expect(prisma.site.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'site-1',
        expiresAt,
        showWatermark: false,
      },
      data: {
        expiresAt: new Date('2026-03-20T00:00:00.000Z'),
        showWatermark: true,
      },
    });
  });

  it('does not overwrite a newer admin runtime config change during rollback', async () => {
    const expiresAt = new Date('2026-04-01T00:00:00.000Z');

    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      status: SiteStatus.ACTIVE,
      expiresAt: new Date('2026-03-20T00:00:00.000Z'),
      showWatermark: true,
    });
    prisma.site.update.mockResolvedValue(undefined);
    prisma.site.updateMany.mockResolvedValue({ count: 0 });
    sitePublishService.updateSiteMeta.mockRejectedValue(
      new Error('meta write failed'),
    );

    await expect(
      service.updateSite(
        'site-1',
        {
          expiresAt,
          showWatermark: false,
        },
        'admin-1',
      ),
    ).rejects.toThrow('meta write failed');

    expect(prisma.site.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'site-1',
        expiresAt,
        showWatermark: false,
      },
      data: {
        expiresAt: new Date('2026-03-20T00:00:00.000Z'),
        showWatermark: true,
      },
    });
  });
});
