/**
 * [INPUT]: siteId, 查询参数, 更新数据
 * [OUTPUT]: 站点列表、详情、操作结果
 * [POS]: 管理员站点管理业务逻辑
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { SitePublishService } from '../../site/site-publish.service';
import { SiteStatus } from '../../../generated/prisma/enums';
import { SITE_DOMAIN } from '../../site/site.constants';
import type {
  AdminSiteListQueryDto,
  AdminSiteUpdateDto,
  AdminSiteListResponseDto,
  AdminSiteListItemDto,
  AdminSiteDetailDto,
  AdminSiteStatsDto,
} from './admin-site.dto';

@Injectable()
export class AdminSiteService {
  private readonly logger = new Logger(AdminSiteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sitePublishService: SitePublishService,
  ) {}

  /**
   * 获取站点列表（支持搜索和筛选）
   */
  async getSites(
    query: AdminSiteListQueryDto,
  ): Promise<AdminSiteListResponseDto> {
    const { search, status, type, userTier, expiryFilter, limit, offset } =
      query;

    // 构建 WHERE 条件
    const where: any = {};
    const userWhere: any = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 类型筛选
    if (type) {
      where.type = type;
    }

    // 用户等级筛选
    if (userTier) {
      userWhere.tier = userTier;
    }

    // 过期筛选
    if (expiryFilter === 'expiring') {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.expiresAt = {
        gte: now,
        lte: sevenDaysLater,
      };
    } else if (expiryFilter === 'expired') {
      where.expiresAt = {
        lt: new Date(),
      };
    }

    // 搜索条件（子域名、标题、用户邮箱）
    if (search) {
      where.OR = [
        { subdomain: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // 合并用户条件
    if (Object.keys(userWhere).length > 0) {
      where.user = { ...where.user, ...userWhere };
    }

    // 并行查询：数据 + 总数
    const [sites, total] = await Promise.all([
      this.prisma.site.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              tier: true,
              createdAt: true,
            },
          },
          _count: {
            select: { pages: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.site.count({ where }),
    ]);

    // 转换为响应格式
    const siteItems: AdminSiteListItemDto[] = sites.map((site) => ({
      id: site.id,
      subdomain: site.subdomain,
      type: site.type,
      status: site.status,
      title: site.title,
      showWatermark: site.showWatermark,
      publishedAt: site.publishedAt,
      expiresAt: site.expiresAt,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      url: `https://${site.subdomain}.${SITE_DOMAIN}`,
      pageCount: site._count.pages,
      owner: {
        id: site.user.id,
        email: site.user.email,
        name: site.user.name,
        tier: site.user.tier,
        createdAt: site.user.createdAt,
      },
    }));

    return {
      sites: siteItems,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  /**
   * 获取站点详情
   */
  async getSiteById(siteId: string): Promise<AdminSiteDetailDto> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            tier: true,
            createdAt: true,
          },
        },
        pages: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return {
      id: site.id,
      subdomain: site.subdomain,
      type: site.type,
      status: site.status,
      title: site.title,
      description: site.description,
      favicon: site.favicon,
      showWatermark: site.showWatermark,
      publishedAt: site.publishedAt,
      expiresAt: site.expiresAt,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      url: `https://${site.subdomain}.${SITE_DOMAIN}`,
      owner: {
        id: site.user.id,
        email: site.user.email,
        name: site.user.name,
        tier: site.user.tier,
        createdAt: site.user.createdAt,
      },
      pages: site.pages.map((page) => ({
        id: page.id,
        path: page.path,
        title: page.title,
        localFilePath: page.localFilePath,
        localFileHash: page.localFileHash,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      })),
    };
  }

  /**
   * 强制下线站点
   */
  async offlineSite(siteId: string, adminId: string): Promise<void> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    if (site.status === SiteStatus.OFFLINE) {
      throw new BadRequestException('Site is already offline');
    }

    await this.prisma.site.update({
      where: { id: siteId },
      data: { status: SiteStatus.OFFLINE },
    });

    this.logger.log(`Site ${siteId} offlined by admin ${adminId}`);
  }

  /**
   * 恢复上线站点
   */
  async onlineSite(siteId: string, adminId: string): Promise<void> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    if (site.status === SiteStatus.ACTIVE) {
      throw new BadRequestException('Site is already online');
    }

    await this.prisma.site.update({
      where: { id: siteId },
      data: { status: SiteStatus.ACTIVE },
    });

    this.logger.log(`Site ${siteId} onlined by admin ${adminId}`);
  }

  /**
   * 更新站点配置
   */
  async updateSite(
    siteId: string,
    dto: AdminSiteUpdateDto,
    adminId: string,
  ): Promise<AdminSiteDetailDto> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const updateData: any = {};

    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt;
    }

    if (dto.showWatermark !== undefined) {
      updateData.showWatermark = dto.showWatermark;
    }

    await this.prisma.site.update({
      where: { id: siteId },
      data: updateData,
    });

    this.logger.log(`Site ${siteId} updated by admin ${adminId}`);

    return this.getSiteById(siteId);
  }

  /**
   * 删除站点（硬删除）
   */
  async deleteSite(siteId: string, adminId: string): Promise<void> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // 1. 清理 R2 文件
    try {
      await this.sitePublishService.cleanSiteFiles(site.subdomain);
    } catch (error) {
      this.logger.error(
        `Failed to clean R2 files for site ${site.subdomain}`,
        error,
      );
    }

    // 2. 删除数据库记录（SitePage 会级联删除）
    await this.prisma.site.delete({
      where: { id: siteId },
    });

    this.logger.warn(
      `Site ${site.subdomain} (${siteId}) deleted by admin ${adminId}`,
    );
  }

  /**
   * 获取站点统计数据
   */
  async getStats(): Promise<AdminSiteStatsDto> {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      total,
      activeCount,
      offlineCount,
      markdownCount,
      generatedCount,
      expiringSoonCount,
      expiredCount,
    ] = await Promise.all([
      this.prisma.site.count(),
      this.prisma.site.count({ where: { status: SiteStatus.ACTIVE } }),
      this.prisma.site.count({ where: { status: SiteStatus.OFFLINE } }),
      this.prisma.site.count({ where: { type: 'MARKDOWN' } }),
      this.prisma.site.count({ where: { type: 'GENERATED' } }),
      this.prisma.site.count({
        where: {
          expiresAt: {
            gte: now,
            lte: sevenDaysLater,
          },
        },
      }),
      this.prisma.site.count({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      }),
    ]);

    return {
      total,
      byStatus: {
        active: activeCount,
        offline: offlineCount,
      },
      byType: {
        markdown: markdownCount,
        generated: generatedCount,
      },
      expiringSoon: expiringSoonCount,
      expired: expiredCount,
    };
  }
}
