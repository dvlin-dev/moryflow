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
import type { TaskStateService, TaskStatus } from './task-state';
import { TaskValidationError, isTaskValidationError } from './task-state';

// --- JSON Schema (model-facing) ---

const taskToolParameters: Exclude<ToolInputParameters, undefined> = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Brief summary of this tool call' },
    action: {
      type: 'string',
      enum: ['get', 'set', 'clear_done'],
      description:
        'get = read current checklist, set = replace checklist, clear_done = remove done items',
    },
    items: {
      type: 'array',
      description: 'Task items (required when action is set)',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Optional stable id to preserve across updates' },
          title: { type: 'string', description: 'Short task title' },
          status: {
            type: 'string',
            enum: ['todo', 'in_progress', 'done'],
            description: 'Task status: todo, in_progress, or done',
          },
          note: { type: 'string', description: 'Optional short note' },
        },
        required: ['title', 'status'],
        additionalProperties: false,
      },
    },
  },
  required: ['action'],
  additionalProperties: true,
};

// --- Zod schemas (runtime validation) ---

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

const taskInputSchema = z.object({
  summary: toolSummarySchema.default('task'),
  action: z.enum(['get', 'set', 'clear_done']),
  items: z.array(taskItemSchema).optional(),
});

type TaskInput = z.infer<typeof taskInputSchema>;

const parseTaskInput = (input: unknown): TaskInput => {
  const result = taskInputSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.length ? issue.path.join('.') : '';
    throw new TaskValidationError(
      path ? `${path}: ${issue?.message}` : (issue?.message ?? 'invalid task input')
    );
  }
  if (result.data.action === 'set' && !result.data.items) {
    throw new TaskValidationError('items is required when action is set');
  }
  return result.data;
};

// --- helpers ---

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

// --- tool ---

export const createTaskTool = (service: TaskStateService): Tool<AgentContext> =>
  tool({
    name: 'task',
    description: `Maintain a lightweight execution checklist for the current session (get/set/clear_done).`,
    parameters: taskToolParameters,
    strict: false,
    async execute(input, runContext?: RunContext<AgentContext>) {
      const context = requireChatId(runContext);
      if ('error' in context) {
        return context;
      }

      try {
        const parsed = parseTaskInput(input);
        switch (parsed.action) {
          case 'get':
            return await service.get(context.chatId);
          case 'set':
            return await service.set(context.chatId, parsed.items!);
          case 'clear_done':
            return await service.clearDone(context.chatId);
        }
      } catch (error) {
        return mapError(error);
      }
    },
  });
