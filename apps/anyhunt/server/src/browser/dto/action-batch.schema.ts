/**
 * Action Batch Schema - 批量动作
 *
 * [DEFINES]: ActionBatchSchema, ActionBatchInput, ActionBatchResponse
 * [USED_BY]: browser-session.controller.ts, browser-session.service.ts
 * [POS]: 批量动作执行的请求验证与响应结构
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { z } from 'zod';
import { ActionSchema } from './action.schema';
import type { ActionResponse } from './action.schema';

/** 批量动作请求 */
export const ActionBatchSchema = z.object({
  actions: z.array(ActionSchema).min(1).max(50),
  stopOnError: z.boolean().default(true),
});

export type ActionBatchInput = z.infer<typeof ActionBatchSchema>;

/** 批量动作响应 */
export interface ActionBatchResponse {
  success: boolean;
  results: ActionResponse[];
}
