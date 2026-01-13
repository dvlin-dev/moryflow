/**
 * Agent Controller
 *
 * [INPUT]: HTTP 请求
 * [OUTPUT]: JSON 响应或 SSE 事件流
 * [POS]: L3 Agent API 入口，处理任务创建和状态查询
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiKeyGuard, CurrentApiKey } from '../api-key';
import type { ApiKeyPayload } from '../api-key';
import { AgentService } from './agent.service';
import { CreateAgentTaskSchema, type AgentStreamEvent } from './dto';

@Controller('agent')
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
  async createTask(
    @Body() body: unknown,
    @Res() res: Response,
    @CurrentApiKey() _apiKey: ApiKeyPayload,
  ): Promise<void> {
    // 验证输入
    const parseResult = CreateAgentTaskSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        {
          message: 'Invalid request body',
          errors: parseResult.error.errors,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const input = parseResult.data;

    // 非流式模式
    if (!input.stream) {
      const result = await this.agentService.executeTask(input);
      res.json(result);
      return;
    }

    // 流式模式（SSE）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲

    // 发送事件的辅助函数
    const sendEvent = (event: AgentStreamEvent) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      // 使用流式执行
      for await (const event of this.agentService.executeTaskStream(input)) {
        sendEvent(event);

        // 如果连接已关闭，停止发送
        if (res.writableEnded) {
          break;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      sendEvent({
        type: 'failed',
        error: errorMessage,
      });
    } finally {
      res.end();
    }
  }

  /**
   * 获取任务状态
   * GET /api/v1/agent/:id
   */
  @Get(':id')
  async getTaskStatus(
    @Param('id') taskId: string,
    @CurrentApiKey() _apiKey: ApiKeyPayload,
  ) {
    const result = this.agentService.getTaskStatus(taskId);

    if (!result) {
      throw new HttpException(
        { message: 'Task not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }
}
