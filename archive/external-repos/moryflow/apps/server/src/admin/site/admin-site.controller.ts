/**
 * [INPUT]: HTTP 请求，认证管理员信息
 * [OUTPUT]: 站点管理 API 响应
 * [POS]: 管理员站点管理控制器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth';
import { AdminGuard } from '../../common/guards';
import { AdminSiteService } from './admin-site.service';
import type { CurrentUserDto } from '../../types';
import {
  AdminSiteListQuerySchema,
  AdminSiteUpdateSchema,
  type AdminSiteListResponseDto,
  type AdminSiteDetailDto,
  type AdminSiteStatsDto,
} from './admin-site.dto';

@ApiTags('Admin Sites')
@ApiCookieAuth()
@Controller('api/admin/sites')
@UseGuards(AdminGuard)
export class AdminSiteController {
  constructor(private readonly adminSiteService: AdminSiteService) {}

  // ==================== 查询接口 ====================

  @ApiOperation({
    summary: '获取站点列表',
    description: '分页查询站点，支持搜索和多维度筛选',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: '搜索关键词（子域名/标题/用户邮箱）',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'OFFLINE'] })
  @ApiQuery({ name: 'type', required: false, enum: ['MARKDOWN', 'GENERATED'] })
  @ApiQuery({
    name: 'userTier',
    required: false,
    enum: ['free', 'starter', 'basic', 'pro', 'license'],
  })
  @ApiQuery({
    name: 'expiryFilter',
    required: false,
    enum: ['expiring', 'expired'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: '站点列表' })
  @Get()
  async listSites(
    @Query() query: Record<string, string>,
  ): Promise<AdminSiteListResponseDto> {
    const parsed = AdminSiteListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminSiteService.getSites(parsed.data);
  }

  @ApiOperation({
    summary: '获取站点统计',
    description: '获取站点数量统计数据',
  })
  @ApiResponse({ status: 200, description: '统计数据' })
  @Get('stats')
  async getStats(): Promise<AdminSiteStatsDto> {
    return this.adminSiteService.getStats();
  }

  @ApiOperation({
    summary: '获取站点详情',
    description: '获取站点完整信息，包含页面列表和所有者信息',
  })
  @ApiParam({ name: 'id', description: '站点 ID' })
  @ApiResponse({ status: 200, description: '站点详情' })
  @ApiResponse({ status: 404, description: '站点不存在' })
  @Get(':id')
  async getSite(@Param('id') id: string): Promise<AdminSiteDetailDto> {
    return this.adminSiteService.getSiteById(id);
  }

  // ==================== 操作接口 ====================

  @ApiOperation({
    summary: '强制下线站点',
    description: '将站点状态设为 OFFLINE，站点将不可访问',
  })
  @ApiParam({ name: 'id', description: '站点 ID' })
  @ApiResponse({ status: 204, description: '下线成功' })
  @ApiResponse({ status: 404, description: '站点不存在' })
  @ApiResponse({ status: 400, description: '站点已下线' })
  @Post(':id/offline')
  @HttpCode(HttpStatus.NO_CONTENT)
  async offlineSite(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ): Promise<void> {
    await this.adminSiteService.offlineSite(id, user.id);
  }

  @ApiOperation({
    summary: '恢复上线站点',
    description: '将站点状态设为 ACTIVE，恢复访问',
  })
  @ApiParam({ name: 'id', description: '站点 ID' })
  @ApiResponse({ status: 204, description: '上线成功' })
  @ApiResponse({ status: 404, description: '站点不存在' })
  @ApiResponse({ status: 400, description: '站点已上线' })
  @Post(':id/online')
  @HttpCode(HttpStatus.NO_CONTENT)
  async onlineSite(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ): Promise<void> {
    await this.adminSiteService.onlineSite(id, user.id);
  }

  @ApiOperation({
    summary: '更新站点配置',
    description: '修改站点的过期时间或水印开关',
  })
  @ApiParam({ name: 'id', description: '站点 ID' })
  @ApiResponse({ status: 200, description: '更新后的站点详情' })
  @ApiResponse({ status: 404, description: '站点不存在' })
  @Patch(':id')
  async updateSite(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: CurrentUserDto,
  ): Promise<AdminSiteDetailDto> {
    const parsed = AdminSiteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminSiteService.updateSite(id, parsed.data, user.id);
  }

  @ApiOperation({
    summary: '删除站点',
    description: '永久删除站点数据和 R2 文件，此操作不可恢复',
  })
  @ApiParam({ name: 'id', description: '站点 ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '站点不存在' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSite(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ): Promise<void> {
    await this.adminSiteService.deleteSite(id, user.id);
  }
}
