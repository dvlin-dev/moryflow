---
title: Moryflow Agent 轻量 Task 工具重构方案
date: 2026-03-07
scope: docs/design/moryflow/features
status: completed
---

# Moryflow Agent 轻量 Task 工具重构方案

## 0. 冻结说明

本文档是本轮 task 重构的冻结基线，用于“可以直接开工”的实现约束。

冻结含义：

1. 本文档没有待决策分支，没有兼容期设计，也没有灰度双轨。
2. 代码实现必须服从这里的边界；如果后续要改边界，先改文档，再改代码。
3. 行为准则明确为：**不考虑历史兼容，只要最佳实践，只保留单一职责**。

## 1. 问题复核

当前运行时里的 `tasks_*` 不是轻量 task tool，而是一套偏重的 workflow system：

1. 存储层使用独立 SQLite，并要求 Vault 内 `.moryflow/agent/tasks.db` 作为项目级事实源。
2. 数据模型包含依赖 DAG、备注、关联文件、事件审计、乐观锁版本、started/completed 时间戳等完整项目管理语义。
3. Desktop 与 Mobile 分别维护一套 TasksStore，并额外承担 watcher / polling / IPC / 只读读模型的同步成本。
4. Prompt 与子代理协议仍把它当作“复杂任务必须接入的任务系统”，进一步放大了耦合。

代码走查后，额外确认了两个事实：

1. PC 端已经把重型模型外溢到了前后端协议：`tasks:list` / `tasks:get` / `tasks:changed`、`TaskDetailResult`、`TaskDependency`、`TaskNote`、`TaskFile` 都已经进入 renderer。
2. Mobile 端也存在独立 `tasks-service + useTasks + detail` 链路，本质上仍是“列表 + 详情 + 独立事件通道”。

而当前真正需要的能力只有：

- 在单个 chat 内维护一个可更新的执行清单；
- 让模型知道自己还剩哪些步骤；
- 让用户在 UI 里看到当前会话还在做什么。

结论：问题根因不是字段太多，而是产品定位错了。当前 `tasks_*` 做成了长期任务系统，而我们真正需要的是 **session-scoped checklist**。

## 2. 冻结决策

以下决策全部冻结，不再保留讨论口：

1. 名字统一为 `task`，不再使用 `tasks_*`。
2. task 事实源并入 chat session，不再使用 Vault 内 SQLite。
3. task 是“当前会话执行清单”，不是项目级任务系统。
4. 写入口只有一个：`task` 工具 + 每端唯一的 `TaskStateService`；UI 不允许直接写。
5. 读模型只有一个：`TaskState` snapshot；不允许 list/detail 两段式协议。
6. 数据模型只保留 `id / title / status / note`，以及状态容器上的 `updatedAt`。
7. 状态只保留三态：`todo / in_progress / done`。
8. 列表顺序以 `items` 数组顺序为唯一事实源，UI 不允许二次排序。
9. 不再保留独立 `tasks:*` IPC、`tasks:changed` 事件、`tasks-service`、详情查询、筛选查询。
10. 不迁移旧 `tasks.db`，不保留兼容层，不保留双轨开关。

## 3. 目标架构

```mermaid
flowchart LR
  Agent["Mory Agent"] --> Tool["task tool"]
  Tool --> Service["TaskStateService"]
  Service --> Session["Session Store"]
  Session --> SessionEvent["Session Update Event"]
  SessionEvent --> UI["Task UI"]
```

核心原则：**task 属于 session metadata，不是独立子系统。**

### 3.1 事实源

- 不再有 `TasksStore + tasks.db`。
- task snapshot 直接挂到会话元数据中。
- PC 与 Mobile 的持久化位置可以不同，但上层语义必须完全一致。

冻结后的协议归属：

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

冻结点：`taskState` 进入 `ChatSessionSummary`，而不是单独再开一套 summary/detail 协议。

### 3.2 唯一写入口

每端必须提供唯一的 `TaskStateService`，职责固定为：

1. 读取某个 `chatId` 当前的 `taskState`；
2. 对输入做规范化与校验；
3. 写回 session store；
4. 触发会话更新通知。

冻结后的最小接口：

```ts
export interface TaskStateService {
  get(chatId: string): Promise<TaskState>;
  set(chatId: string, items: TaskItemInput[]): Promise<TaskState>;
  clearDone(chatId: string): Promise<TaskState>;
}
```

约束：

- 任何 task 写操作都必须经过 `TaskStateService`。
- 禁止在 UI、Hook、IPC handler、renderer 里直接 patch session 对象。
- 禁止再出现“存储一套、事件一套、读模型一套”的三份事实源。

### 3.3 事件与同步

#### PC

- 不再保留 `tasks:changed`。
- task 变更统一复用现有 `chat:session-event`。
- `TaskStateService` 写入后必须走统一 session update 广播，而不是再加独立 event bus。

#### Mobile

- 不再保留独立 `onTasksChange` emitter。
- Mobile session store 新增通用 session 订阅能力，task UI 复用 session 订阅，不再创建 task 专用通道。

冻结点：**task 没有独立事件系统，只复用 session 更新机制。**

### 3.4 生命周期

- task 只属于当前 `chatId`。
- 新会话默认 `taskState = undefined`。
- `task.get` 在无状态时返回空 snapshot，不自动创建持久化记录。
- 会话 fork 时，`taskState` 与 session 一起复制。
- 删除会话时，`taskState` 一起删除。
- 清空会话历史时，默认保留 `taskState`；只有显式 task 操作才清空 task。

## 4. 数据模型与不变量

### 4.1 最小模型

```ts
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  note?: string;
}

export interface TaskState {
  items: TaskItem[];
  updatedAt: number;
}
```

### 4.2 输入模型

```ts
export interface TaskItemInput {
  id?: string;
  title: string;
  status: TaskStatus;
  note?: string;
}
```

### 4.3 明确删除的字段

以下字段全部删除，不做任何兼容保留：

- `description`
- `priority`
- `owner`
- `dependencies`
- `files`
- `events`
- `version`
- `startedAt`
- `completedAt`
- `reason`
- `statusSummary`
- `archived`
- `blocked`
- `failed`
- `cancelled`

### 4.4 不变量

以下约束是实现必须保证的硬规则：

1. 单个会话最多保留 8 条 task；超过直接报错，不做隐式截断。
2. `title.trim()` 后必须非空，且长度 <= 120。
3. `note` 可选；若存在则 `trim()` 后长度 <= 200。
4. `items` 顺序就是最终显示顺序；UI 不允许二次排序。
5. 同一 snapshot 最多只允许 1 条 `in_progress`。
6. `id` 可缺省；缺省时由服务端自动补齐。
7. 若显式传入 `id`，同一 snapshot 中必须唯一；重复 `id` 直接报错。
8. `done` 项会保留在列表中，直到显式调用 `clear_done` 或下一次 `set` 移除。
9. 对输入规范化后，如果与现有状态完全相同，则返回原状态并保持原 `updatedAt`，避免无意义刷新。
10. 空状态的标准返回值固定为：`{ items: [], updatedAt: 0 }`。

## 5. Tool 协议

最终协议收敛为单一 `task` 工具。

### 5.1 工具动作

```ts
// 读取当前清单
task({ action: 'get' });

// 全量覆盖当前清单
task({
  action: 'set',
  items: [
    { title: '梳理现有 task 设计', status: 'done' },
    { title: '把文档修到冻结版', status: 'in_progress', note: '当前进行中' },
    { title: '拆实现步骤并开工', status: 'todo' },
  ],
});

// 清理已完成项
task({ action: 'clear_done' });
```

### 5.2 动作语义

#### `get`

- 读取当前会话的标准 snapshot。
- 若当前没有 taskState，返回空 snapshot：`{ items: [], updatedAt: 0 }`。
- `get` 绝不报“not_found”。

#### `set`

- 输入是完整列表，不是 patch。
- 服务端必须先做规范化和校验，再整体替换。
- 写入成功后返回规范化后的完整 snapshot。
- 任一校验失败则整次失败，不允许部分成功。

#### `clear_done`

- 从当前 snapshot 中移除所有 `done` 项。
- 无 `done` 项时为 no-op，返回当前 snapshot。
- 保留剩余项的相对顺序。

### 5.3 为什么只保留 `get / set / clear_done`

1. `get` 保证显式读事实源。
2. `set` 用全量覆盖替代 patch，避免增删改一串零碎 API。
3. `clear_done` 是唯一高频且稳定的快捷动作，保留它比让模型每次手动 filter 更可靠。

除此之外，全部删除：

- `create`
- `update`
- `delete`
- `set_status`
- `add_dependency`
- `remove_dependency`
- `add_note`
- `add_files`
- `graph`
- `list`
- `get_detail`

### 5.4 错误边界

`task` 只允许以下三类错误：

1. `missing_context`：缺少 `chatId` 或运行时上下文；
2. `validation_error`：不满足数据模型约束。
3. `runtime_error`：session 持久化、存储读写或其他非输入校验异常。

冻结点：不再保留 `not_found / conflict / invalid_dependency / graph_cycle` 这类重系统错误语义；但非校验异常必须和 `validation_error` 分开，避免把存储故障伪装成输入问题。

## 6. Agent 行为准则

### 6.1 使用时机

只有当任务满足以下任一条件时，才建议使用 `task`：

1. 需要 2 步及以上连续执行；
2. 需要跨多次工具调用持续跟踪进度；
3. 用户明确要求给出执行清单、阶段状态或执行进度。

单次回答、单次查询、一次改完即可结束的任务，不使用 `task`。

### 6.2 读写准则

1. 新建多步清单时可直接 `set`。
2. 会话恢复、上下文被压缩、或模型不确定当前状态时，先 `get` 再 `set`。
3. 同一轮内尽量把状态变化收敛成一次 `set`，避免频繁抖动。
4. task 是执行清单，不是过程日志；长文本分析写在自然语言回复里，不写进 `note`。

### 6.3 与 `subagent` 的关系

- `subagent` 与 `task` 完全解耦。
- 父 agent 可以在委托前后自己维护 task，但子代理不承担强制回写职责。
- 禁止把“task 生命周期”再绑回 `subagent` 协议层。

## 7. Prompt 与 Compaction 决策

### 7.1 Prompt

Prompt 只保留以下语义：

1. 多步复杂任务开始执行前，优先使用 `task` 建立或更新执行清单；
2. 恢复会话、上下文压缩后继续执行、或不确定当前清单时，先调用 `task.get`；
3. 不再提及 `tasks_*`、`manage_plan`、依赖图、任务详情页等旧语义。

冻结点：**不自动把 `taskState` 注入系统提示词。**

原因：

1. 真正事实源已经持久化在 session metadata；
2. 读事实源应通过显式 `task.get` 完成，避免隐式 prompt 注入漂移；
3. 这样 compaction 与 resume 的行为更清晰、更可验证。

### 7.2 Compaction

- 删除 `manage_plan` 相关保护与描述。
- 不再依赖 `tasks_*` / `task` 的历史工具输出作为事实源。
- task 真相已经在 session metadata 中，compaction 不需要为其保留专门的 protected tool name。

冻结点：**compaction 不再承担保存 task 状态的职责。**

## 8. UI 与状态管理冻结要求

### 8.1 状态归属

根据仓库状态规范，task 属于共享业务状态，不能继续散落在临时 Hook 里。

冻结后的要求：

1. PC：task 状态并入现有 chat session 状态流，不再以 `useTasks + useState` 作为事实源。
2. Mobile：task 状态并入现有 session store / session hooks，不再保留独立 `tasks-service + useTasks` 状态链。
3. 前端继续遵循 `store + methods + api` 规范；task 只允许作为 session store 的一部分被读取与派生。
4. 不新增 React Context，也不新增独立 task store；当前语义已经属于 session metadata，继续挂在 session 单一事实源上。

### 8.2 PC UI

PC 必须收口为：

1. 删除 `tasks:list` / `tasks:get` / `tasks:changed`。
2. 删除 `TaskDetailResult`、selection、detail loading、筛选查询。
3. `TaskHoverPanel` 只消费当前 active session 的 `taskState` snapshot。
4. 只要当前会话 `taskState.items.length > 0`，面板就可见；不再绑定 `isSessionRunning`。
5. 面板仅展示：状态 icon、标题、可选 note。

### 8.3 Mobile UI

Mobile 必须收口为：

1. `TasksSheet` 改为单页 checklist。
2. 删除详情区域、刷新按钮、依赖/备注/文件区块。
3. 只读取 active session 的 `taskState`。
4. 不再保留 task 专用 emitter、detail fetch 与 polling。

### 8.4 UI 不允许保留的能力

以下能力必须整体删除：

- 详情页
- task selection
- detail fetch
- status/priority/owner/search 过滤
- 更新时间排序
- “当前运行中才显示”这种运行态耦合逻辑

## 9. 影响范围

### 9.1 `packages/agents-tools`

需要重构：

- `packages/agents-tools/src/task/task-tool.ts` -> 改为单一 `task` 工具
- `packages/agents-tools/src/task/task-state.ts` -> 改为极简 `TaskStateService` 协议
- `packages/agents-tools/src/create-tools.ts`
- `packages/agents-tools/src/create-tools-mobile.ts`
- `packages/agents-tools/src/index.ts`
- `packages/agents-tools/src/index.react-native.ts`
- `packages/agents-tools/test/task-tool.spec.ts`

需要删除：

- 旧 `tasks_*` schema 与多工具导出
- SQLite schema / migrations 常量
- dependency / note / file / event 相关类型与工具逻辑

### 9.2 PC

需要重构：

- `apps/moryflow/pc/src/main/chat-session-store/const.ts`
- `apps/moryflow/pc/src/main/chat-session-store/handle.ts`
- `apps/moryflow/pc/src/main/chat-session-store/session-store-adapter.ts`
- `apps/moryflow/pc/src/main/agent-runtime/index.ts`
- `apps/moryflow/pc/src/preload/index.ts`
- `apps/moryflow/pc/src/shared/ipc/chat.ts`
- `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/task-hover-panel.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-tasks.ts`（应删除或并入 session store）

需要删除：

- `apps/moryflow/pc/src/main/agent-runtime/tasks-store.ts`
- `apps/moryflow/pc/src/main/agent-runtime/shared-tasks-store.ts`
- `apps/moryflow/pc/src/main/tasks/index.ts`
- `apps/moryflow/pc/src/shared/ipc/tasks.ts`
- `tasks:list/get` IPC 与 `tasks:changed` 广播

### 9.3 Mobile

需要重构：

- `apps/moryflow/mobile/lib/agent-runtime/session-store.ts`
- `apps/moryflow/mobile/lib/hooks/use-chat-sessions.ts`
- `apps/moryflow/mobile/components/chat/TasksSheet.tsx`
- `apps/moryflow/mobile/lib/hooks/use-tasks.ts`（应删除或并入 session hooks）

需要删除：

- `apps/moryflow/mobile/lib/agent-runtime/tasks-store.ts`
- `apps/moryflow/mobile/lib/agent-runtime/tasks-service.ts`
- `expo-sqlite` 版 task 持久化、轮询同步与详情查询链路

### 9.4 Prompt / Compaction / Docs

需要同步：

- `packages/agents-runtime/src/prompt.ts`
- `packages/agents-runtime/src/compaction.ts`
- `packages/agents-runtime/src/__tests__/prompt.test.ts`
- `docs/design/moryflow/core/agent-tasks-system.md`（已改写为新事实源）
- 相关 `CLAUDE.md`
- `apps/moryflow/pc/README.md`

## 10. 当前状态

当前实现已经完成冻结版本收口，现状如下：

1. 运行时只保留单一 `task` 工具，动作固定为 `get / set / clear_done`。
2. `taskState` 当前以 `ChatSessionSummary.taskState` 为唯一事实源；PC/Mobile 都通过 session metadata 持久化与广播。
3. UI 当前只保留 snapshot-only checklist，不再保留 detail、selection、refresh、独立 tasks namespace 或轮询链路。
4. `packages/agents-tools`、`packages/agents-runtime`、PC、Mobile、README 与相关设计文档都已收口到轻量 `task` 语义，不再保留 `tasks_*`、`manage_plan`、旧 detail/status/tool-summary 表达。
5. 命名已完成统一：实现、导出、测试与文档不再继续使用 `tasks-*` 命名轻量协议。
6. 相关行为已通过受影响单测与 L2 校验锁定；后续新增改动必须继续遵守本方案定义的单一事实源与单一工具边界。

### Phase 1：收口 session 协议

1. 给 `ChatSessionSummary` 增加 `taskState`。
2. 在 PC / Mobile session store 中完成 `taskState` 持久化。
3. 为每端补齐统一的 `TaskStateService` 与 session 更新通知。

### Phase 2：切换工具面

1. 用单一 `task` 工具替换 `tasks_*` 注入。
2. 删除 SQLite / watcher / polling / details / query filter。
3. prompt 改为只提 `task`。
4. compaction 删除 `manage_plan` 旧残留。

### Phase 3：切换 UI

1. PC 任务面板改为直接消费 active session 的 `taskState`。
2. Mobile `TasksSheet` 改为只读 checklist。
3. 删除 selection、detail fetch、refresh button、独立 tasks namespace。

### Phase 4：删除旧系统

1. 删除旧 task store、IPC、类型、测试与文档残留。
2. 回写 `agent-tasks-system.md`，把旧系统文档替换为新事实源。
3. 确保合并态只有轻量 `task`，没有双轨。

## 11. 测试与验收

本改造属于跨包协议与运行时事实源重写，按 L2 执行验证。

### 11.1 必做测试

1. `packages/agents-tools`：`task` 工具单测（`get/set/clear_done`、空状态、重复 id、多于一条 `in_progress`、超过 8 条）。
2. PC：session-backed `taskState` 持久化测试（create/update/fork/delete/session event broadcast）。
3. Mobile：session store `taskState` 持久化与 session 订阅测试。
4. Prompt：断言只提 `task`，不再提 `tasks_*`。
5. Compaction：断言移除 `manage_plan` 旧保护，不依赖 task tool 历史输出。
6. UI：PC / Mobile 只渲染 checklist，不再依赖 detail 结构。

### 11.2 验收标准

1. 运行时默认只暴露一个 `task` 工具。
2. 运行时代码与公开 IPC / 工具接口中不存在 `tasks_*`、`tasks:list/get`、`tasks:changed`、`tasks-service`、`tasks.db`。
3. task 写入后，PC 通过 session update event 刷新；Mobile 通过 session subscription 刷新。
4. UI 不再展示 dependency / files / owner / priority / detail / filters。
5. 运行时代码中不再保留 `manage_plan` 与旧 task workflow 语义残留。

### 11.3 校验命令

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

## 12. 迁移策略

本次遵循零兼容原则。

1. 不迁移旧 `tasks.db` 数据。
2. 不保留 `tasks_*` 到 `task` 的适配层。
3. 不保留“双轨期” runtime config 开关。
4. 可以在开发分支中分步骤改造，但最终合并态必须只剩轻量 `task`。

## 13. 最终结论

这次改造不是“给旧任务系统减几个字段”，而是把产品语义从“长期任务管理”改回“当前会话执行清单”。

最终只保留五个核心事实：

1. 名字就叫 `task`。
2. 真相在 session metadata，而不是 SQLite。
3. 工具只有一个 `task`。
4. 模型只有 `id / title / status / note`。
5. UI、事件、读写协议全部围绕单一 snapshot 收口。

这就是本轮可以放心开工的冻结版本。
