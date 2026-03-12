/**
 * [PROVIDES]: createTaskTool - 轻量 task 工具
 * [DEPENDS]: agents-core, agents-runtime, task-state
 * [POS]: 单一 `task` 工具实现入口，供平台 toolset builder 注入
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { tool, type RunContext, type Tool, type ToolInputParameters } from '@openai/agents-core';
import { z } from 'zod';
import type { AgentContext } from '@moryflow/agents-runtime';
import { toolSummarySchema } from '../shared';
import type { TaskItemInput, TaskStateService, TaskStatus } from './task-state';
import { TaskValidationError, isTaskValidationError } from './task-state';

const rawTaskActionParser = z
  .object({
    summary: z.unknown().optional(),
    action: z.unknown().optional(),
    items: z.unknown().optional(),
  })
  .passthrough();

const taskToolParameters: Exclude<ToolInputParameters, undefined> = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    action: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          note: { type: 'string' },
        },
        required: [] as string[],
        additionalProperties: true,
      },
    },
  },
  required: [] as string[],
  additionalProperties: true,
};

const taskStatusSchema = z.enum(['todo', 'in_progress', 'done'] satisfies readonly [
  TaskStatus,
  ...TaskStatus[],
]);

const taskItemSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string(),
  status: taskStatusSchema,
  note: z.string().optional(),
});

type TaskAction = 'get' | 'set' | 'clear_done';

type ParsedTaskToolInput = {
  summary: string;
  action: TaskAction;
  items?: TaskItemInput[];
};

const parseTaskToolInput = (input: unknown): ParsedTaskToolInput => {
  const raw = rawTaskActionParser.safeParse(input);
  if (!raw.success) {
    throw new TaskValidationError('task input must be an object');
  }

  const summaryResult = toolSummarySchema.safeParse(raw.data.summary ?? 'task');
  if (!summaryResult.success) {
    throw new TaskValidationError('summary must be a non-empty string up to 80 characters');
  }
  const summary = summaryResult.data;
  const action = raw.data.action;
  if (action !== 'get' && action !== 'set' && action !== 'clear_done') {
    throw new TaskValidationError('action must be one of get, set, clear_done');
  }

  let items: TaskItemInput[] | undefined;
  if (raw.data.items !== undefined) {
    const parsedItems = z.array(taskItemSchema).safeParse(raw.data.items);
    if (!parsedItems.success) {
      throw new TaskValidationError('items must be an array of task items');
    }
    items = parsedItems.data;
  }

  if (action === 'set' && !items) {
    throw new TaskValidationError('items is required when action is set');
  }
  if (action !== 'set' && items !== undefined) {
    throw new TaskValidationError('items is only allowed when action is set');
  }

  return {
    summary,
    action,
    ...(items ? { items } : {}),
  };
};

const requireChatId = (
  runContext?: RunContext<AgentContext>
): { chatId: string } | { error: 'missing_context' } => {
  const chatId = runContext?.context?.chatId;
  if (!chatId) {
    return { error: 'missing_context' };
  }
  return { chatId };
};

const mapError = (error: unknown) => {
  if (isTaskValidationError(error)) {
    return { error: 'validation_error' as const, message: error.message };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { error: 'runtime_error' as const, message };
};

export const createTaskTool = (service: TaskStateService): Tool<AgentContext> =>
  tool({
    name: 'task',
    description: '维护当前会话的轻量执行清单（get/set/clear_done）。',
    parameters: taskToolParameters,
    strict: false,
    async execute(input, runContext?: RunContext<AgentContext>) {
      const context = requireChatId(runContext);
      if ('error' in context) {
        return context;
      }

      try {
        const parsed = parseTaskToolInput(input);
        switch (parsed.action) {
          case 'get':
            return await service.get(context.chatId);
          case 'set':
            return await service.set(context.chatId, parsed.items ?? []);
          case 'clear_done':
            return await service.clearDone(context.chatId);
        }
      } catch (error) {
        return mapError(error);
      }
    },
  });
