/**
 * Agent Controller
 *
 * [INPUT]: HTTP 请求
 * [OUTPUT]: JSON 响应或 AI SDK UI stream
 * [POS]: L3 Agent API 入口，处理任务创建和状态查询（含用户上下文与 taskId 参数校验）
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
  ApiConflictResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Response as ExpressResponse } from 'express';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { RunStreamEvent } from '@openai/agents-core';
import { createAiSdkUiMessageStreamResponse } from '@openai/agents-extensions/ai-sdk-ui';
import { CurrentUser, Public } from '../auth';
import { ApiKeyGuard } from '../api-key';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AgentService } from './agent.service';
import { AgentModelService } from './agent-model.service';
import {
  AgentTaskIdParamSchema,
  type AgentTaskIdParamDto,
  CreateAgentTaskSchema,
} from './dto';
import type { CurrentUserDto } from '../types';

type CreateAiSdkUiMessageStreamResponseFn = (
  source: AsyncIterable<RunStreamEvent>,
) => globalThis.Response;

const createAiSdkUiMessageStreamResponseSafe =
  createAiSdkUiMessageStreamResponse as CreateAiSdkUiMessageStreamResponseFn;

@ApiTags('Agent')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'agent', version: '1' })
@UseGuards(ApiKeyGuard)
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly agentModelService: AgentModelService,
  ) {}

  /**
   * 创建 Agent 任务
   * POST /api/v1/agent
   *
   * 默认返回 AI SDK UI stream；设置 stream=false 返回 JSON
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new Agent task',
    description:
      'Execute an AI agent task. Returns AI SDK UI stream by default, or JSON if stream=false.',
  })
  @ApiOkResponse({ description: 'Task result or SSE event stream' })
  async createTask(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: unknown,
    @Res() res: ExpressResponse,
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

    const streamAbortController = new AbortController();
    res.on('close', () => {
      if (!streamAbortController.signal.aborted) {
        streamAbortController.abort();
      }
    });

    const runEventStream = this.agentService.executeTaskStream(
      input,
      user.id,
      streamAbortController.signal,
    );
    const response = createAiSdkUiMessageStreamResponseSafe(runEventStream);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    // 显式关闭反向代理缓冲（如 nginx/1panel），确保流式分片实时下发。
    res.setHeader('X-Accel-Buffering', 'no');

    if (!response.body) {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb(
      response.body as unknown as NodeReadableStream<Uint8Array>,
    );
    nodeStream.on('error', () => {
      if (!res.writableEnded) {
        res.end();
      }
    });
    nodeStream.pipe(res);
  }

  /**
   * 获取可用 Agent 模型列表
   * GET /api/v1/agent/models
   */
  @Get('models')
  @ApiOperation({ summary: 'List available Agent models' })
  @ApiOkResponse({ description: 'Agent model list' })
  async listModels() {
    return this.agentModelService.listModels();
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
    @Param(new ZodValidationPipe(AgentTaskIdParamSchema))
    params: AgentTaskIdParamDto,
  ) {
    const result = await this.agentService.getTaskStatus(params.id, user.id);

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
        status: { type: 'string', enum: ['cancelled'] },
        creditsUsed: { type: 'number' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiConflictResponse({ description: 'Task cannot be cancelled' })
  async cancelTask(
    @CurrentUser() user: CurrentUserDto,
    @Param(new ZodValidationPipe(AgentTaskIdParamSchema))
    params: AgentTaskIdParamDto,
  ) {
    const result = await this.agentService.cancelTask(params.id, user.id);

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
