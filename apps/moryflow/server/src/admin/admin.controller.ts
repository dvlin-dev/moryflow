/**
 * [INPUT]: Admin API 请求（Bearer access token + 请求体/查询参数）
 * [OUTPUT]: 管理员视角的用户/统计/操作结果
 * [POS]: 管理后台 API 入口（AdminGuard 统一鉴权）
 *
 * 认证机制：
 * - 统一走 /api/auth/* 登录与刷新（access JWT + refresh）
 * - AdminGuard 负责管理员权限校验
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import { AdminGuard } from '../common/guards';
import { AdminService } from './admin.service';
import type { SubscriptionTier, CurrentUserDto } from '../types';
import {
  SetSubscriptionTierSchema,
  GrantCreditsSchema,
  SetAdminPermissionSchema,
  PaginationSchema,
  SendEmailSchema,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({
    summary: '获取当前用户信息',
    description: '验证 Access Token 并返回当前管理员信息',
  })
  @ApiResponse({ status: 200, description: '当前用户信息' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @Get('me')
  getCurrentUser(@CurrentUser() user: CurrentUserDto) {
    return { user };
  }

  // ==================== 需要认证的接口 ====================

  @ApiOperation({
    summary: '获取系统统计',
    description: '获取系统概览统计信息',
  })
  @ApiResponse({ status: 200, description: '系统统计' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @Get('stats')
  async getStats() {
    return this.adminService.getSystemStats();
  }

  @ApiOperation({
    summary: '获取用户列表',
    description: '获取所有用户列表 (支持分页、Tier 筛选、删除状态筛选)',
  })
  @ApiQuery({
    name: 'tier',
    required: false,
    enum: ['free', 'starter', 'basic', 'pro', 'license'],
    description: '用户等级筛选',
  })
  @ApiQuery({
    name: 'deleted',
    required: false,
    enum: ['true', 'false'],
    description: '删除状态筛选: true=仅已删除, false=仅活跃, 不传=全部',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量 (默认 50, 最大 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: '偏移量',
  })
  @ApiResponse({ status: 200, description: '用户列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @Get('users')
  async listUsers(
    @Query('tier') tier?: SubscriptionTier,
    @Query('deleted') deleted?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedPagination = PaginationSchema.safeParse({ limit, offset });
    if (!parsedPagination.success) {
      throw new BadRequestException(parsedPagination.error.issues[0]?.message);
    }

    // 解析 deleted 参数
    let deletedFilter: boolean | undefined;
    if (deleted === 'true') {
      deletedFilter = true;
    } else if (deleted === 'false') {
      deletedFilter = false;
    }

    return this.adminService.listUsers({
      tier,
      deleted: deletedFilter,
      limit: parsedPagination.data.limit,
      offset: parsedPagination.data.offset,
    });
  }

  @ApiOperation({
    summary: '获取用户详情',
    description: '获取指定用户的详细信息 (包括积分余额和订阅状态)',
  })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '用户详情' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @Get('users/:userId')
  async getUserDetails(@Param('userId') userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  // ==================== 删除记录接口 ====================

  @ApiOperation({
    summary: '获取删除统计',
    description: '获取账户删除的统计信息（按原因分组）',
  })
  @ApiResponse({ status: 200, description: '删除统计' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @Get('deletions/stats')
  async getDeletionStats() {
    return this.adminService.getDeletionStats();
  }

  @ApiOperation({
    summary: '获取删除记录列表',
    description: '获取账户删除记录（包含删除原因和反馈）',
  })
  @ApiQuery({
    name: 'reason',
    required: false,
    description: '按删除原因筛选',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量 (默认 50, 最大 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: '偏移量',
  })
  @ApiResponse({ status: 200, description: '删除记录列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @Get('deletions')
  async listDeletionRecords(
    @Query('reason') reason?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedPagination = PaginationSchema.safeParse({ limit, offset });
    if (!parsedPagination.success) {
      throw new BadRequestException(parsedPagination.error.issues[0]?.message);
    }
    return this.adminService.listDeletionRecords({
      reason,
      limit: parsedPagination.data.limit,
      offset: parsedPagination.data.offset,
    });
  }

  @ApiOperation({
    summary: '设置用户等级',
    description: '修改指定用户的会员等级',
  })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '设置成功' })
  @ApiResponse({ status: 400, description: '无效的 Tier 值' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @Put('users/:userId/tier')
  async setSubscriptionTier(
    @CurrentUser() user: CurrentUserDto,
    @Param('userId') userId: string,
    @Body() body: { tier: SubscriptionTier },
  ) {
    const parsed = SetSubscriptionTierSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminService.setSubscriptionTier(
      userId,
      parsed.data.tier,
      user.id,
    );
  }

  @ApiOperation({ summary: '发放积分', description: '手动为用户发放积分' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '发放成功' })
  @ApiResponse({ status: 400, description: '无效的积分类型或数量' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @Post('users/:userId/credits')
  async grantCredits(
    @CurrentUser() user: CurrentUserDto,
    @Param('userId') userId: string,
    @Body() body: { type: 'subscription' | 'purchased'; amount: number },
  ) {
    const parsed = GrantCreditsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    await this.adminService.grantCredits(
      userId,
      parsed.data.type,
      parsed.data.amount,
      user.id,
    );
    return { success: true };
  }

  @ApiOperation({
    summary: '设置管理员权限',
    description: '授予或撤销用户的管理员权限',
  })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '设置成功' })
  @ApiResponse({ status: 400, description: '无效的请求参数' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @Put('users/:userId/admin')
  async setAdminPermission(
    @CurrentUser() user: CurrentUserDto,
    @Param('userId') userId: string,
    @Body() body: { isAdmin: boolean },
  ) {
    const parsed = SetAdminPermissionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminService.setAdminPermission(
      userId,
      parsed.data.isAdmin,
      user.id,
    );
  }

  @ApiOperation({
    summary: '获取操作日志',
    description: '获取管理员操作日志列表',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量 (默认 50, 最大 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: '偏移量',
  })
  @ApiResponse({ status: 200, description: '操作日志列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @Get('logs')
  async getAdminLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsed = PaginationSchema.safeParse({ limit, offset });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminService.getAdminLogs({
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
  }

  // ==================== 邮件接口 ====================

  @ApiOperation({
    summary: '发送邮件',
    description: '向指定邮箱发送自定义邮件',
  })
  @ApiResponse({ status: 200, description: '发送成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @Post('email/send')
  async sendEmail(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: { to: string; subject: string; html: string },
  ) {
    const parsed = SendEmailSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    await this.adminService.sendEmail(
      parsed.data.to,
      parsed.data.subject,
      parsed.data.html,
      user.id,
    );
    return { success: true };
  }
}
