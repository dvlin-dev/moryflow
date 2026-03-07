---
title: Moryflow Agent Task 系统基线
date: 2026-03-07
scope: moryflow
status: active
---

# Moryflow Agent Task 系统基线

## 1. 当前结论

Moryflow 的 Agent task 系统已经收敛为**单会话、单工具、单事实源**模型：

1. 只保留一个工具：`task`。
2. 只保留一个事实源：`ChatSessionSummary.taskState`。
3. 只保留一个写入口：`TaskStateService`。
4. UI 只消费 `TaskState` snapshot，不再维护独立 list/detail 读模型。
5. 不保留任何 `tasks_*`、`tasks.db`、`tasks:changed`、`tasks-service`、依赖图、审计事件、详情面板兼容层。

这不是旧 Tasks 系统的“简化版”，而是已经切换成新的产品语义：
**task = 当前 chat 会话里的轻量执行清单。**

## 2. 核心边界

### 2.1 事实源

共享会话协议如下：

```ts
export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  preferredModelId?: string;
  tokenUsage?: TokenUsage;
  taskState?: TaskState;
}
```

约束：

- `taskState` 直接挂在 session summary 上。
- 新会话默认 `taskState = undefined`。
- `task.get` 在无状态时返回 `EMPTY_TASK_STATE`，但不会主动创建持久化记录。
- fork session 时复制 `taskState`。
- 删除 session 时，必须先终止该 session 的运行中 stream / tool 流，再删除 session；`taskState` 跟随 session 一起删除。
- 清空会话历史不会自动清空 `taskState`。

### 2.2 唯一写入口

```ts
export interface TaskStateService {
  get(chatId: string): Promise<TaskState>;
  set(chatId: string, items: TaskItemInput[]): Promise<TaskState>;
  clearDone(chatId: string): Promise<TaskState>;
}
```

硬约束：

- Agent 工具写入必须经过 `TaskStateService`。
- UI / Hook / preload / renderer 不允许直接 patch session 对象。
- 不允许再引入独立 task event bus、独立 task store、独立 task IPC 写接口。

## 3. 共享模型

共享协议事实源在 `packages/agents-runtime/src/task-state.ts`：

```ts
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
  items: TaskItem[];
  updatedAt: number;
}
```

固定不变量：

1. 最多 8 条 task。
2. `title.trim()` 后必须非空，且长度 <= 120。
3. `note?.trim()` 长度 <= 200。
4. 同一 snapshot 最多只允许 1 条 `in_progress`。
5. 显式传入的 `id` 在同一 snapshot 内必须唯一。
6. `items` 数组顺序就是最终显示顺序。
7. `clear_done` 只删除 `done` 项，保留其余项相对顺序。
8. 规范化结果与当前状态完全相同时，必须保留原 `updatedAt`。
9. 空状态标准值固定为 `EMPTY_TASK_STATE = { items: [], updatedAt: 0 }`。

## 4. 工具协议

工具面只保留单一 `task`：

```ts
// 读取当前清单
task({ action: 'get' });

// 全量覆盖当前清单
task({
  action: 'set',
  items: [
    { title: '梳理实现边界', status: 'done' },
    { title: '更新文档', status: 'in_progress', note: '当前进行中' },
    { title: '执行验证', status: 'todo' },
  ],
});

// 清理已完成项
task({ action: 'clear_done' });
```

动作语义：

- `get`：返回当前 snapshot；无状态时返回空 snapshot。
- `set`：输入完整列表，整体校验后全量覆盖。
- `clear_done`：删除所有 `done` 项；无 `done` 时返回原状态。

错误边界只保留：

- `missing_context`
- `validation_error`
- `runtime_error`

## 5. 平台落地

### 5.1 Shared Packages

- `packages/agents-runtime/src/task-state.ts`
  - 共享 `TaskStatus/TaskItem/TaskItemInput/TaskState/EMPTY_TASK_STATE`。
- `packages/agents-tools/src/task/task-state.ts`
  - 只负责 `TaskStateService` 接口、规范化、校验与 `clearDoneTaskState`。
- `packages/agents-tools/src/task/task-tool.ts`
  - 只负责单一 `task` 工具的 schema 与 `get/set/clear_done` 分发。

### 5.2 PC

PC 端当前实现：

- `apps/moryflow/pc/src/shared/ipc/chat.ts`
  - `ChatSessionSummary` 直接包含 `taskState`。
- `apps/moryflow/pc/src/main/chat-session-store/handle.ts`
  - session 持久化、读取、fork 都直接带 `taskState`。
- `apps/moryflow/pc/src/main/agent-runtime/task-state-service.ts`
  - PC 唯一写入口，负责 `get/set/clearDone`。
- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
  - 不再暴露 `tasks:list/get`。
- `chat:session-event`
  - 是 task 变更后的唯一广播通道。

PC 不再保留：

- `tasks.db`
- `shared-tasks-store`
- `tasks-store`
- `tasks:list`
- `tasks:get`
- `tasks:changed`

### 5.3 Mobile

Mobile 端当前实现：

- `apps/moryflow/mobile/lib/agent-runtime/session-store.ts`
  - AsyncStorage 持久化 session summary 时直接带 `taskState`。
- `apps/moryflow/mobile/lib/agent-runtime/task-state-service.ts`
  - Mobile 唯一写入口，负责 `get/set/clearDone`。
- `apps/moryflow/mobile/lib/hooks/use-chat-sessions.ts`
  - 通过 session 订阅直接刷新 `activeSession.taskState`。
- `apps/moryflow/mobile/lib/chat/session-lifecycle.ts`
  - 切换 session / 删除 active session 时，先 stop 当前运行，避免后续 `task` 写入命中缺失 session。
- `apps/moryflow/mobile/lib/agent-runtime/runtime.ts`
  - 工具装配改为注入 `taskStateService`。

Mobile 不再保留：

- 独立 `tasks-store`
- 独立 `tasks-service`
- `onTasksChange`
- task 专用轮询/详情链路

## 6. UI 合同

### 6.1 PC Renderer

- `apps/moryflow/pc/src/renderer/components/chat-pane/components/task-hover-panel.tsx`
  - 只接收 `taskState`。
  - 只渲染 checklist。
  - `taskState.items.length > 0` 即可显示。
  - 不再依赖 session running、detail selection、refresh/list API。

### 6.2 Mobile UI

- `apps/moryflow/mobile/components/chat/TasksSheet.tsx`
  - 只接收当前会话 `taskState`。
  - 只展示 checklist rows。
  - 不再展示 detail、dependencies、files、refresh control。
- `apps/moryflow/mobile/components/chat/tasks-sheet-model.ts`
  - 只做 snapshot -> rows 的纯投影。

## 7. Prompt / Compaction / Tool UI

- `packages/agents-runtime/src/prompt.ts`
  - 只描述单一 `task`，不再提 `tasks_*` / `manage_plan`。
  - 多步复杂任务开始执行前优先 `task.set`；会话恢复、上下文压缩或进度不确定时先 `task.get`。
- `packages/agents-runtime/src/compaction.ts`
  - 不再保护 `manage_plan` 或旧 task workflow 名称。
- `packages/agents-runtime/src/ui-message/tool-command-summary.ts`
  - 不再保留 `update_plan/tasks_update/todo` 专用摘要格式。

原则：

- task 的事实源在 session metadata，不在 prompt 注入或旧工具输出历史里。
- compaction 只保留仍然存在的高价值工具保护项。
- Tool UI 只反映当前真实工具输入，不为已删除协议保留特判。

## 8. 明确删除的旧语义

以下能力已经从系统设计中删除，不允许重新引入：

- 项目级 SQLite task 数据库
- DAG / dependency / graph
- owner / priority / files / events / version / startedAt / completedAt
- detail query / selection / filter / refresh workflow
- task 专用 IPC namespace
- task 专用事件总线
- task 与 subagent 的强制生命周期绑定
- `manage_plan`
- 任何 `tasks_* -> task` 兼容层

## 9. 相关文档

- 实施冻结稿与当前基线：`docs/design/moryflow/features/moryflow-agent-task-lightweight-redesign-plan.md`
- 本文档：当前生效的 core baseline

## 10. 最终原则

关于 Agent task，后续改动必须继续遵守以下三条：

1. **单一职责**：task 只是当前会话的执行清单，不承担项目管理系统职责。
2. **单一事实源**：真相永远在 `ChatSessionSummary.taskState`。
3. **零兼容**：不为旧 `tasks_*` 系统保留任何接口、数据或文档包袱。
