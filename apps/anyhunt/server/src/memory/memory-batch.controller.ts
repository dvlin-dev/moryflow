/**
 * [POS]: Memory Batch API Controller (Mem0 V1 aligned)
 *
 * [INPUT]: Batch update/delete DTOs
 * [OUTPUT]: Batch operation results
 */

import { Controller, Put, Delete, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiOkResponse,
} from '@nestjs/swagger';
import { MemoryService } from './memory.service';
import {
  BatchUpdateSchema,
  BatchDeleteSchema,
  type BatchUpdateInput,
  type BatchDeleteInput,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public } from '../auth';
import { ZodValidationPipe } from '../common';

@ApiTags('Memory')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'batch', version: '1' })
@UseGuards(ApiKeyGuard)
export class MemoryBatchController {
  constructor(private readonly memoryService: MemoryService) {}

  @Put()
  @ApiOperation({ summary: 'Batch update memories' })
  @ApiOkResponse({ description: 'Batch update completed' })
  async updateBatch(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(BatchUpdateSchema)) dto: BatchUpdateInput,
  ) {
    return this.memoryService.batchUpdate(apiKey.id, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Batch delete memories' })
  @ApiOkResponse({ description: 'Batch delete completed' })
  async deleteBatch(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(BatchDeleteSchema)) dto: BatchDeleteInput,
  ) {
    return this.memoryService.batchDelete(apiKey.id, dto);
  }
}
