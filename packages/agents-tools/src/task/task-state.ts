/**
 * [PROVIDES]: TaskStateService / normalizeTaskState / clearDoneTaskState
 * [DEPENDS]: @moryflow/agents-runtime task-state
 * [POS]: 轻量 task 会话清单的规范化与校验规则
 * [UPDATE]: 2026-03-07 - TaskState 核心协议上移到 agents-runtime，避免跨包重复定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  EMPTY_TASK_STATE,
  type TaskItem,
  type TaskItemInput,
  type TaskState,
  type TaskStatus,
} from '@moryflow/agents-runtime/task-state';

export { EMPTY_TASK_STATE };
export type { TaskItem, TaskItemInput, TaskState, TaskStatus };

export interface TaskStateService {
  get(chatId: string): Promise<TaskState>;
  set(chatId: string, items: TaskItemInput[]): Promise<TaskState>;
  clearDone(chatId: string): Promise<TaskState>;
}

export const MAX_TASK_ITEMS = 8;
export const MAX_TASK_TITLE_LENGTH = 120;
export const MAX_TASK_NOTE_LENGTH = 200;
const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];

export class TaskValidationError extends Error {
  readonly code = 'validation_error';

  constructor(message: string) {
    super(message);
    this.name = 'TaskValidationError';
  }
}

type NormalizeTaskStateOptions = {
  now: () => number;
  createId: () => string;
};

const trimToUndefined = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const validateItemsShape = (items: TaskItemInput[]) => {
  if (items.length > MAX_TASK_ITEMS) {
    throw new TaskValidationError(`task list must contain at most ${MAX_TASK_ITEMS} items`);
  }
};

const resolveTaskItemId = (input: {
  item: TaskItemInput;
  index: number;
  currentItems: readonly TaskItem[];
  usedIds: Set<string>;
  createId: () => string;
}): string => {
  const explicitId = trimToUndefined(input.item.id);
  if (explicitId) {
    return explicitId;
  }

  const currentId = input.currentItems[input.index]?.id;
  if (currentId && !input.usedIds.has(currentId)) {
    return currentId;
  }

  let generatedId = input.createId();
  while (input.usedIds.has(generatedId)) {
    generatedId = input.createId();
  }
  return generatedId;
};

const normalizeTaskItem = (item: TaskItemInput, id: string): TaskItem => {
  const title = item.title.trim();
  if (!title) {
    throw new TaskValidationError('task title must not be empty');
  }
  if (title.length > MAX_TASK_TITLE_LENGTH) {
    throw new TaskValidationError(`task title must be <= ${MAX_TASK_TITLE_LENGTH} characters`);
  }

  const note = trimToUndefined(item.note);
  if (note && note.length > MAX_TASK_NOTE_LENGTH) {
    throw new TaskValidationError(`task note must be <= ${MAX_TASK_NOTE_LENGTH} characters`);
  }
  if (!TASK_STATUSES.includes(item.status)) {
    throw new TaskValidationError('task status must be one of todo, in_progress, done');
  }

  return {
    id,
    title,
    status: item.status,
    ...(note ? { note } : {}),
  };
};

const validateNormalizedItems = (items: TaskItem[]) => {
  const ids = new Set<string>();
  let inProgressCount = 0;

  for (const item of items) {
    if (ids.has(item.id)) {
      throw new TaskValidationError(`duplicate task id: ${item.id}`);
    }
    ids.add(item.id);

    if (item.status === 'in_progress') {
      inProgressCount += 1;
      if (inProgressCount > 1) {
        throw new TaskValidationError('task list can contain only one in_progress item');
      }
    }
  }
};

const areItemsEqual = (left: readonly TaskItem[], right: readonly TaskItem[]) => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a.id !== b.id || a.title !== b.title || a.status !== b.status || a.note !== b.note) {
      return false;
    }
  }
  return true;
};

export const normalizeTaskState = (
  current: TaskState | undefined,
  items: TaskItemInput[],
  options: NormalizeTaskStateOptions
): TaskState => {
  validateItemsShape(items);
  const currentItems = current?.items ?? EMPTY_TASK_STATE.items;
  const usedIds = new Set<string>();
  const normalizedItems = items.map((item, index) => {
    const id = resolveTaskItemId({
      item,
      index,
      currentItems,
      usedIds,
      createId: options.createId,
    });
    usedIds.add(id);
    return normalizeTaskItem(item, id);
  });
  validateNormalizedItems(normalizedItems);

  if (normalizedItems.length === 0) {
    return EMPTY_TASK_STATE;
  }

  if (current && areItemsEqual(current.items, normalizedItems)) {
    return current;
  }

  return {
    items: normalizedItems,
    updatedAt: options.now(),
  };
};

export const clearDoneTaskState = (
  current: TaskState | undefined,
  now: () => number
): TaskState => {
  const state = current && current.items.length > 0 ? current : EMPTY_TASK_STATE;
  if (state.items.length === 0) {
    return EMPTY_TASK_STATE;
  }

  const nextItems = state.items.filter((item) => item.status !== 'done');
  if (nextItems.length === state.items.length) {
    return state;
  }
  if (nextItems.length === 0) {
    return EMPTY_TASK_STATE;
  }

  return {
    items: nextItems,
    updatedAt: now(),
  };
};

export const isTaskValidationError = (error: unknown): error is TaskValidationError =>
  error instanceof TaskValidationError;
