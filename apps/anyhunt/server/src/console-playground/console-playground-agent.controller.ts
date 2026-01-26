/**
 * Console Playground Agent Controller
 *
 * [INPUT]: apiKeyId + Agent 任务请求
 * [OUTPUT]: JSON（标准响应包装）或 SSE（`ai` 的 UIMessageChunk 协议）
 * [POS]: Console Playground Agent 代理入口（Session 认证；SSE 前会 fail-fast 校验 ApiKey LLM 策略）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { UIMessageChunk } from 'ai';
import { CurrentUser } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { CurrentUserDto } from '../types';
import { ConsolePlaygroundService } from './console-playground.service';
import {
  ApiKeyIdQuerySchema,
  ConsoleAgentTaskInputSchema,
  type ConsoleAgentTaskInputDto,
  AgentTaskIdParamSchema,
  type AgentTaskIdParamDto,
  type ApiKeyIdQueryDto,
} from './dto';
import {
  createConsoleAgentUiChunkMapperState,
  mapConsoleAgentEventToUiChunks,
} from './streaming/console-agent-ui-chunk.mapper';

@ApiTags('Console - Playground')
@ApiCookieAuth()
@Controller({ path: 'console/playground/agent', version: '1' })
export class ConsolePlaygroundAgentController {
  constructor(private readonly service: ConsolePlaygroundService) {}

  @Post('estimate')
  @ApiOperation({ summary: 'Estimate agent task cost (console proxy)' })
  @ApiOkResponse({ description: 'Cost estimate' })
  async estimate(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConsoleAgentTaskInputSchema))
    dto: ConsoleAgentTaskInputDto,
  ) {
    const { apiKeyId, ...input } = dto;
    return this.service.estimateAgentCost(user.id, apiKeyId, {
      ...input,
      stream: false,
    });
  }

  @Get('models')
  @ApiOperation({ summary: 'List available agent models (console proxy)' })
  @ApiOkResponse({ description: 'Available agent models' })
  async listModels(
    @CurrentUser() user: CurrentUserDto,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.service.listAgentModels(user.id, query.apiKeyId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create agent task (console proxy) - JSON',
  })
  @ApiOkResponse({ description: 'Task result' })
  async createTask(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConsoleAgentTaskInputSchema))
    dto: ConsoleAgentTaskInputDto,
  ) {
    const { apiKeyId, ...input } = dto;
    return this.service.executeAgentTask(user.id, apiKeyId, {
      ...input,
      stream: false,
    });
  }

  @Post('stream')
  @ApiOperation({ summary: 'Create agent task (console proxy) - SSE stream' })
  @ApiOkResponse({ description: 'SSE event stream' })
  async createTaskStream(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConsoleAgentTaskInputSchema))
    dto: ConsoleAgentTaskInputDto,
    @Res() res: Response,
  ): Promise<void> {
    const { apiKeyId, ...input } = dto;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let connectionClosed = false;
    let taskId: string | null = null;
    let finished = false;
    const mapperState = createConsoleAgentUiChunkMapperState();

    res.on('close', () => {
      connectionClosed = true;
      if (taskId) {
        void this.service
          .cancelAgentTask(user.id, apiKeyId, taskId)
          .catch(() => {});
      }
    });

    const sendChunk = (chunk: UIMessageChunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    };

    try {
      for await (const event of this.service.executeAgentTaskStream(
        user.id,
        apiKeyId,
        { ...input, stream: true },
      )) {
        if (event.type === 'started') {
          taskId = event.id;
          if (!connectionClosed) {
            sendChunk({
              type: 'start',
              messageId: taskId,
              messageMetadata: { expiresAt: event.expiresAt },
            });
          }
          continue;
        }

        if (connectionClosed) {
          continue;
        }

        for (const chunk of mapConsoleAgentEventToUiChunks(
          event,
          mapperState,
        )) {
          sendChunk(chunk);
        }

        if (
          (event.type === 'complete' || event.type === 'failed') &&
          !finished
        ) {
          finished = true;
          sendChunk({ type: 'finish' });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!connectionClosed) {
        for (const chunk of mapConsoleAgentEventToUiChunks(
          { type: 'failed', error: errorMessage },
          mapperState,
        )) {
          sendChunk(chunk);
        }
        if (!finished) {
          finished = true;
          sendChunk({ type: 'finish' });
        }
      }
    } finally {
      res.end();
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent task status (console proxy)' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiOkResponse({ description: 'Task status' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  async getTaskStatus(
    @CurrentUser() user: CurrentUserDto,
    @Param(new ZodValidationPipe(AgentTaskIdParamSchema))
    params: AgentTaskIdParamDto,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    const result = await this.service.getAgentTaskStatus(
      user.id,
      query.apiKeyId,
      params.id,
    );

    if (!result) {
      throw new HttpException(
        { message: 'Task not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel agent task (console proxy)' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiOkResponse({ description: 'Cancellation result' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  async cancelTask(
    @CurrentUser() user: CurrentUserDto,
    @Param(new ZodValidationPipe(AgentTaskIdParamSchema))
    params: AgentTaskIdParamDto,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    const result = await this.service.cancelAgentTask(
      user.id,
      query.apiKeyId,
      params.id,
    );

    if (result.status === 'not_found') {
      throw new HttpException(
        { code: 'TASK_NOT_FOUND', message: 'Task not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.status === 'invalid_status') {
      throw new HttpException(
        {
          code: 'TASK_STATUS_INVALID',
          message: `Cannot cancel task in '${result.currentStatus}' status`,
          details: {
            currentStatus: result.currentStatus,
            creditsUsed: result.creditsUsed,
          },
        },
        HttpStatus.CONFLICT,
      );
    }

    return { status: 'cancelled', creditsUsed: result.creditsUsed };
  }
}
