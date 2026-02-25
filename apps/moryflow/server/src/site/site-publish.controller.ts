/**
 * [INPUT]: HTTP 请求，认证用户信息，文件内容
 * [OUTPUT]: 发布结果
 * [POS]: 站点发布控制器，提供发布 API
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Controller,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiConsumes,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators';
import type { CurrentUserDto } from '../types';
import {
  SitePublishService,
  type PublishFile,
  type PublishResultDto,
  type PublishSiteDto,
} from './site-publish.service';

// ── 请求体类型 ────────────────────────────────────────────────

interface PublishRequestBody {
  /** 页面信息（JSON 字符串） */
  pages?: string;
  /** 导航结构（JSON 字符串） */
  navigation?: string;
  /** 文件内容（Base64 编码，用于非 multipart 请求） */
  files?: {
    path: string;
    content: string; // Base64
    contentType: string;
  }[];
}

// ── 控制器 ────────────────────────────────────────────────────

@ApiTags('Site')
@ApiBearerAuth('bearer')
@ApiCookieAuth('better-auth.session_token')
@Controller({ path: 'sites', version: '1' })
export class SitePublishController {
  private readonly logger = new Logger(SitePublishController.name);

  constructor(private readonly publishService: SitePublishService) {}

  /**
   * 发布站点内容
   * POST /api/v1/sites/:id/publish
   *
   * 支持两种方式：
   * 1. JSON body 带 Base64 编码的文件（小文件）
   * 2. multipart/form-data（大文件）
   */
  @Post(':id/publish')
  @ApiOperation({ summary: '发布站点内容' })
  @ApiOkResponse({ description: '发布结果' })
  @ApiParam({ name: 'id', description: '站点 ID' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FilesInterceptor('files', 100, { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async publishSite(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') siteId: string,
    @Body() body: PublishRequestBody,
    @UploadedFiles() uploadedFiles?: Express.Multer.File[],
  ): Promise<PublishResultDto> {
    // 调试日志
    this.logger.debug(`Publish request for site ${siteId}`);
    this.logger.debug(`uploadedFiles count: ${uploadedFiles?.length ?? 0}`);
    this.logger.debug(`body.files count: ${body.files?.length ?? 0}`);
    if (body.files && body.files.length > 0) {
      this.logger.debug(
        `body.files paths: ${body.files.map((f) => f.path).join(', ')}`,
      );
    }

    let files: PublishFile[] = [];

    // 处理 multipart 上传的文件
    if (uploadedFiles && uploadedFiles.length > 0) {
      files = uploadedFiles.map((f) => ({
        path: f.originalname,
        content: f.buffer,
        contentType: f.mimetype,
      }));
    }
    // 处理 JSON body 中的 Base64 文件
    else if (body.files && body.files.length > 0) {
      files = body.files.map((f) => ({
        path: f.path,
        content: Buffer.from(f.content, 'base64'),
        contentType: f.contentType,
      }));
    }

    if (files.length === 0) {
      throw new BadRequestException('No files provided for publishing');
    }

    // 解析页面和导航信息
    let pages: PublishSiteDto['pages'];
    let navigation: PublishSiteDto['navigation'];

    try {
      if (body.pages) {
        pages = JSON.parse(body.pages) as PublishSiteDto['pages'];
      }
      if (body.navigation) {
        navigation = JSON.parse(
          body.navigation,
        ) as PublishSiteDto['navigation'];
      }
    } catch {
      throw new BadRequestException('Invalid pages or navigation format');
    }

    return this.publishService.publishSite(siteId, user.id, {
      files,
      pages,
      navigation,
    });
  }
}
