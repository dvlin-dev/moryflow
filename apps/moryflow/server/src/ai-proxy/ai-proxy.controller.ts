/**
 * [INPUT]: OpenAI 兼容请求（Bearer access token）
 * [OUTPUT]: 模型列表与对话补全响应
 * [POS]: AI Proxy 控制器（/v1）
 *
 * 认证说明：
 * - 使用 access JWT（Authorization: Bearer <accessToken>）
 * - AuthGuard 验证 access token 并注入 user 到 request
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  UseFilters,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AiProxyService } from './ai-proxy.service';
import {
  ChatCompletionRequestSchema,
  type ChatCompletionRequest,
  type ModelsListResponse,
} from './dto';
import { CurrentUser } from '../auth/decorators';
import type { CurrentUserDto } from '../types/user.types';
import { setSSEHeaders, sendSSEError } from '../common';
import { AiProxyExceptionFilter, InvalidRequestException } from './exceptions';

@ApiTags('AI Proxy')
@ApiBearerAuth('bearer')
@Controller('v1')
@UseFilters(AiProxyExceptionFilter)
export class AiProxyController {
  private readonly logger = new Logger(AiProxyController.name);

  constructor(private readonly aiProxyService: AiProxyService) {}

  /**
   * GET /v1/models
   * 获取所有模型列表
   */
  @ApiOperation({
    summary: '获取模型列表',
    description: '获取所有可用的 AI 模型列表 (OpenAI 兼容格式)',
  })
  @ApiResponse({ status: 200, description: '模型列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  @Get('models')
  async listModels(
    @CurrentUser() user: CurrentUserDto,
  ): Promise<ModelsListResponse> {
    const models = await this.aiProxyService.getAllModelsWithAccess(user.tier);
    return {
      object: 'list',
      data: models,
    };
  }

  /**
   * POST /v1/chat/completions
   * Chat Completions（支持流式）
   */
  @ApiOperation({
    summary: 'Chat Completions',
    description: 'AI 对话补全 (OpenAI 兼容, 支持流式响应)',
  })
  @ApiResponse({ status: 200, description: '对话响应 (SSE 流式或 JSON)' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '模型权限不足' })
  @ApiResponse({ status: 429, description: '积分不足' })
  @Post('chat/completions')
  async chatCompletions(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: ChatCompletionRequest,
    @Res() res: Response,
  ): Promise<void> {
    // 验证请求
    const parsed = ChatCompletionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new InvalidRequestException(
        parsed.error.issues[0]?.message || 'Invalid request',
      );
    }

    if (parsed.data.stream) {
      await this.handleStreamResponse(user, parsed.data, res);
    } else {
      const response = await this.aiProxyService.proxyChatCompletion(
        user.id,
        user.tier,
        parsed.data,
      );
      res.json(response);
    }
  }

  /**
   * 处理流式响应
   */
  private async handleStreamResponse(
    user: CurrentUserDto,
    request: ChatCompletionRequest,
    res: Response,
  ): Promise<void> {
    setSSEHeaders(res);

    try {
      const abortController = new AbortController();
      const stream = await this.aiProxyService.proxyChatCompletionStream(
        user.id,
        user.tier,
        request,
        abortController.signal,
      );

      const reader = stream.getReader();
      let closed = false;

      const handleClose = () => {
        closed = true;
        abortController.abort();
        void reader.cancel();
      };

      res.on('close', handleClose);

      const writeChunk = async (value: Uint8Array): Promise<void> => {
        if (closed || res.writableEnded) {
          return;
        }

        if (!res.write(value)) {
          await new Promise<void>((resolve) => {
            res.once('drain', resolve);
            res.once('close', resolve);
          });
        }
      };

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        await writeChunk(value);
      }

      res.off('close', handleClose);

      if (!res.writableEnded) {
        res.end();
      }
    } catch (error) {
      this.logger.error('Stream error', error);

      // 如果响应还没有发送，抛出异常让 Filter 处理
      if (!res.headersSent) {
        throw error;
      }

      // 已经开始流式响应，发送 SSE 错误事件
      const errorMessage =
        error instanceof Error ? error.message : 'Stream error';
      sendSSEError(res, errorMessage);
    }
  }
}
