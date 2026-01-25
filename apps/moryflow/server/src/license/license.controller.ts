/**
 * License Controller
 * 处理 License 验证与激活相关 API 请求
 */

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { LicenseService } from './license.service';
import {
  ValidateLicenseSchema,
  ActivateLicenseSchema,
  DeactivateLicenseSchema,
  type ValidateLicenseDto,
  type ActivateLicenseDto,
  type DeactivateLicenseDto,
} from './dto/license.dto';
import { AdminGuard } from '../common/guards/admin.guard';
import { Public } from '../auth/decorators';
import { PaginationSchema, PAGINATION_MAX_LIMIT } from '../admin/dto/admin.dto';
import type { LicenseStatus } from '../../generated/prisma/client';

@ApiTags('License')
@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  /**
   * 验证 License
   * POST /license/validate
   * M6 Fix: 添加严格的速率限制防止暴力破解
   */
  @ApiOperation({
    summary: '验证 License',
    description: '验证 License Key 是否有效 (公开接口, 限速 10次/分钟)',
  })
  @ApiResponse({ status: 200, description: '验证结果' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 每分钟最多 10 次
  @Post('validate')
  async validateLicense(@Body() body: ValidateLicenseDto) {
    const parsed = ValidateLicenseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    return this.licenseService.validateLicense(
      parsed.data.licenseKey,
      parsed.data.instanceName,
    );
  }

  /**
   * 激活 License
   * POST /license/activate
   * M6 Fix: 添加严格的速率限制防止暴力破解
   */
  @ApiOperation({
    summary: '激活 License',
    description: '激活 License 并绑定到设备 (公开接口, 限速 5次/分钟)',
  })
  @ApiResponse({ status: 200, description: '激活结果' })
  @ApiResponse({ status: 400, description: '请求参数错误或激活次数已达上限' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 每分钟最多 5 次
  @Post('activate')
  async activateLicense(@Body() body: ActivateLicenseDto) {
    const parsed = ActivateLicenseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    return this.licenseService.activateLicense(parsed.data);
  }

  /**
   * 停用 License
   * POST /license/deactivate
   * M6 Fix: 添加严格的速率限制防止暴力破解
   */
  @ApiOperation({
    summary: '停用 License',
    description: '停用指定设备上的 License (公开接口, 限速 5次/分钟)',
  })
  @ApiResponse({ status: 204, description: '停用成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 每分钟最多 5 次
  @Post('deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateLicense(@Body() body: DeactivateLicenseDto) {
    const parsed = DeactivateLicenseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    const success = await this.licenseService.deactivateLicense(
      parsed.data.licenseKey,
      parsed.data.instanceId,
    );
    if (!success) {
      throw new NotFoundException('License activation not found');
    }
  }

  /**
   * 获取 License 详情（管理员）
   * GET /license/:id
   */
  @ApiOperation({
    summary: '获取 License 详情',
    description: '管理员获取指定 License 的详细信息',
  })
  @ApiBearerAuth('bearer')
  @ApiParam({ name: 'id', description: 'License ID' })
  @ApiResponse({ status: 200, description: 'License 详情' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @ApiResponse({ status: 404, description: 'License 不存在' })
  @Get(':id')
  @UseGuards(AdminGuard)
  @SkipThrottle() // 管理员接口不需要严格限制
  async getLicenseById(@Param('id') id: string) {
    const license = await this.licenseService.getLicenseById(id);
    if (!license) {
      throw new NotFoundException('License not found');
    }
    return license;
  }

  /**
   * 获取 License 列表（管理员）
   * GET /license
   * M7 Fix: 使用 PaginationSchema 保护分页参数
   */
  @ApiOperation({
    summary: '获取 License 列表',
    description: '管理员获取 License 列表 (支持分页和筛选)',
  })
  @ApiBearerAuth('bearer')
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'revoked'],
    description: 'License 状态筛选',
  })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID 筛选' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量 (最大 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: '偏移量',
  })
  @ApiResponse({ status: 200, description: 'License 列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @Get()
  @UseGuards(AdminGuard)
  @SkipThrottle()
  async listLicenses(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const pagination = PaginationSchema.parse({ limit, offset });
    return this.licenseService.listLicenses({
      status: status as LicenseStatus | undefined,
      userId,
      limit: Math.min(pagination.limit, PAGINATION_MAX_LIMIT),
      offset: pagination.offset,
    });
  }

  /**
   * 撤销 License（管理员）
   * POST /license/:id/revoke
   */
  @ApiOperation({
    summary: '撤销 License',
    description: '管理员撤销指定 License',
  })
  @ApiBearerAuth('bearer')
  @ApiParam({ name: 'id', description: 'License ID' })
  @ApiResponse({ status: 204, description: '撤销成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '无管理员权限' })
  @ApiResponse({ status: 404, description: 'License 不存在' })
  @Post(':id/revoke')
  @UseGuards(AdminGuard)
  @SkipThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeLicense(@Param('id') id: string) {
    const success = await this.licenseService.revokeLicense(id);
    if (!success) {
      throw new NotFoundException('License not found');
    }
  }
}
