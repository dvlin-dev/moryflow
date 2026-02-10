/**
 * [INPUT]: Admin 会话请求（分页参数）
 * [OUTPUT]: 视频转写执行概览、资源/队列状态、任务列表
 * [POS]: Admin Video Transcript 可观测控制器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, RequireAdmin } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  listVideoTranscriptTasksQuerySchema,
  updateVideoTranscriptLocalEnabledSchema,
} from './dto';
import type {
  ListVideoTranscriptTasksQuery,
  UpdateVideoTranscriptLocalEnabledDto,
} from './dto';
import { VideoTranscriptAdminService } from './video-transcript-admin.service';
import type { CurrentUserDto } from '../types';

@ApiTags('Admin - Video Transcript')
@ApiSecurity('session')
@Controller({ path: 'admin/video-transcripts', version: '1' })
@RequireAdmin()
export class VideoTranscriptAdminController {
  constructor(
    private readonly videoTranscriptAdminService: VideoTranscriptAdminService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get video transcript overview metrics' })
  @ApiOkResponse({ description: 'Overview metrics' })
  async getOverview() {
    return this.videoTranscriptAdminService.getOverview();
  }

  @Get('resources')
  @ApiOperation({
    summary: 'Get local node resources, queues and budget usage',
  })
  @ApiOkResponse({ description: 'Resources and queue metrics' })
  async getResources() {
    return this.videoTranscriptAdminService.getResources();
  }

  @Get('config')
  @ApiOperation({ summary: 'Get video transcript runtime config and audits' })
  @ApiOkResponse({ description: 'Runtime config and recent audit logs' })
  async getConfig() {
    return this.videoTranscriptAdminService.getConfig();
  }

  @Put('config/local-enabled')
  @ApiOperation({ summary: 'Update local routing switch (runtime override)' })
  @ApiOkResponse({ description: 'Updated local routing switch snapshot' })
  async updateLocalEnabled(
    @CurrentUser() currentUser: CurrentUserDto,
    @Body(new ZodValidationPipe(updateVideoTranscriptLocalEnabledSchema))
    dto: UpdateVideoTranscriptLocalEnabledDto,
  ) {
    return this.videoTranscriptAdminService.updateLocalEnabled({
      actorUserId: currentUser.id,
      enabled: dto.enabled,
      reason: dto.reason,
    });
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get video transcript task list' })
  @ApiOkResponse({ description: 'Task list and pagination' })
  async getTasks(
    @Query(new ZodValidationPipe(listVideoTranscriptTasksQuerySchema))
    query: ListVideoTranscriptTasksQuery,
  ) {
    return this.videoTranscriptAdminService.getTasks(query.page, query.limit);
  }
}
