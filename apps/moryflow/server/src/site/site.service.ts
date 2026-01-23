/**
 * [INPUT]: userId, subdomain, siteId 等业务参数
 * [OUTPUT]: Site 实体、校验结果、操作状态
 * [POS]: 站点发布核心服务，处理站点 CRUD 和子域名管理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { SiteType, SiteStatus } from '../../generated/prisma/enums';
import type { CurrentUserDto, SubscriptionTier } from '../types';
import type { CreateSiteDto, UpdateSiteDto, SiteResponseDto } from './dto';
import {
  RESERVED_SUBDOMAINS,
  SUBDOMAIN_REGEX,
  SITE_DOMAIN,
} from './site.constants';
import { SitePublishService } from './site-publish.service';
import { getQuotaConfig } from '../quota/quota.config';

/** 免费用户站点有效期（天） */
const FREE_USER_SITE_EXPIRY_DAYS = 365;

@Injectable()
export class SiteService {
  private readonly logger = new Logger(SiteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publishService: SitePublishService,
  ) {}

  /**
   * 检查用户是否为付费用户
   */
  private isPaidUser(tier: SubscriptionTier): boolean {
    return tier !== 'free';
  }

  /**
   * 校验子域名格式
   */
  validateSubdomainFormat(subdomain: string): {
    valid: boolean;
    message?: string;
  } {
    // 长度校验
    if (subdomain.length < 3) {
      return {
        valid: false,
        message: 'Subdomain must be at least 3 characters',
      };
    }
    if (subdomain.length > 32) {
      return { valid: false, message: 'Subdomain cannot exceed 32 characters' };
    }

    // 格式校验
    if (!SUBDOMAIN_REGEX.test(subdomain)) {
      return {
        valid: false,
        message:
          'Subdomain can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen',
      };
    }

    // 保留词校验
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      return {
        valid: false,
        message: 'This subdomain is reserved and cannot be used',
      };
    }

    return { valid: true };
  }

  /**
   * 检查子域名可用性
   */
  async checkSubdomainAvailability(subdomain: string): Promise<{
    available: boolean;
    message?: string;
  }> {
    // 格式校验
    const formatCheck = this.validateSubdomainFormat(subdomain);
    if (!formatCheck.valid) {
      return { available: false, message: formatCheck.message };
    }

    // 唯一性校验
    const existing = await this.prisma.site.findUnique({
      where: { subdomain },
      select: { id: true },
    });

    if (existing) {
      return { available: false, message: 'This subdomain is already taken' };
    }

    return { available: true };
  }

  /**
   * 推荐可用的子域名
   */
  async suggestSubdomains(baseWord: string): Promise<string[]> {
    const suggestions: string[] = [];
    const normalized = baseWord.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normalized.length < 3) {
      return suggestions;
    }

    // 生成候选列表
    const candidates = [
      normalized,
      `${normalized}-site`,
      `${normalized}-blog`,
      `${normalized}-docs`,
      `my-${normalized}`,
      `${normalized}123`,
      `${normalized}-io`,
    ];

    // 检查每个候选的可用性
    for (const candidate of candidates) {
      if (suggestions.length >= 5) break;

      const check = await this.checkSubdomainAvailability(candidate);
      if (check.available) {
        suggestions.push(candidate);
      }
    }

    return suggestions;
  }

  /**
   * 检查用户站点数量限制
   */
  async checkUserSiteLimit(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<{ allowed: boolean; message?: string }> {
    const quota = getQuotaConfig(tier);

    // -1 表示无限制
    if (quota.maxSites === -1) {
      return { allowed: true };
    }

    // 检查站点数量
    const siteCount = await this.prisma.site.count({
      where: { userId },
    });

    if (siteCount >= quota.maxSites) {
      return {
        allowed: false,
        message: `You can create up to ${quota.maxSites} site(s) on your current plan. Please upgrade to create more.`,
      };
    }

    return { allowed: true };
  }

  /**
   * 创建站点
   */
  async createSite(
    user: CurrentUserDto,
    dto: CreateSiteDto,
  ): Promise<SiteResponseDto> {
    // 检查站点数量限制
    const limitCheck = await this.checkUserSiteLimit(user.id, user.tier);
    if (!limitCheck.allowed) {
      throw new ForbiddenException(limitCheck.message);
    }

    // 检查子域名可用性
    const subdomainCheck = await this.checkSubdomainAvailability(dto.subdomain);
    if (!subdomainCheck.available) {
      throw new ConflictException(subdomainCheck.message);
    }

    // 计算过期时间（免费用户 1 年）
    const expiresAt = this.isPaidUser(user.tier)
      ? null
      : new Date(Date.now() + FREE_USER_SITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // 创建站点
    const site = await this.prisma.site.create({
      data: {
        userId: user.id,
        subdomain: dto.subdomain,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        showWatermark: !this.isPaidUser(user.tier),
        expiresAt,
      },
      include: {
        _count: { select: { pages: true } },
      },
    });

    this.logger.log(`Site created: ${site.subdomain} by user ${user.id}`);

    return this.toResponseDto(site);
  }

  /**
   * 获取用户的站点列表
   */
  async getUserSites(userId: string): Promise<SiteResponseDto[]> {
    const sites = await this.prisma.site.findMany({
      where: { userId },
      include: {
        _count: { select: { pages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sites.map((site) => this.toResponseDto(site));
  }

  /**
   * 获取站点详情
   */
  async getSite(siteId: string, userId: string): Promise<SiteResponseDto> {
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        userId,
      },
      include: {
        _count: { select: { pages: true } },
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return this.toResponseDto(site);
  }

  /**
   * 获取站点页面列表（包含 localFilePath）
   */
  async getSitePages(
    siteId: string,
    userId: string,
  ): Promise<{ path: string; localFilePath: string | null }[]> {
    // 验证站点所有权
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        userId,
      },
      select: { id: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const pages = await this.prisma.sitePage.findMany({
      where: { siteId },
      select: {
        path: true,
        localFilePath: true,
      },
      orderBy: { path: 'asc' },
    });

    return pages;
  }

  /**
   * 根据子域名获取站点（Worker 回源使用）
   */
  async getSiteBySubdomain(subdomain: string) {
    const site = await this.prisma.site.findFirst({
      where: {
        subdomain,
        status: SiteStatus.ACTIVE,
      },
      select: {
        id: true,
        subdomain: true,
        type: true,
        title: true,
        showWatermark: true,
        expiresAt: true,
      },
    });

    // 检查是否过期
    if (site?.expiresAt && site.expiresAt < new Date()) {
      return null;
    }

    return site;
  }

  /**
   * 更新站点
   */
  async updateSite(
    siteId: string,
    userId: string,
    tier: SubscriptionTier,
    dto: UpdateSiteDto,
  ): Promise<SiteResponseDto> {
    // 验证站点所有权
    const existing = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Site not found');
    }

    // 水印设置只有付费用户可以关闭
    if (dto.showWatermark === false && !this.isPaidUser(tier)) {
      throw new ForbiddenException(
        'Upgrade to a paid plan to disable watermark',
      );
    }

    const site = await this.prisma.site.update({
      where: { id: siteId },
      data: {
        title: dto.title,
        description: dto.description,
        showWatermark: dto.showWatermark,
      },
      include: {
        _count: { select: { pages: true } },
      },
    });

    // 同步更新 R2 中的 _meta.json
    await this.publishService.updateSiteMeta(site.subdomain, {
      title: dto.title ?? site.title,
      showWatermark: dto.showWatermark ?? site.showWatermark,
    });

    return this.toResponseDto(site);
  }

  /**
   * 下线站点（保留数据，可恢复）
   */
  async offlineSite(siteId: string, userId: string): Promise<void> {
    // 先获取站点信息（需要 subdomain）
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        userId,
        status: SiteStatus.ACTIVE,
      },
      select: { subdomain: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found or already offline');
    }

    // 更新数据库状态
    await this.prisma.site.update({
      where: { id: siteId },
      data: { status: SiteStatus.OFFLINE },
    });

    // 同步更新 R2 中的 _meta.json
    await this.publishService.updateSiteMetaStatus(site.subdomain, 'OFFLINE');

    this.logger.log(`Site offline: ${siteId}`);
  }

  /**
   * 上线站点
   */
  async onlineSite(siteId: string, userId: string): Promise<void> {
    // 先获取站点信息（需要 subdomain）
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        userId,
        status: SiteStatus.OFFLINE,
      },
      select: { subdomain: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found or not offline');
    }

    // 更新数据库状态
    await this.prisma.site.update({
      where: { id: siteId },
      data: { status: SiteStatus.ACTIVE },
    });

    // 同步更新 R2 中的 _meta.json
    await this.publishService.updateSiteMetaStatus(site.subdomain, 'ACTIVE');

    this.logger.log(`Site online: ${siteId}`);
  }

  /**
   * 删除站点（硬删除）
   */
  async deleteSite(siteId: string, userId: string): Promise<void> {
    // 验证站点所有权
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        userId,
      },
      select: { subdomain: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // 1. 清理 R2 文件
    try {
      await this.publishService.cleanSiteFiles(site.subdomain);
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

    this.logger.log(`Site deleted: ${siteId}`);
  }

  /**
   * 转换为响应 DTO
   */
  private toResponseDto(site: {
    id: string;
    subdomain: string;
    type: SiteType;
    status: SiteStatus;
    title: string | null;
    description: string | null;
    favicon: string | null;
    showWatermark: boolean;
    publishedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { pages: number };
  }): SiteResponseDto {
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
      pageCount: site._count?.pages ?? 0,
    };
  }
}
