/**
 * Admin Storage Controller
 * 云同步管理 API
 */

import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
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
import { AdminGuard } from '../common/guards';
import { AdminStorageService } from './admin-storage.service';
import {
  VaultListQuerySchema,
  UserStorageListQuerySchema,
  VectorizedFileListQuerySchema,
} from './dto';

@ApiTags('Admin Storage')
@ApiCookieAuth()
@Controller('api/admin/storage')
@UseGuards(AdminGuard)
export class AdminStorageController {
  constructor(private readonly adminStorageService: AdminStorageService) {}

  // ==================== 统计接口 ====================

  @ApiOperation({
    summary: '获取云同步统计',
    description: '获取云同步整体统计信息',
  })
  @ApiResponse({ status: 200, description: '统计信息' })
  @Get('stats')
  async getStats() {
    return this.adminStorageService.getStats();
  }

  // ==================== Vault 管理 ====================

  @ApiOperation({
    summary: '获取 Vault 列表',
    description: '获取所有 Vault 列表，支持搜索和分页',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: '搜索（用户邮箱或 Vault 名称）',
  })
  @ApiQuery({ name: 'userId', required: false, description: '按用户筛选' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: '偏移量',
  })
  @ApiResponse({ status: 200, description: 'Vault 列表' })
  @Get('vaults')
  async getVaultList(
    @Query('search') search?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsed = VaultListQuerySchema.safeParse({
      search,
      userId,
      limit,
      offset,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminStorageService.getVaultList(parsed.data);
  }

  @ApiOperation({
    summary: '获取 Vault 详情',
    description: '获取指定 Vault 的详细信息',
  })
  @ApiParam({ name: 'id', description: 'Vault ID' })
  @ApiResponse({ status: 200, description: 'Vault 详情' })
  @ApiResponse({ status: 404, description: 'Vault 不存在' })
  @Get('vaults/:id')
  async getVaultDetail(@Param('id') id: string) {
    return this.adminStorageService.getVaultDetail(id);
  }

  @ApiOperation({
    summary: '删除 Vault',
    description: '删除指定 Vault（包含 R2 文件）',
  })
  @ApiParam({ name: 'id', description: 'Vault ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: 'Vault 不存在' })
  @Delete('vaults/:id')
  async deleteVault(@Param('id') id: string) {
    return this.adminStorageService.deleteVault(id);
  }

  // ==================== 用户存储管理 ====================

  @ApiOperation({
    summary: '获取用户存储列表',
    description: '获取有存储记录的用户列表',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: '搜索（用户邮箱或名称）',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: '偏移量',
  })
  @ApiResponse({ status: 200, description: '用户存储列表' })
  @Get('users')
  async getUserStorageList(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsed = UserStorageListQuerySchema.safeParse({
      search,
      limit,
      offset,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminStorageService.getUserStorageList(parsed.data);
  }

  @ApiOperation({
    summary: '获取用户存储详情',
    description: '获取指定用户的存储详情',
  })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '用户存储详情' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @Get('users/:userId')
  async getUserStorageDetail(@Param('userId') userId: string) {
    return this.adminStorageService.getUserStorageDetail(userId);
  }

  // ==================== 向量化管理 ====================

  @ApiOperation({
    summary: '获取向量化文件列表',
    description: '获取向量化文件列表',
  })
  @ApiQuery({ name: 'userId', required: false, description: '按用户筛选' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: '搜索（文件标题或用户邮箱）',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: '偏移量',
  })
  @ApiResponse({ status: 200, description: '向量化文件列表' })
  @Get('vectorized')
  async getVectorizedFileList(
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsed = VectorizedFileListQuerySchema.safeParse({
      userId,
      search,
      limit,
      offset,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminStorageService.getVectorizedFileList(parsed.data);
  }

  @ApiOperation({
    summary: '删除向量化记录',
    description: '删除指定的向量化记录',
  })
  @ApiParam({ name: 'id', description: '向量化记录 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  @Delete('vectorized/:id')
  async deleteVectorizedFile(@Param('id') id: string) {
    return this.adminStorageService.deleteVectorizedFile(id);
  }
}
