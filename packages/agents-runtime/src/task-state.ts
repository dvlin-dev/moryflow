/**
 * [DEFINES]: TaskStatus / TaskItem / TaskItemInput / TaskState / EMPTY_TASK_STATE
 * [USED_BY]: session.ts, agents-tools, PC/Mobile task state service
 * [POS]: 轻量 task snapshot 协议事实源，供会话元数据与工具共享
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
