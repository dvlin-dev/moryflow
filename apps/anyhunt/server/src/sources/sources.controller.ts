/**
 * [POS]: Sources public API controller
 * [INPUT]: Source DTOs (snake_case)
 * [OUTPUT]: Source identity responses
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { ZodValidationPipe } from '../common';
import {
  DEFAULT_IDEMPOTENCY_TTL_SECONDS,
  IDEMPOTENCY_KEY_HEADER,
  IdempotencyExecutorService,
  IdempotencyKey,
} from '../idempotency';
import { KnowledgeSourceDeletionService } from './knowledge-source-deletion.service';
import { KnowledgeSourceService } from './knowledge-source.service';
import {
  type CreateKnowledgeSourceInputDto,
  CreateKnowledgeSourceSchema,
} from './dto';
import {
  describeSourceObjectResponse,
  resolveSourcesRequestPath,
} from './sources-http.utils';
import { toSourceResponse } from './sources-mappers.utils';

@ApiTags('Sources')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'sources', version: '1' })
@UseGuards(ApiKeyGuard)
export class SourcesController {
  constructor(
    private readonly sourcesService: KnowledgeSourceService,
    private readonly sourceDeletionService: KnowledgeSourceDeletionService,
    private readonly idempotencyExecutor: IdempotencyExecutorService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a knowledge source identity' })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    required: true,
    description:
      'Required for write deduplication. Reusing the same key with the same payload returns the cached response.',
  })
  @ApiOkResponse({ description: 'Knowledge source created' })
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
    @Body(new ZodValidationPipe(CreateKnowledgeSourceSchema))
    dto: CreateKnowledgeSourceInputDto,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: `${IDEMPOTENCY_KEY_HEADER} header is required`,
      });
    }

    return this.idempotencyExecutor.execute({
      scope: `memox:sources:create:${apiKey.id}`,
      idempotencyKey,
      method: request.method,
      path: resolveSourcesRequestPath(request),
      requestBody: dto,
      ttlSeconds: DEFAULT_IDEMPOTENCY_TTL_SECONDS,
      responseStatus: 200,
      execute: async () => {
        const source = await this.sourcesService.create(apiKey.id, {
          sourceType: dto.source_type,
          externalId: dto.external_id,
          userId: dto.user_id,
          agentId: dto.agent_id,
          appId: dto.app_id,
          runId: dto.run_id,
          orgId: dto.org_id,
          projectId: dto.project_id,
          title: dto.title,
          displayPath: dto.display_path,
          mimeType: dto.mime_type,
          metadata: dto.metadata,
        });
        return toSourceResponse(source);
      },
      describeResponse: (response) =>
        describeSourceObjectResponse(response, 'source'),
    });
  }

  @Get(':sourceId')
  @ApiOperation({ summary: 'Get a knowledge source by ID' })
  @ApiOkResponse({ description: 'Knowledge source details' })
  async getById(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('sourceId') sourceId: string,
  ) {
    const source = await this.sourcesService.getById(apiKey.id, sourceId);
    return toSourceResponse(source);
  }

  @Delete(':sourceId')
  @ApiOperation({ summary: 'Delete a knowledge source' })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    required: true,
    description:
      'Required for write deduplication. Reusing the same key with the same payload returns the cached response.',
  })
  @ApiOkResponse({ description: 'Knowledge source deletion scheduled' })
  @ApiBadRequestResponse({
    description: 'Validation failed or Idempotency-Key header missing',
  })
  @ApiConflictResponse({
    description:
      'Idempotency key reuse conflict or another request with the same key is still processing',
  })
  async delete(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('sourceId') sourceId: string,
    @Req() request: Request,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: `${IDEMPOTENCY_KEY_HEADER} header is required`,
      });
    }

    return this.idempotencyExecutor.execute({
      scope: `memox:sources:delete:${apiKey.id}:${sourceId}`,
      idempotencyKey,
      method: request.method,
      path: resolveSourcesRequestPath(request),
      requestBody: { source_id: sourceId },
      ttlSeconds: DEFAULT_IDEMPOTENCY_TTL_SECONDS,
      responseStatus: 200,
      execute: async () =>
        toSourceResponse(
          await this.sourceDeletionService.requestDelete(apiKey.id, sourceId),
        ),
      describeResponse: (response) =>
        describeSourceObjectResponse(response, 'source'),
    });
  }
}
