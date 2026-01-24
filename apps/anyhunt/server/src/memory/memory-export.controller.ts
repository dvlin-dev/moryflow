/**
 * [POS]: Memory Export API Controller (Mem0 V1 aligned)
 *
 * [INPUT]: Export DTOs
 * [OUTPUT]: Export job + export data
 */

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiOkResponse,
} from '@nestjs/swagger';
import { MemoryService } from './memory.service';
import {
  ExportCreateSchema,
  ExportGetSchema,
  type ExportCreateInput,
  type ExportGetInput,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public } from '../auth';
import { ZodValidationPipe } from '../common';

@ApiTags('Memory')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'exports', version: '1' })
@UseGuards(ApiKeyGuard)
export class MemoryExportController {
  constructor(private readonly memoryService: MemoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create memory export' })
  @ApiOkResponse({ description: 'Export job created' })
  async create(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(ExportCreateSchema)) dto: ExportCreateInput,
  ) {
    return this.memoryService.createExport(apiKey.id, dto);
  }

  @Post('get')
  @ApiOperation({ summary: 'Get memory export' })
  @ApiOkResponse({ description: 'Export data returned' })
  async get(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(ExportGetSchema)) dto: ExportGetInput,
  ) {
    return this.memoryService.getExport(apiKey.id, dto);
  }
}
