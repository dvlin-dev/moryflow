/**
 * [POS]: Memory Export API Controller (Mem0 V1 aligned)
 *
 * [INPUT]: Export DTOs
 * [OUTPUT]: Export job + export data
 */

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { MemoryService } from './memory.service';
import {
  ExportCreateResponseSchema,
  ExportCreateSchema,
  ExportGetResponseSchema,
  ExportGetSchema,
  type ExportCreateInput,
  type ExportGetInput,
} from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public } from '../auth';
import { zodSchemaToOpenApiSchema, ZodValidationPipe } from '../common';
import {
  DEFAULT_IDEMPOTENCY_TTL_SECONDS,
  IDEMPOTENCY_KEY_HEADER,
  IdempotencyExecutorService,
  IdempotencyKey,
} from '../idempotency';
import {
  describeObjectIdResponse,
  resolveMemoryRequestPath,
} from './utils/memory-http.utils';

@ApiTags('Memory')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'exports', version: '1' })
@UseGuards(ApiKeyGuard)
export class MemoryExportController {
  constructor(
    private readonly memoryService: MemoryService,
    private readonly idempotencyExecutor: IdempotencyExecutorService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create memory export' })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    required: true,
    description:
      'Required for write deduplication. Reusing the same key with the same payload returns the cached response.',
  })
  @ApiOkResponse({
    description: 'Export job created',
    schema: zodSchemaToOpenApiSchema(ExportCreateResponseSchema),
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or Idempotency-Key header missing',
  })
  @ApiConflictResponse({
    description:
      'Idempotency key reuse conflict or another request with the same key is still processing',
  })
  async create(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Req() request: Request,
    @IdempotencyKey() idempotencyKey: string,
    @Body(new ZodValidationPipe(ExportCreateSchema)) dto: ExportCreateInput,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: `${IDEMPOTENCY_KEY_HEADER} header is required`,
      });
    }

    if (!apiKey?.id) {
      throw new BadRequestException({
        code: 'API_KEY_CONTEXT_MISSING',
        message: 'Validated API key context is required',
      });
    }

    return this.idempotencyExecutor.execute({
      scope: `memox:memory-exports:create:${apiKey.id}`,
      idempotencyKey,
      method: request.method,
      path: resolveMemoryRequestPath(request),
      requestBody: dto,
      ttlSeconds: DEFAULT_IDEMPOTENCY_TTL_SECONDS,
      responseStatus: 200,
      execute: () => this.memoryService.createExport(apiKey.id, dto),
      describeResponse: (response) =>
        describeObjectIdResponse(response, 'memory_export'),
    });
  }

  @Post('get')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get memory export' })
  @ApiOkResponse({
    description: 'Export data returned',
    schema: zodSchemaToOpenApiSchema(ExportGetResponseSchema),
  })
  async get(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Body(new ZodValidationPipe(ExportGetSchema)) dto: ExportGetInput,
  ) {
    return this.memoryService.getExport(apiKey.id, dto);
  }
}
