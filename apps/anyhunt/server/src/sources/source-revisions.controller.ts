/**
 * [POS]: Source revisions public API controller
 * [INPUT]: Source revision DTOs (snake_case)
 * [OUTPUT]: Source revision responses
 */

import {
  BadRequestException,
  Body,
  Controller,
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
  ApiResponse,
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
import { KnowledgeSourceRevisionService } from './knowledge-source-revision.service';
import {
  type CreateSourceRevisionInputDto,
  CreateSourceRevisionSchema,
} from './dto';
import {
  describeSourceObjectResponse,
  describeSourceRevisionResult,
  resolveSourcesRequestPath,
} from './sources-http.utils';
import {
  toFinalizedSourceRevisionResponse,
  toSourceRevisionResponse,
} from './sources-mappers.utils';

@ApiTags('SourceRevisions')
@ApiSecurity('apiKey')
@Public()
@Controller({ version: '1' })
@UseGuards(ApiKeyGuard)
export class SourceRevisionsController {
  constructor(
    private readonly sourceRevisionsService: KnowledgeSourceRevisionService,
    private readonly idempotencyExecutor: IdempotencyExecutorService,
  ) {}

  @Post('sources/:sourceId/revisions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a source revision' })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    required: true,
    description:
      'Required for write deduplication. Reusing the same key with the same payload returns the cached response.',
  })
  @ApiOkResponse({ description: 'Knowledge source revision created' })
  @ApiBadRequestResponse({
    description: 'Validation failed or Idempotency-Key header missing',
  })
  @ApiResponse({
    status: 413,
    description: 'Source content exceeds configured ingest limits',
  })
  @ApiConflictResponse({
    description:
      'Idempotency key reuse conflict or another request with the same key is still processing',
  })
  async createInlineRevision(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('sourceId') sourceId: string,
    @Req() request: Request,
    @IdempotencyKey() idempotencyKey: string,
    @Body(new ZodValidationPipe(CreateSourceRevisionSchema))
    dto: CreateSourceRevisionInputDto,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: `${IDEMPOTENCY_KEY_HEADER} header is required`,
      });
    }

    return this.idempotencyExecutor.execute({
      scope: `memox:sources:revisions:create:${apiKey.id}:${sourceId}`,
      idempotencyKey,
      method: request.method,
      path: resolveSourcesRequestPath(request),
      requestBody: dto,
      ttlSeconds: DEFAULT_IDEMPOTENCY_TTL_SECONDS,
      responseStatus: 200,
      execute: async () => {
        if (dto.mode === 'inline_text') {
          const revision =
            await this.sourceRevisionsService.createInlineTextRevision(
              apiKey.id,
              sourceId,
              {
                content: dto.content,
                mimeType: dto.mime_type,
              },
            );
          return toSourceRevisionResponse(revision);
        }

        const result =
          await this.sourceRevisionsService.createUploadBlobRevision(
            apiKey.id,
            sourceId,
            {
              mimeType: dto.mime_type,
              filename: dto.filename,
            },
          );
        return toSourceRevisionResponse(result.revision, result.uploadSession);
      },
      describeResponse: (response) =>
        describeSourceObjectResponse(response, 'source-revision'),
    });
  }

  @Get('sources/:sourceId/revisions/:revisionId')
  @ApiOperation({ summary: 'Get a source revision by ID' })
  @ApiOkResponse({ description: 'Knowledge source revision details' })
  async getById(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('sourceId') sourceId: string,
    @Param('revisionId') revisionId: string,
  ) {
    const revision = await this.sourceRevisionsService.getById(
      apiKey.id,
      sourceId,
      revisionId,
    );
    return toSourceRevisionResponse(revision);
  }

  @Get('source-revisions/:revisionId')
  @ApiOperation({ summary: 'Get a source revision status by revision ID' })
  @ApiOkResponse({ description: 'Knowledge source revision status details' })
  async getByRevisionId(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('revisionId') revisionId: string,
  ) {
    const revision = await this.sourceRevisionsService.getByRevisionId(
      apiKey.id,
      revisionId,
    );
    return toSourceRevisionResponse(revision);
  }

  @Post('source-revisions/:revisionId/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize a source revision' })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    required: true,
    description:
      'Required for write deduplication. Reusing the same key with the same payload returns the cached response.',
  })
  @ApiOkResponse({ description: 'Knowledge source revision finalized' })
  @ApiResponse({
    status: 409,
    description: 'Upload window expired or revision lifecycle conflict',
  })
  @ApiResponse({
    status: 413,
    description: 'Finalized source content exceeds size/token/chunk limits',
  })
  @ApiResponse({
    status: 429,
    description: 'Finalize request rate limit exceeded',
  })
  @ApiResponse({
    status: 503,
    description: 'Concurrent source processing slots exhausted',
  })
  async finalize(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('revisionId') revisionId: string,
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
      scope: `memox:sources:revisions:finalize:${apiKey.id}:${revisionId}`,
      idempotencyKey,
      method: request.method,
      path: resolveSourcesRequestPath(request),
      requestBody: { revision_id: revisionId },
      ttlSeconds: DEFAULT_IDEMPOTENCY_TTL_SECONDS,
      responseStatus: 200,
      execute: async () =>
        toFinalizedSourceRevisionResponse(
          await this.sourceRevisionsService.finalize(apiKey.id, revisionId),
        ),
      describeResponse: describeSourceRevisionResult,
    });
  }

  @Post('source-revisions/:revisionId/reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reindex a source revision' })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    required: true,
    description:
      'Required for write deduplication. Reusing the same key with the same payload returns the cached response.',
  })
  @ApiOkResponse({ description: 'Knowledge source revision reindexed' })
  @ApiResponse({
    status: 413,
    description: 'Reindexed source content exceeds size/token/chunk limits',
  })
  @ApiResponse({
    status: 429,
    description: 'Reindex request rate limit exceeded',
  })
  @ApiResponse({
    status: 503,
    description: 'Concurrent source processing slots exhausted',
  })
  async reindex(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('revisionId') revisionId: string,
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
      scope: `memox:sources:revisions:reindex:${apiKey.id}:${revisionId}`,
      idempotencyKey,
      method: request.method,
      path: resolveSourcesRequestPath(request),
      requestBody: { revision_id: revisionId },
      ttlSeconds: DEFAULT_IDEMPOTENCY_TTL_SECONDS,
      responseStatus: 200,
      execute: async () =>
        toFinalizedSourceRevisionResponse(
          await this.sourceRevisionsService.reindex(apiKey.id, revisionId),
        ),
      describeResponse: describeSourceRevisionResult,
    });
  }
}
