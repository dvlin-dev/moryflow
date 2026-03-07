/**
 * [DEFINES]: TaskStatus / TaskItem / TaskItemInput / TaskState / EMPTY_TASK_STATE
 * [USED_BY]: session.ts, agents-tools, PC/Mobile task state service
 * [POS]: 轻量 task snapshot 协议事实源，供会话元数据与工具共享
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  note?: string;
}

export interface TaskItemInput {
  id?: string;
  title: string;
  status: TaskStatus;
  note?: string;
}

export interface TaskState {
  items: readonly TaskItem[];
  updatedAt: number;
}

const EMPTY_TASK_ITEMS = Object.freeze([] as TaskItem[]);

export const EMPTY_TASK_STATE: TaskState = Object.freeze({
  items: EMPTY_TASK_ITEMS,
  updatedAt: 0,
});
