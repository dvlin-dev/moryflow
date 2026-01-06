/**
 * HTTP Utilities
 * 通用 HTTP 响应工具函数
 */

import type { Response } from 'express';

/**
 * SSE (Server-Sent Events) 响应头配置
 */
export interface SSEHeaderOptions {
  /** 禁用 nginx 代理缓冲，默认 true */
  disableNginxBuffering?: boolean;
}

/**
 * 设置 SSE 响应头
 *
 * 用于流式响应（如 AI chat completions）
 *
 * @example
 * ```typescript
 * setSSEHeaders(res);
 * res.write('data: {"text": "Hello"}\n\n');
 * res.end();
 * ```
 */
export function setSSEHeaders(
  res: Response,
  options: SSEHeaderOptions = {},
): void {
  const { disableNginxBuffering = true } = options;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (disableNginxBuffering) {
    res.setHeader('X-Accel-Buffering', 'no');
  }
}

/**
 * 发送 SSE 数据事件
 *
 * @example
 * ```typescript
 * sendSSEData(res, { text: "Hello" });
 * // 发送: data: {"text":"Hello"}\n\n
 * ```
 */
export function sendSSEData(res: Response, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * 发送 SSE 错误事件并结束响应
 */
export function sendSSEError(res: Response, message: string): void {
  res.write(`data: ${JSON.stringify({ error: { message } })}\n\n`);
  res.end();
}

/**
 * 发送 SSE [DONE] 事件（OpenAI 兼容格式）
 */
export function sendSSEDone(res: Response): void {
  res.write('data: [DONE]\n\n');
  res.end();
}
