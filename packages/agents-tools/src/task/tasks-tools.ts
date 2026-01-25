/**
 * [PROVIDES]: createTasksTools - Tasks 工具集（tasks_*）
 * [DEPENDS]: agents-core, agents-runtime, tasks-store
 * [POS]: tasks_* 工具实现入口，供 createBaseTools 注入
 * [UPDATE]: 2026-01-25 - 工具调用显式传递 chatId，mermaid label 安全化
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { tool, type RunContext, type Tool } from '@openai/agents-core';
import { z } from 'zod';
import type { AgentContext } from '@anyhunt/agents-runtime';
import { toolSummarySchema } from '../shared';
import type {
  TasksStore,
  ListTasksQuery,
  CreateTaskInput,
  UpdateTaskInput,
  SetStatusInput,
  AddNoteInput,
  AddFilesInput,
} from './tasks-store';

const taskStatusSchema = z.enum([
  'todo',
  'in_progress',
  'blocked',
  'done',
  'failed',
  'cancelled',
  'archived',
]);
const taskPrioritySchema = z.enum(['p0', 'p1', 'p2', 'p3']);

const requireContext = (
  runContext?: RunContext<AgentContext>
): { chatId: string; vaultRoot: string } | { error: string } => {
  const chatId = runContext?.context?.chatId;
  const vaultRoot = runContext?.context?.vaultRoot;
  if (!chatId || !vaultRoot) {
    return { error: 'missing_context' };
  }
  return { chatId, vaultRoot };
};

const mapError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return { error: message };
};

const MERMAID_LABEL_LIMIT = 120;

const sanitizeMermaidLabel = (value: string): string => {
  const normalized = value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\[/g, ' ')
    .replace(/\]/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return 'Untitled';
  if (normalized.length <= MERMAID_LABEL_LIMIT) return normalized;
  return `${normalized.slice(0, MERMAID_LABEL_LIMIT - 3)}...`;
};

export const createTasksTools = (store: TasksStore): Tool<AgentContext>[] => {
  const tasksList = tool({
    name: 'tasks_list',
    description: '列出当前会话的任务列表。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_list'),
      status: z.array(taskStatusSchema).optional(),
      priority: z.array(taskPrioritySchema).optional(),
      owner: z.string().nullable().optional(),
      search: z.string().optional(),
      includeArchived: z.boolean().optional(),
    }),
    async execute(input: ListTasksQuery, runContext?: RunContext<AgentContext>) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        const tasks = await store.listTasks(context.chatId, input);
        return { tasks };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  const tasksGet = tool({
    name: 'tasks_get',
    description: '查看任务详情（含依赖/备注/文件）。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_get'),
      taskId: z.string().min(1),
    }),
    async execute({ taskId }, runContext?: RunContext<AgentContext>) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        const task = await store.getTask(context.chatId, taskId);
        if (!task) return { error: 'not_found' };
        const dependencies = await store.listDependencies(context.chatId, taskId);
        const notes = await store.listNotes(context.chatId, taskId);
        const files = await store.listFiles(context.chatId, taskId);
        return { task, dependencies, notes, files };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  const tasksCreate = tool({
    name: 'tasks_create',
    description: '创建任务。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_create'),
      title: z.string().min(1),
      description: z.string().default(''),
      priority: taskPrioritySchema.default('p2'),
      owner: z.string().nullable().optional(),
      dependencies: z.array(z.string().min(1)).optional(),
    }),
    async execute(input: CreateTaskInput, runContext?: RunContext<AgentContext>) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        const task = await store.createTask(context.chatId, input);
        return { task };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  const tasksUpdate = tool({
    name: 'tasks_update',
    description: '更新任务属性。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_update'),
      taskId: z.string().min(1),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: taskPrioritySchema.optional(),
      owner: z.string().nullable().optional(),
      expectedVersion: z.number().int().min(1),
    }),
    async execute(
      { taskId, ...input }: UpdateTaskInput & { taskId: string },
      runContext?: RunContext<AgentContext>
    ) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        const task = await store.updateTask(context.chatId, taskId, input);
        return { task };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  const tasksSetStatus = tool({
    name: 'tasks_set_status',
    description: '更新任务状态。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_set_status'),
      taskId: z.string().min(1),
      status: taskStatusSchema,
      reason: z.string().optional(),
      statusSummary: z.string().optional(),
      expectedVersion: z.number().int().min(1),
    }),
    async execute(
      {
        taskId,
        statusSummary,
        ...input
      }: Omit<SetStatusInput, 'summary'> & {
        taskId: string;
        statusSummary?: string;
      },
      runContext?: RunContext<AgentContext>
    ) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        const task = await store.setStatus(context.chatId, taskId, {
          ...input,
          summary: statusSummary,
        });
        return { task };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  const tasksAddDependency = tool({
    name: 'tasks_add_dependency',
    description: '添加任务依赖。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_add_dependency'),
      taskId: z.string().min(1),
      dependsOn: z.string().min(1),
    }),
    async execute({ taskId, dependsOn }, runContext?: RunContext<AgentContext>) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        await store.addDependency(context.chatId, taskId, dependsOn);
        return { success: true };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  const tasksRemoveDependency = tool({
    name: 'tasks_remove_dependency',
    description: '移除任务依赖。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_remove_dependency'),
      taskId: z.string().min(1),
      dependsOn: z.string().min(1),
    }),
    async execute({ taskId, dependsOn }, runContext?: RunContext<AgentContext>) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        await store.removeDependency(context.chatId, taskId, dependsOn);
        return { success: true };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  const tasksAddNote = tool({
    name: 'tasks_add_note',
    description: '追加任务备注。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_add_note'),
      taskId: z.string().min(1),
      body: z.string().min(1),
      author: z.string().min(1),
    }),
    async execute(
      { taskId, ...input }: AddNoteInput & { taskId: string },
      runContext?: RunContext<AgentContext>
    ) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        const note = await store.addNote(context.chatId, taskId, input);
        return { note };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  const tasksAddFiles = tool({
    name: 'tasks_add_files',
    description: '关联任务文件。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_add_files'),
      taskId: z.string().min(1),
      files: z.array(
        z.object({
          path: z.string().min(1),
          role: z.enum(['input', 'output', 'reference']),
        })
      ),
    }),
    async execute(
      { taskId, files }: AddFilesInput & { taskId: string },
      runContext?: RunContext<AgentContext>
    ) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        await store.addFiles(context.chatId, taskId, { files });
        return { success: true };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  const tasksDelete = tool({
    name: 'tasks_delete',
    description: '删除任务。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_delete'),
      taskId: z.string().min(1),
      confirm: z.literal(true),
    }),
    async execute({ taskId, confirm }, runContext?: RunContext<AgentContext>) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        await store.deleteTask(context.chatId, taskId, { confirm });
        return { success: true };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  const tasksGraph = tool({
    name: 'tasks_graph',
    description: '输出任务依赖图（mermaid + 文本列表）。',
    parameters: z.object({
      summary: toolSummarySchema.default('tasks_graph'),
    }),
    async execute(_input: unknown, runContext?: RunContext<AgentContext>) {
      const context = requireContext(runContext);
      if ('error' in context) return context;
      try {
        await store.init({ vaultRoot: context.vaultRoot });
        const tasks = await store.listTasks(context.chatId, { includeArchived: true });
        const lines: string[] = ['graph TD'];
        const text: string[] = [];
        const idMap = new Map<string, string>();
        const toNodeId = (taskId: string): string => {
          const existing = idMap.get(taskId);
          if (existing) return existing;
          const nodeId = `t${idMap.size + 1}`;
          idMap.set(taskId, nodeId);
          return nodeId;
        };
        for (const task of tasks) {
          const deps = await store.listDependencies(context.chatId, task.id);
          const nodeId = toNodeId(task.id);
          const label = sanitizeMermaidLabel(task.title);
          lines.push(`  ${nodeId}["${label}"]`);
          if (deps.length === 0) {
            text.push(`${task.id}: ${task.title}`);
          } else {
            for (const dep of deps) {
              lines.push(`  ${nodeId} --> ${toNodeId(dep.dependsOn)}`);
              text.push(`${task.id} -> ${dep.dependsOn}`);
            }
          }
        }
        return { mermaid: lines.join('\n'), text: text.join('\n') };
      } catch (error) {
        return mapError(error);
      }
    },
  });

  return [
    tasksList,
    tasksGet,
    tasksCreate,
    tasksUpdate,
    tasksSetStatus,
    tasksAddDependency,
    tasksRemoveDependency,
    tasksAddNote,
    tasksAddFiles,
    tasksDelete,
    tasksGraph,
  ];
};
