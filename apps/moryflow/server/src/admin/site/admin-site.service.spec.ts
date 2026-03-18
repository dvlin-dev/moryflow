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

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
});
