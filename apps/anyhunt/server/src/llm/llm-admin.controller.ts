/**
 * [INPUT]: Admin LLM provider/model/settings requests (session + admin)
 * [OUTPUT]: Provider/Model/Settings JSON (never includes plaintext apiKey)
 * [POS]: Anyhunt Admin 动态 LLM 配置入口（参考 Moryflow AiProvider/AiModel）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateLlmProviderSchema,
  type CreateLlmProviderDto,
  UpdateLlmProviderSchema,
  type UpdateLlmProviderDto,
  CreateLlmModelSchema,
  type CreateLlmModelDto,
  UpdateLlmModelSchema,
  type UpdateLlmModelDto,
  UpdateLlmSettingsSchema,
  type UpdateLlmSettingsDto,
} from './dto';
import { LlmAdminService } from './llm-admin.service';

@ApiTags('AdminLlm')
@ApiSecurity('session')
@Controller({ path: 'admin/llm', version: '1' })
@RequireAdmin()
export class LlmAdminController {
  constructor(private readonly llmAdminService: LlmAdminService) {}

  @Get('settings')
  getSettings() {
    return this.llmAdminService.getSettings();
  }

  @Put('settings')
  updateSettings(
    @Body(new ZodValidationPipe(UpdateLlmSettingsSchema))
    dto: UpdateLlmSettingsDto,
  ) {
    return this.llmAdminService.updateSettings(dto);
  }

  @Get('providers')
  listProviders() {
    return this.llmAdminService.listProviders();
  }

  @Post('providers')
  createProvider(
    @Body(new ZodValidationPipe(CreateLlmProviderSchema))
    dto: CreateLlmProviderDto,
  ) {
    return this.llmAdminService.createProvider(dto);
  }

  @Patch('providers/:id')
  updateProvider(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateLlmProviderSchema))
    dto: UpdateLlmProviderDto,
  ) {
    return this.llmAdminService.updateProvider(id, dto);
  }

  @Delete('providers/:id')
  async deleteProvider(@Param('id') id: string): Promise<void> {
    await this.llmAdminService.deleteProvider(id);
  }

  @Get('models')
  listModels() {
    return this.llmAdminService.listModels();
  }

  @Post('models')
  createModel(
    @Body(new ZodValidationPipe(CreateLlmModelSchema)) dto: CreateLlmModelDto,
  ) {
    return this.llmAdminService.createModel(dto);
  }

  @Patch('models/:id')
  updateModel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateLlmModelSchema)) dto: UpdateLlmModelDto,
  ) {
    return this.llmAdminService.updateModel(id, dto);
  }

  @Delete('models/:id')
  async deleteModel(@Param('id') id: string): Promise<void> {
    await this.llmAdminService.deleteModel(id);
  }
}
