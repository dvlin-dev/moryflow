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
  };
  let sitePublishService: {
    updateSiteMetaStatus: ReturnType<typeof vi.fn>;
    updateSiteMeta: ReturnType<typeof vi.fn>;
  };
  let service: AdminSiteService;

  beforeEach(() => {
    prisma = {
      site: createModelMock(),
    };
    sitePublishService = {
      updateSiteMetaStatus: vi.fn().mockResolvedValue(undefined),
      updateSiteMeta: vi.fn().mockResolvedValue(undefined),
    };
    service = new AdminSiteService(
      prisma as unknown as PrismaService,
      sitePublishService as unknown as SitePublishService,
    );
  });

  it('syncs worker meta when an admin forces a site offline', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      status: SiteStatus.ACTIVE,
    });

    await service.offlineSite('site-1', 'admin-1');

    expect(prisma.site.update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: { status: SiteStatus.OFFLINE },
    });
    expect(sitePublishService.updateSiteMetaStatus).toHaveBeenCalledWith(
      'demo',
      'OFFLINE',
    );
  });

  it('syncs worker meta when an admin restores a site online', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
      status: SiteStatus.OFFLINE,
    });

    await service.onlineSite('site-1', 'admin-1');

    expect(prisma.site.update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: { status: SiteStatus.ACTIVE },
    });
    expect(sitePublishService.updateSiteMetaStatus).toHaveBeenCalledWith(
      'demo',
      'ACTIVE',
    );
  });

  it('syncs worker meta when an admin updates site runtime config', async () => {
    const expiresAt = new Date('2026-04-01T00:00:00.000Z');

    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
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
    expect(sitePublishService.updateSiteMetaStatus).not.toHaveBeenCalled();
    expect(getSiteByIdSpy).toHaveBeenCalledWith('site-1');
  });

  it('clears worker expiry meta when an admin removes site expiry', async () => {
    prisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      subdomain: 'demo',
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
    expect(getSiteByIdSpy).toHaveBeenCalledWith('site-1');
  });
});
