/**
 * [POS]: Source identity resolve/upsert public API controller
 * [INPUT]: Source identity DTOs (snake_case)
 * [OUTPUT]: Stable source identity response
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
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
import { KnowledgeSourceService } from './knowledge-source.service';
import {
  type LookupSourceIdentityInputDto,
  LookupSourceIdentitySchema,
  type ResolveSourceIdentityInputDto,
  ResolveSourceIdentitySchema,
} from './dto';
import {
  describeSourceObjectResponse,
  resolveSourcesRequestPath,
} from './sources-http.utils';
import { toSourceIdentityResponse } from './sources-mappers.utils';

@ApiTags('Sources')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'source-identities', version: '1' })
@UseGuards(ApiKeyGuard)
export class SourceIdentitiesController {
  constructor(
    private readonly sourcesService: KnowledgeSourceService,
    private readonly idempotencyExecutor: IdempotencyExecutorService,
  ) {}

  @Get(':sourceType/:externalId')
  @ApiOperation({ summary: 'Get a knowledge source identity' })
  @ApiOkResponse({ description: 'Knowledge source identity found' })
  @ApiNotFoundResponse({ description: 'Knowledge source identity not found' })
  @ApiConflictResponse({
    description: 'Stored scope mismatch or deleted identity pending cleanup',
  })
  async getIdentity(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Param('sourceType') sourceType: string,
    @Param('externalId') externalId: string,
    @Query(new ZodValidationPipe(LookupSourceIdentitySchema))
    query: LookupSourceIdentityInputDto,
  ) {
    return toSourceIdentityResponse(
      await this.sourcesService.getIdentity(apiKey.id, sourceType, externalId, {
        userId: query.user_id,
        agentId: query.agent_id,
        appId: query.app_id,
        runId: query.run_id,
        orgId: query.org_id,
        projectId: query.project_id,
      }),
    );
  }

  @Put(':sourceType/:externalId')
  @ApiOperation({ summary: 'Resolve or upsert a knowledge source identity' })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    required: true,
    description:
      'Required for write deduplication. Reusing the same key with the same payload returns the cached response.',
  })
  @ApiOkResponse({ description: 'Knowledge source identity resolved' })
  @ApiBadRequestResponse({
    description: 'Validation failed or Idempotency-Key header missing',
  })
  @ApiConflictResponse({
    description:
      'Idempotency key reuse conflict or another request with the same key is still processing',
  })
  async resolveIdentity(
    @CurrentApiKey() apiKey: ApiKeyValidationResult,
    @Req() request: Request,
    @IdempotencyKey() idempotencyKey: string,
    @Param('sourceType') sourceType: string,
    @Param('externalId') externalId: string,
    @Body(new ZodValidationPipe(ResolveSourceIdentitySchema))
    dto: ResolveSourceIdentityInputDto,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: `${IDEMPOTENCY_KEY_HEADER} header is required`,
      });
    }

    return this.idempotencyExecutor.execute({
      scope: `memox:source-identities:resolve:${apiKey.id}:${sourceType}:${externalId}`,
      idempotencyKey,
      method: request.method,
      path: resolveSourcesRequestPath(request),
      requestBody: {
        source_type: sourceType,
        external_id: externalId,
        ...dto,
      },
      ttlSeconds: DEFAULT_IDEMPOTENCY_TTL_SECONDS,
      responseStatus: 200,
      retryFailedResponseStatusesGte: 500,
      execute: async () =>
        toSourceIdentityResponse(
          await this.sourcesService.resolveIdentity(
            apiKey.id,
            sourceType,
            externalId,
            {
              title: dto.title,
              userId: dto.user_id,
              agentId: dto.agent_id,
              appId: dto.app_id,
              runId: dto.run_id,
              orgId: dto.org_id,
              projectId: dto.project_id,
              displayPath: dto.display_path,
              mimeType: dto.mime_type,
              metadata: dto.metadata,
            },
          ),
        ),
      describeResponse: (response) =>
        describeSourceObjectResponse(response, 'source'),
    });
  }
}
