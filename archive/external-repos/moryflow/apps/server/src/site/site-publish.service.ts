/**
 * [INPUT]: subdomain, 文件内容（HTML/assets）
 * [OUTPUT]: 发布状态
 * [POS]: 站点发布服务，处理文件上传到 R2 和 _meta.json 生成
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { posix as pathPosix } from 'path';
import { PrismaService } from '../prisma';
import { SiteStatus } from '../../generated/prisma/enums';
import { SITE_DOMAIN } from './site.constants';

// ── 类型定义 ────────────────────────────────────────────────

/** 发布文件 */
export interface PublishFile {
  path: string; // 相对路径，如 index.html 或 guide/setup.html
  content: Buffer | string;
  contentType: string;
}

/** 站点状态（与 Worker 共享） */
export type SiteMetaStatus = 'ACTIVE' | 'OFFLINE';

/** 站点元数据（Worker 使用） */
export interface SiteMeta {
  siteId: string;
  type: 'MARKDOWN' | 'GENERATED';
  subdomain: string;
  status: SiteMetaStatus;
  title: string | null;
  showWatermark: boolean;
  expiresAt?: string; // 过期时间（ISO 格式）
  routes?: {
    path: string;
    title: string | null;
  }[];
  navigation?: NavItem[];
  updatedAt: string;
}

export interface NavItem {
  title: string;
  path?: string;
  children?: NavItem[];
}

/** 发布请求 */
export interface PublishSiteDto {
  files: PublishFile[];
  pages?: {
    path: string;
    title?: string;
    localFilePath?: string;
    localFileHash?: string;
  }[];
  navigation?: NavItem[];
}

/** 发布响应 */
export interface PublishResultDto {
  siteId: string;
  url: string;
  publishedAt: Date;
  pageCount: number;
}

// ── 常量 ────────────────────────────────────────────────────

/** R2 存储桶中站点文件的前缀 */
const SITES_PREFIX = 'sites';

// ── 服务实现 ────────────────────────────────────────────────

@Injectable()
export class SitePublishService {
  private readonly logger = new Logger(SitePublishService.name);
  private client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly accountId: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accountId = this.configService.get<string>('R2_ACCOUNT_ID', '');
    this.accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID', '');
    this.secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
      '',
    );
    // 站点发布使用独立的 bucket
    this.bucketName = this.configService.get<string>(
      'R2_SITES_BUCKET_NAME',
      'moryflow-sites',
    );
  }

  /**
   * 获取 S3 客户端
   */
  private getClient(): S3Client {
    if (!this.client) {
      if (!this.accountId || !this.accessKeyId || !this.secretAccessKey) {
        throw new BadRequestException('R2 storage not configured');
      }

      const endpoint = `https://${this.accountId}.r2.cloudflarestorage.com`;
      this.client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
    }
    return this.client;
  }

  /**
   * 发布站点内容
   */
  async publishSite(
    siteId: string,
    userId: string,
    dto: PublishSiteDto,
  ): Promise<PublishResultDto> {
    // 验证站点所有权
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        userId,
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // 清理旧文件
    await this.cleanSiteFiles(site.subdomain);

    // 上传新文件
    const uploadPromises = dto.files.map((file) =>
      this.uploadFile(
        site.subdomain,
        file.path,
        file.content,
        file.contentType,
      ),
    );
    await Promise.all(uploadPromises);

    // 更新页面记录
    if (dto.pages && dto.pages.length > 0) {
      // 删除旧页面
      await this.prisma.sitePage.deleteMany({
        where: { siteId },
      });

      // 创建新页面
      await this.prisma.sitePage.createMany({
        data: dto.pages.map((page) => ({
          siteId,
          path: page.path,
          title: page.title,
          localFilePath: page.localFilePath,
          localFileHash: page.localFileHash,
        })),
      });
    }

    // 生成并上传 _meta.json
    const meta: SiteMeta = {
      siteId: site.id,
      type: site.type,
      subdomain: site.subdomain,
      status: 'ACTIVE',
      title: site.title,
      showWatermark: site.showWatermark,
      expiresAt: site.expiresAt?.toISOString(),
      routes: dto.pages?.map((p) => ({
        path: p.path,
        title: p.title ?? null,
      })),
      navigation: dto.navigation,
      updatedAt: new Date().toISOString(),
    };

    await this.uploadFile(
      site.subdomain,
      '_meta.json',
      JSON.stringify(meta, null, 2),
      'application/json',
    );

    // 更新站点发布时间
    const now = new Date();
    await this.prisma.site.update({
      where: { id: siteId },
      data: {
        publishedAt: site.publishedAt ?? now,
        status: SiteStatus.ACTIVE,
      },
    });

    this.logger.log(`Site published: ${site.subdomain} (${siteId})`);

    return {
      siteId,
      url: `https://${site.subdomain}.${SITE_DOMAIN}`,
      publishedAt: now,
      pageCount: dto.pages?.length ?? dto.files.length,
    };
  }

  /**
   * 上传单个文件到站点目录
   */
  private async uploadFile(
    subdomain: string,
    path: string,
    content: Buffer | string,
    contentType: string,
  ): Promise<void> {
    // 规范化路径：移除所有 ../ 前缀和多余的 /，防止 S3 签名计算问题
    const normalizedPath = pathPosix
      .normalize(path)
      .replace(/^(\.\.\/)+/, '') // 移除所有开头的 ../
      .replace(/^\/+/, ''); // 移除开头的 /
    const key = `${SITES_PREFIX}/${subdomain}/${normalizedPath}`;
    const body =
      typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /**
   * 清理站点的所有文件
   * 注意：此方法被 AdminSiteService 调用，用于彻底清除站点
   */
  async cleanSiteFiles(subdomain: string): Promise<void> {
    const prefix = `${SITES_PREFIX}/${subdomain}/`;

    try {
      // 列出所有文件
      const listResult = await this.getClient().send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
        }),
      );

      if (!listResult.Contents || listResult.Contents.length === 0) {
        return;
      }

      // 批量删除
      const objects = listResult.Contents.map((obj) => ({ Key: obj.Key! }));
      await this.getClient().send(
        new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: { Objects: objects, Quiet: true },
        }),
      );

      this.logger.debug(
        `Cleaned ${objects.length} files for site ${subdomain}`,
      );
    } catch (error) {
      this.logger.error(`Failed to clean site files: ${subdomain}`, error);
      // 不抛出错误，继续发布
    }
  }

  /**
   * 更新站点 _meta.json 中的状态
   * 用于下线/删除/上线操作时同步状态到 R2
   */
  async updateSiteMetaStatus(
    subdomain: string,
    status: SiteMetaStatus,
  ): Promise<void> {
    await this.updateSiteMeta(subdomain, { status });
  }

  /**
   * 更新站点 _meta.json 中的字段
   * 用于同步站点设置到 R2
   */
  async updateSiteMeta(
    subdomain: string,
    updates: Partial<Pick<SiteMeta, 'status' | 'title' | 'showWatermark'>>,
  ): Promise<void> {
    const metaKey = `${SITES_PREFIX}/${subdomain}/_meta.json`;

    try {
      // 读取现有的 _meta.json
      const getResult = await this.getClient().send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: metaKey,
        }),
      );

      if (!getResult.Body) {
        this.logger.warn(`No _meta.json found for site: ${subdomain}`);
        return;
      }

      // 解析并更新字段
      const bodyStr = await getResult.Body.transformToString();
      const meta: SiteMeta = JSON.parse(bodyStr);

      if (updates.status !== undefined) meta.status = updates.status;
      if (updates.title !== undefined) meta.title = updates.title;
      if (updates.showWatermark !== undefined)
        meta.showWatermark = updates.showWatermark;
      meta.updatedAt = new Date().toISOString();

      // 上传更新后的 _meta.json
      await this.uploadFile(
        subdomain,
        '_meta.json',
        JSON.stringify(meta, null, 2),
        'application/json',
      );

      this.logger.log(
        `Updated site meta: ${subdomain} -> ${JSON.stringify(updates)}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update site meta: ${subdomain}`, error);
      throw error;
    }
  }
}
