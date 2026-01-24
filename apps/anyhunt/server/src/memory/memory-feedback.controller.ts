/**
 * [POS]: Memory Feedback API Controller (Mem0 V1 aligned)
 *
 * [INPUT]: Feedback DTO
 * [OUTPUT]: Feedback result
 */

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiOkResponse,
} from '@nestjs/swagger';
import { MemoryService } from './memory.service';
import { FeedbackSchema, type FeedbackInput } from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public } from '../auth';
import { ZodValidationPipe } from '../common';

@ApiTags('Memory')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'feedback', version: '1' })
@UseGuards(ApiKeyGuard)
export class MemoryFeedbackController {
  constructor(private readonly memoryService: MemoryService) {}

  @Post()
  @ApiOperation({ summary: 'Submit memory feedback' })
  @ApiOkResponse({ description: 'Feedback recorded' })
  async create(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(FeedbackSchema)) dto: FeedbackInput,
  ) {
    return this.memoryService.feedback(apiKey.id, dto);
  }
}
