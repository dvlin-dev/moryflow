/**
 * CDP Schema - Chrome DevTools Protocol 连接
 *
 * [DEFINES]: ConnectCdpSchema, CdpSessionInfo
 * [USED_BY]: browser-session.controller.ts, session.manager.ts
 * [POS]: CDP 连接的请求验证
 */

import { z } from 'zod';
import type { SessionInfo } from './types';

/** CDP 连接请求 */
export const ConnectCdpSchema = z.object({
  /** WebSocket 端点 URL（优先使用） */
  wsEndpoint: z.string().url().optional(),
  /** CDP 端口（使用 HTTP 获取 wsEndpoint） */
  port: z.number().int().min(1).max(65535).optional(),
  /** 连接超时时间（毫秒） */
  timeout: z.number().int().min(1000).max(60000).default(30000),
});

export const ConnectCdpSchemaRefined = ConnectCdpSchema.superRefine(
  (value, ctx) => {
    if (!value.wsEndpoint && !value.port) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wsEndpoint'],
        message: 'wsEndpoint or port is required',
      });
    }
  },
);

export type ConnectCdpInput = z.infer<typeof ConnectCdpSchema>;

/** CDP 会话信息 */
export interface CdpSessionInfo extends SessionInfo {
  /** 是否为 CDP 连接 */
  isCdpConnection: true;
  /** WebSocket 端点 */
  wsEndpoint: string;
}
