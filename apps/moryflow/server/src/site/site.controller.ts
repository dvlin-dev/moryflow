/**
 * [INPUT]: HTTP 请求，认证用户信息
 * [OUTPUT]: 站点相关的 REST API 响应
 * [POS]: 站点管理控制器，提供站点 CRUD 和子域名管理 API
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CurrentUser, Public } from '../auth/decorators';
import type { CurrentUserDto } from '../types';
import { SiteService } from './site.service';
import {
  CreateSiteDto,
  UpdateSiteDto,
  type SiteResponseDto,
  type SubdomainCheckResponseDto,
  type SubdomainSuggestResponseDto,
} from './dto';

@ApiTags('Site')
@ApiBearerAuth('bearer')
@ApiCookieAuth('better-auth.session_token')
@Controller('api/sites')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  /**
   * 获取用户的站点列表
   * GET /api/sites
   */
  @Get()
  @ApiOperation({ summary: '获取用户的站点列表' })
  @ApiOkResponse({ description: '站点列表' })
  async listSites(
    @CurrentUser() user: CurrentUserDto,
  ): Promise<{ sites: SiteResponseDto[]; total: number }> {
    const sites = await this.siteService.getUserSites(user.id);
    return { sites, total: sites.length };
  }

  /**
   * 创建新站点
   * POST /api/sites
   */
  @Post()
  @ApiOperation({ summary: '创建新站点' })
  @ApiOkResponse({ description: '创建成功' })
  async createSite(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: CreateSiteDto,
  ): Promise<SiteResponseDto> {
    // subdomain 已在 CreateSiteSchema 中通过 transform 规范化
    return this.siteService.createSite(user, body);
  }

  /**
   * 检查子域名可用性
   * GET /api/sites/subdomain/check?subdomain=xxx
   */
  @Get('subdomain/check')
  @ApiOperation({ summary: '检查子域名可用性' })
  @ApiOkResponse({ description: '可用性检查结果' })
  @ApiQuery({ name: 'subdomain', description: '子域名' })
  async checkSubdomain(
    @Query('subdomain') subdomain: string,
  ): Promise<SubdomainCheckResponseDto> {
    const normalizedSubdomain = subdomain?.toLowerCase().trim() || '';
    const result =
      await this.siteService.checkSubdomainAvailability(normalizedSubdomain);
    return {
      subdomain: normalizedSubdomain,
      available: result.available,
      message: result.message,
    };
  }

  /**
   * 推荐可用子域名
   * GET /api/sites/subdomain/suggest?base=xxx
   */
  @Get('subdomain/suggest')
  @ApiOperation({ summary: '推荐可用子域名' })
  @ApiOkResponse({ description: '推荐的子域名列表' })
  @ApiQuery({ name: 'base', description: '基础名称' })
  async suggestSubdomain(
    @Query('base') base: string,
  ): Promise<SubdomainSuggestResponseDto> {
    const suggestions = await this.siteService.suggestSubdomains(base || '');
    return { suggestions };
  }

  /**
   * 根据子域名获取站点信息（Worker 回源使用）
   * GET /api/sites/by-subdomain/:subdomain
   * 这是公开接口，供 Worker 回源查询
   */
  @Public()
  @Get('by-subdomain/:subdomain')
  @ApiOperation({ summary: '根据子域名获取站点信息' })
  @ApiOkResponse({ description: '站点信息' })
  @ApiParam({ name: 'subdomain', description: '子域名' })
  async getSiteBySubdomain(@Param('subdomain') subdomain: string) {
    const site = await this.siteService.getSiteBySubdomain(subdomain);
    if (!site) {
      return { found: false };
    }
    return { found: true, site };
  }

  /**
   * 获取站点页面列表（包含 localFilePath）
   * GET /api/sites/:id/pages
   */
  @Get(':id/pages')
  @ApiOperation({ summary: '获取站点页面列表' })
  @ApiOkResponse({ description: '页面列表' })
  @ApiParam({ name: 'id', description: '站点 ID' })
  async getSitePages(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<{ path: string; localFilePath: string | null }[]> {
    return this.siteService.getSitePages(id, user.id);
  }

  /**
   * 获取站点详情
   * GET /api/sites/:id
   */
  @Get(':id')
  @ApiOperation({ summary: '获取站点详情' })
  @ApiOkResponse({ description: '站点详情' })
  @ApiParam({ name: 'id', description: '站点 ID' })
  async getSite(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<SiteResponseDto> {
    return this.siteService.getSite(id, user.id);
  }

  /**
   * 更新站点配置
   * PATCH /api/sites/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: '更新站点配置' })
  @ApiOkResponse({ description: '更新成功' })
  @ApiParam({ name: 'id', description: '站点 ID' })
  async updateSite(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() body: UpdateSiteDto,
  ): Promise<SiteResponseDto> {
    return this.siteService.updateSite(
      id,
      user.id,
      user.subscriptionTier,
      body,
    );
  }

  /**
   * 下线站点
   * POST /api/sites/:id/offline
   */
  @Post(':id/offline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '下线站点' })
  @ApiNoContentResponse({ description: '下线成功' })
  @ApiParam({ name: 'id', description: '站点 ID' })
  async offlineSite(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.siteService.offlineSite(id, user.id);
  }

  /**
   * 上线站点
   * POST /api/sites/:id/online
   */
  @Post(':id/online')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '上线站点' })
  @ApiNoContentResponse({ description: '上线成功' })
  @ApiParam({ name: 'id', description: '站点 ID' })
  async onlineSite(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.siteService.onlineSite(id, user.id);
  }

  /**
   * 删除站点
   * DELETE /api/sites/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除站点' })
  @ApiNoContentResponse({ description: '删除成功' })
  @ApiParam({ name: 'id', description: '站点 ID' })
  async deleteSite(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.siteService.deleteSite(id, user.id);
  }
}
