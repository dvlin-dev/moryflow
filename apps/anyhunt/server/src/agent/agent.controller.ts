/**
 * Agent Controller
 *
 * [INPUT]: HTTP 请求
 * [OUTPUT]: JSON 响应或 SSE 事件流
 * [POS]: L3 Agent API 入口，处理任务创建和状态查询（含用户上下文）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Res,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, Public } from '../auth';
import { ApiKeyGuard } from '../api-key';
import { AgentService } from './agent.service';
import { CreateAgentTaskSchema, type AgentStreamEvent } from './dto';
import type { CurrentUserDto } from '../types';

@ApiTags('Agent')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'agent', version: '1' })
@UseGuards(ApiKeyGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /**
   * 创建 Agent 任务
   * POST /api/v1/agent
   *
   * 默认返回 SSE 流；设置 stream=false 返回 JSON
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new Agent task',
    description:
      'Execute an AI agent task. Returns SSE stream by default, or JSON if stream=false.',
  })
  @ApiOkResponse({ description: 'Task result or SSE event stream' })
  async createTask(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const parseResult = CreateAgentTaskSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        {
          message: 'Invalid request body',
          errors: parseResult.error.issues,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const input = parseResult.data;

    if (!input.stream) {
      const result = await this.agentService.executeTask(input, user.id);
      res.json(result);
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    let connectionClosed = false;
    res.on('close', () => {
      connectionClosed = true;
    });

    const sendEvent = (event: AgentStreamEvent) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      for await (const event of this.agentService.executeTaskStream(
        input,
        user.id,
      )) {
        if (!connectionClosed) {
          sendEvent(event);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!connectionClosed) {
        sendEvent({
          type: 'failed',
          error: errorMessage,
        });
      }
    } finally {
      res.end();
    }
  }

  /**
   * 获取任务状态
   * GET /api/v1/agent/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get Agent task status' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiOkResponse({ description: 'Task status and result' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  async getTaskStatus(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') taskId: string,
  ) {
    const result = await this.agentService.getTaskStatus(taskId, user.id);

    if (!result) {
      throw new HttpException(
        { message: 'Task not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }

  /**
   * 估算任务成本（P1 计费模型优化）
   * POST /api/v1/agent/estimate
   */
  @Post('estimate')
  @ApiOperation({
    summary: 'Estimate task cost',
    description:
      'Estimate the credits cost for a task based on prompt length and URLs.',
  })
  @ApiOkResponse({
    description: 'Cost estimate with breakdown',
    schema: {
      type: 'object',
      properties: {
        estimatedCredits: { type: 'number' },
        breakdown: {
          type: 'object',
          properties: {
            base: { type: 'number' },
            tokenEstimate: { type: 'number' },
            toolCallEstimate: { type: 'number' },
            durationEstimate: { type: 'number' },
          },
        },
      },
    },
  })
  estimateCost(@Body() body: unknown) {
    const parseResult = CreateAgentTaskSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        {
          message: 'Invalid request body',
          errors: parseResult.error.issues,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.agentService.estimateCost(parseResult.data);
  }

  /**
   * 取消任务
   * DELETE /api/v1/agent/:id
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel an Agent task',
    description:
      'Cancel a running or pending task. Returns credits consumed before cancellation.',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiOkResponse({
    description: 'Cancellation result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        creditsUsed: { type: 'number' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Task not found' })
  async cancelTask(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') taskId: string,
  ) {
    const result = await this.agentService.cancelTask(taskId, user.id);

    if (!result.success && result.message === 'Task not found') {
      throw new HttpException(
        { message: 'Task not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }
}
