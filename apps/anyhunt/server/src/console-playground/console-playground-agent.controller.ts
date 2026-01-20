/**
 * Console Playground Agent Controller
 *
 * [INPUT]: apiKeyId + Agent 任务请求
 * [OUTPUT]: JSON（标准响应包装）或 SSE 流
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
import { CurrentUser } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { CurrentUserDto } from '../types';
import type { AgentStreamEvent } from '../agent/dto';
import { ConsolePlaygroundService } from './console-playground.service';
import {
  ApiKeyIdQuerySchema,
  ConsoleAgentTaskInputSchema,
  type ConsoleAgentTaskInputDto,
  AgentTaskIdParamSchema,
  type AgentTaskIdParamDto,
  type ApiKeyIdQueryDto,
} from './dto';

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

    res.on('close', () => {
      connectionClosed = true;
      if (taskId) {
        void this.service
          .cancelAgentTask(user.id, apiKeyId, taskId)
          .catch(() => {});
      }
    });

    const sendEvent = (event: AgentStreamEvent) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      for await (const event of this.service.executeAgentTaskStream(
        user.id,
        apiKeyId,
        { ...input, stream: true },
      )) {
        if (event.type === 'started') {
          taskId = event.id;
        }
        if (!connectionClosed) {
          sendEvent(event);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!connectionClosed) {
        sendEvent({ type: 'failed', error: errorMessage });
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

    if (!result.success && result.message === 'Task not found') {
      throw new HttpException(
        { message: 'Task not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }
}
