/**
 * Network Schema - 网络拦截
 *
 * [DEFINES]: InterceptRuleSchema, SetInterceptRulesSchema, NetworkRequestRecord
 * [USED_BY]: browser-session.controller.ts, interceptor.service.ts
 * [POS]: 网络请求拦截的请求验证
 */

import { z } from 'zod';

/** Mock 响应 Schema */
const MockResponseSchema = z.object({
  status: z.number().int().min(100).max(599).default(200),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  contentType: z.string().default('application/json'),
});

/** 请求拦截规则 */
export const InterceptRuleSchema = z.object({
  /** 规则 ID（用于更新/删除） */
  id: z.string().optional(),
  /** URL 匹配模式（支持 glob） */
  urlPattern: z.string().max(500),
  /** 请求方法过滤 */
  method: z
    .enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
    .optional(),
  /** 修改请求头 */
  modifyHeaders: z.record(z.string(), z.string()).optional(),
  /** Mock 响应（如果设置，则不转发请求） */
  mockResponse: MockResponseSchema.optional(),
  /** 是否阻止请求 */
  block: z.boolean().default(false),
});

export type InterceptRule = z.infer<typeof InterceptRuleSchema>;

/** 设置拦截规则请求 */
export const SetInterceptRulesSchema = z.object({
  rules: z.array(InterceptRuleSchema).max(50),
});

export type SetInterceptRulesInput = z.infer<typeof SetInterceptRulesSchema>;

/** 网络请求记录 */
export interface NetworkRequestRecord {
  /** 请求 ID */
  id: string;
  /** 请求 URL */
  url: string;
  /** 请求方法 */
  method: string;
  /** 请求头 */
  headers: Record<string, string>;
  /** POST 数据（如果有） */
  postData?: string;
  /** 响应状态码 */
  status?: number;
  /** 响应头 */
  responseHeaders?: Record<string, string>;
  /** 是否被拦截 */
  intercepted: boolean;
  /** 时间戳 */
  timestamp: number;
}
