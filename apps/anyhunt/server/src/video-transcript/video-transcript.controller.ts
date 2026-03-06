/**
 * [INPUT]: Session 鉴权用户的视频转写任务请求
 * [OUTPUT]: 任务创建/查询/列表/取消响应
 * [POS]: App Video Transcript API 控制器（/api/v1/app/video-transcripts）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { VideoTranscriptService } from './video-transcript.service';
import {
  createVideoTranscriptTaskSchema,
  listVideoTranscriptTasksQuerySchema,
  type CreateVideoTranscriptTaskDto,
  type ListVideoTranscriptTasksQuery,
} from './dto';

@ApiTags('Video Transcript')
@ApiSecurity('session')
@Controller({ path: 'app/video-transcripts', version: '1' })
export class VideoTranscriptController {
  constructor(
    private readonly videoTranscriptService: VideoTranscriptService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create video transcript task' })
  @ApiCreatedResponse({ description: 'Video transcript task created' })
  async createTask(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(createVideoTranscriptTaskSchema))
    dto: CreateVideoTranscriptTaskDto,
  ) {
    const task = await this.videoTranscriptService.createTask(user.id, dto.url);

    return {
      taskId: task.id,
      status: task.status,
    };
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get video transcript task by ID' })
  @ApiOkResponse({ description: 'Video transcript task detail' })
  async getTask(
    @CurrentUser() user: CurrentUserDto,
    @Param('taskId') taskId: string,
  ) {
    return this.videoTranscriptService.getTaskById(user.id, taskId);
  }

  @Get()
  @ApiOperation({ summary: 'List video transcript tasks' })
  @ApiOkResponse({ description: 'Video transcript task list' })
  async listTasks(
    @CurrentUser() user: CurrentUserDto,
    @Query(new ZodValidationPipe(listVideoTranscriptTasksQuerySchema))
    query: ListVideoTranscriptTasksQuery,
  ) {
    return this.videoTranscriptService.listTasks(
      user.id,
      query.page,
      query.limit,
    );
  }

  @Post(':taskId/cancel')
  @ApiOperation({ summary: 'Cancel video transcript task' })
  @ApiOkResponse({ description: 'Cancel result' })
  async cancelTask(
    @CurrentUser() user: CurrentUserDto,
    @Param('taskId') taskId: string,
  ) {
    return this.videoTranscriptService.cancelTask(user.id, taskId);
  }
}
