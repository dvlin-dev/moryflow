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
  Put,
  Query,
  Req,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import { Public } from '../auth';
import { InternalServiceTenantGuard } from '../common/guards';
import { ZodValidationPipe } from '../common';
import {
  DEFAULT_IDEMPOTENCY_TTL_SECONDS,
  IDEMPOTENCY_KEY_HEADER,
  IdempotencyExecutorService,
  IdempotencyKey,
} from '../idempotency';
import { KnowledgeSourceDeletionService } from './knowledge-source-deletion.service';
import { KnowledgeSourceRevisionService } from './knowledge-source-revision.service';
import { KnowledgeSourceService } from './knowledge-source.service';
import {
  type CreateSourceRevisionInputDto,
  CreateSourceRevisionSchema,
  type LookupSourceIdentityInputDto,
  LookupSourceIdentitySchema,
  type ResolveSourceIdentityInputDto,
  ResolveSourceIdentitySchema,
} from './dto';
import {
  describeSourceObjectResponse,
  describeSourceRevisionResult,
  resolveSourcesRequestPath,
} from './sources-http.utils';
import {
  toFinalizedSourceRevisionResponse,
  toSourceIdentityResponse,
  toSourceResponse,
  toSourceRevisionResponse,
} from './sources-mappers.utils';

@ApiExcludeController()
@Public()
@UseGuards(InternalServiceTenantGuard)
@Controller({
  path: 'internal/memox',
  version: VERSION_NEUTRAL,
})
export class InternalMemoxWriteController {
  constructor(
    private readonly sourcesService: KnowledgeSourceService,
    private readonly sourceDeletionService: KnowledgeSourceDeletionService,
    private readonly sourceRevisionsService: KnowledgeSourceRevisionService,
    private readonly idempotencyExecutor: IdempotencyExecutorService,
  ) {}

  @Get('source-identities/:sourceType/:externalId')
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

  @Put('source-identities/:sourceType/:externalId')
  @HttpCode(HttpStatus.OK)
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
      scope: `internal:memox:source-identities:resolve:${apiKey.id}:${sourceType}:${externalId}`,
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

  @Post('sources/:sourceId/revisions')
  @HttpCode(HttpStatus.OK)
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
      scope: `internal:memox:sources:revisions:create:${apiKey.id}:${sourceId}`,
      idempotencyKey,
      method: request.method,
      path: resolveSourcesRequestPath(request),
      requestBody: dto,
      ttlSeconds: DEFAULT_IDEMPOTENCY_TTL_SECONDS,
      responseStatus: 200,
      retryFailedResponseStatusesGte: 500,
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

  @Post('source-revisions/:revisionId/finalize')
  @HttpCode(HttpStatus.OK)
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
      scope: `internal:memox:sources:revisions:finalize:${apiKey.id}:${revisionId}`,
      idempotencyKey,
      method: request.method,
      path: resolveSourcesRequestPath(request),
      requestBody: { revision_id: revisionId },
      ttlSeconds: DEFAULT_IDEMPOTENCY_TTL_SECONDS,
      responseStatus: 200,
      retryFailedResponseStatusesGte: 500,
      execute: async () =>
        toFinalizedSourceRevisionResponse(
          await this.sourceRevisionsService.finalize(apiKey.id, revisionId, {
            bypassFinalizeWindow: true,
          }),
        ),
      describeResponse: describeSourceRevisionResult,
    });
  }

  @Delete('sources/:sourceId')
  @HttpCode(HttpStatus.OK)
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
      scope: `internal:memox:sources:delete:${apiKey.id}:${sourceId}`,
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
