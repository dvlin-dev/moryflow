/**
 * AI Admin Controller
 * AI Provider 和 Model 管理 API
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
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
import { AdminGuard } from '../common/guards';
import { AiAdminService } from './ai-admin.service';
import {
  CreateProviderSchema,
  UpdateProviderSchema,
  CreateModelSchema,
  UpdateModelSchema,
} from './dto';

@ApiTags('Admin - AI')
@ApiBearerAuth('bearer')
@Controller({ path: 'admin/ai', version: '1' })
@UseGuards(AdminGuard)
export class AiAdminController {
  constructor(private readonly aiAdminService: AiAdminService) {}

  // ==================== Provider 端点 ====================

  @ApiOperation({
    summary: '获取预设 Provider 列表',
    description: '获取可选的 AI Provider 预设配置',
  })
  @ApiResponse({ status: 200, description: '预设 Provider 列表' })
  @Get('preset-providers')
  getPresetProviders() {
    return this.aiAdminService.getPresetProviders();
  }

  @ApiOperation({
    summary: '获取所有 Provider',
    description: '列出所有已配置的 AI Provider',
  })
  @ApiResponse({ status: 200, description: 'Provider 列表' })
  @Get('providers')
  getAllProviders() {
    return this.aiAdminService.getAllProviders();
  }

  @ApiOperation({
    summary: '获取单个 Provider',
    description: '获取指定 Provider 的详细信息',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Provider 详情' })
  @ApiResponse({ status: 404, description: 'Provider 不存在' })
  @Get('providers/:id')
  getProviderById(@Param('id') id: string) {
    return this.aiAdminService.getProviderById(id);
  }

  @ApiOperation({
    summary: '创建 Provider',
    description: '创建新的 AI Provider 配置',
  })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @Post('providers')
  async createProvider(@Body() body: unknown) {
    const parsed = CreateProviderSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.aiAdminService.createProvider(parsed.data);
  }

  @ApiOperation({
    summary: '更新 Provider',
    description: '更新 AI Provider 配置',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: 'Provider 不存在' })
  @Put('providers/:id')
  async updateProvider(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateProviderSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.aiAdminService.updateProvider(id, parsed.data);
  }

  @ApiOperation({
    summary: '删除 Provider',
    description: '删除 AI Provider 配置',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: 'Provider 不存在' })
  @Delete('providers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProvider(@Param('id') id: string): Promise<void> {
    return this.aiAdminService.deleteProvider(id);
  }

  // ==================== Model 端点 ====================

  @ApiOperation({
    summary: '获取所有 Model',
    description: '列出所有 AI Model (支持按 Provider 筛选)',
  })
  @ApiQuery({
    name: 'providerId',
    required: false,
    description: '按 Provider 筛选',
  })
  @ApiResponse({ status: 200, description: 'Model 列表' })
  @Get('models')
  getAllModels(@Query('providerId') providerId?: string) {
    return this.aiAdminService.getAllModels(providerId);
  }

  @ApiOperation({
    summary: '获取单个 Model',
    description: '获取指定 Model 的详细信息',
  })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({ status: 200, description: 'Model 详情' })
  @ApiResponse({ status: 404, description: 'Model 不存在' })
  @Get('models/:id')
  getModelById(@Param('id') id: string) {
    return this.aiAdminService.getModelById(id);
  }

  @ApiOperation({
    summary: '创建 Model',
    description: '创建新的 AI Model 配置',
  })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @Post('models')
  async createModel(@Body() body: unknown) {
    const parsed = CreateModelSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.aiAdminService.createModel(parsed.data);
  }

  @ApiOperation({ summary: '更新 Model', description: '更新 AI Model 配置' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: 'Model 不存在' })
  @Put('models/:id')
  async updateModel(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateModelSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.aiAdminService.updateModel(id, parsed.data);
  }

  @ApiOperation({ summary: '删除 Model', description: '删除 AI Model 配置' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: 'Model 不存在' })
  @Delete('models/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteModel(@Param('id') id: string): Promise<void> {
    return this.aiAdminService.deleteModel(id);
  }
}
