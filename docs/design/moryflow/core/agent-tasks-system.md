---
title: Moryflow Agent Tasks 系统方案（替代 Plan）
date: 2026-01-25
scope: moryflow
status: completed
---

# Moryflow Agent Tasks 系统方案（替代 Plan）

## 背景

当前的「Plan/Todo」更像一次性清单：

- 不持久化，且生命周期短
- 任务之间没有明确依赖/阻塞关系
- 多会话并行时缺少明确的任务隔离与归属
- 任务上下文（文件、决策、备注）难以沉淀

**目标**：为 Moryflow 提供一套“可长期追踪、可协作、可审计”的 Tasks 系统，从零开始设计与落地，不做历史兼容。

## 目标与非目标

### 目标

1. **项目级持久化**：任务数据存放在 Vault 项目目录内。
2. **依赖/阻塞建模**：任务之间必须支持依赖关系表达，形成 DAG。
3. **多 Agent 协作**：同一会话下多个 Agent/子代理共享同一任务集。
4. **任务上下文**：任务关联文件路径、决策、备注与变更历史。
5. **子代理协同**：父 Agent 必须能指派子 Agent 执行任务并同步进度。

### 非目标

- 不做跨 Vault/跨项目任务合并。
- 不提供复杂 UI 看板（首期只需列表/详情）。
- 不保留任何旧 `manage_plan` 行为与兼容层。

## 核心原则

- **单一真实数据源**：Tasks 存储只在项目目录内。
- **可并发安全写入**：多 Agent 并发更新不丢数据。
- **可审计**：关键状态变化需有事件记录。
- **可扩展**：后续阶段新增优先级/排序/搜索，不允许破坏现有存储结构（非 MVP）。

## 存储与目录规范

- **位置（项目级）**：`<VaultRoot>/.moryflow/agent/tasks.db`
- **目录约定**：`.moryflow/agent/` 作为 Moryflow 本地 Agent 元数据目录。
- **可见性**：默认视作隐藏元数据；发布/同步/导出流程应忽略该目录（避免进入用户产出内容）。
- **并发与可靠性**：使用 SQLite（WAL 模式）保证多进程/多 Agent 并发安全。

> 说明：这是面向 Moryflow 的单一规范，不考虑 Anyhunt 业务线。

## 边界与约束（必须遵守）

1. **Vault 内唯一数据源**：Tasks 必须只存放在当前 Vault 的 `.moryflow/agent/tasks.db`，禁止写到用户家目录与全局目录。
2. **无 Vault 则禁用**：未能解析 VaultRoot 时，Tasks 工具应返回可读错误（不允许隐式创建全局任务）。
3. **不进入内容同步/发布**：`.moryflow/agent/` 默认作为元数据目录被同步/发布系统忽略（避免污染用户内容）。当前 FileIndex 会跳过隐藏目录，需保证该规则持续生效。
4. **会话隔离**：任务列表必须与 `chatId` 一一绑定，不允许跨会话共享。
5. **会话 ID 来源**：`chatId` 由运行时生成并持久化为会话元数据，工具只能读取不可写。
6. **跨端一致**：Desktop/Mobile 必须遵循同一 schema 与工具协议，不允许私有字段。
7. **只由工具写入**：任务更新必须走 `tasks_*` 工具与 Store API，禁止直接编辑数据库文件。
8. **多进程一致性**：`tasks.db` 写入仅允许主进程单例连接；其他进程必须通过 IPC 调用写入。

## 平台适配策略（基于当前代码）

> 统一依赖 `PlatformCapabilities` / `VaultUtils` 来解析 Vault 路径与访问文件系统。

### Desktop（Electron / Node）

- **现状能力**：
  - `apps/moryflow/pc/src/main/agent-runtime/desktop-adapter.ts` 提供 Node `fs/path` + `optional.watchFiles`。
- **Tasks 存储**：
  - 使用 Node 侧 SQLite 驱动（**定版：`better-sqlite3`**）直接打开 `tasks.db` 物理文件。
  - 由主进程集中管理连接，避免多渲染进程竞争。
  - 连接初始化必须执行：`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;`
- **广播同步**：
  - 使用 `optional.watchFiles`（chokidar）监听 `tasks.db`、`tasks.db-wal`、`tasks.db-shm` 变更，触发当前会话的所有子代理/窗口刷新。
  - 主进程单例 TasksStore 触发 `tasks:changed` 事件，renderer 端统一刷新（仅拉取当前会话）。
- **IPC 暴露（只读）**：
- `desktopAPI.tasks.list` / `desktopAPI.tasks.get` 仅用于 UI 展示，不允许写入，也不允许状态变更。

### Mobile（React Native / Expo）

- **现状能力**：
  - `apps/moryflow/mobile/lib/agent-runtime/mobile-adapter.ts` 使用 `expo-file-system` 作为 FS。
  - `apps/moryflow/mobile/package.json` 已包含 `expo-sqlite` 依赖。
- **Tasks 存储**：
  - 使用 `expo-sqlite` 打开/创建 SQLite DB 文件（**定版：`SQLite.openDatabaseAsync('tasks.db', undefined, <Vault>/.moryflow/agent)`**）。
  - DB 物理路径必须落在 Vault 根目录下的 `.moryflow/agent/`，确保“项目级”要求。
  - 写入前必须通过 `capabilities.fs.mkdir` 确保目录存在。
  - 同样执行 WAL/foreign_keys/busy_timeout（expo-sqlite 支持的 PRAGMA）。
- **广播同步**：
  - 移动端无文件级 watcher，**定版**：使用 in-app 事件总线通知其他 session，并在 App 激活时以 **5 秒**间隔轮询刷新（后台暂停轮询）。
  - 事件总线入口：`lib/agent-runtime/tasks-service.ts` 的 `onTasksChange`。
- **UI 展示**：
  - Chat Header 提供 Tasks 入口按钮。
  - `TasksSheet` 显示列表 + 详情，调用 `useTasks`（读模型）刷新。

## 数据模型（SQLite）

### 任务表（tasks）

| 字段         | 类型      | 说明                                                                              |
| ------------ | --------- | --------------------------------------------------------------------------------- |
| id           | TEXT (PK) | 任务 ID（`tsk_` + randomUUID）                                                    |
| chat_id      | TEXT      | 会话 ID（= AgentContext.chatId）                                                  |
| title        | TEXT      | 任务标题                                                                          |
| description  | TEXT      | 任务描述                                                                          |
| status       | TEXT      | `todo` / `in_progress` / `blocked` / `done` / `failed` / `cancelled` / `archived` |
| priority     | TEXT      | `p0`/`p1`/`p2`/`p3`                                                               |
| owner        | TEXT      | 当前负责的 agent（可为空）                                                        |
| created_at   | TEXT      | ISO 时间（UTC）                                                                   |
| updated_at   | TEXT      | ISO 时间（UTC）                                                                   |
| started_at   | TEXT      | ISO 时间（可空）                                                                  |
| completed_at | TEXT      | ISO 时间（可空）                                                                  |
| version      | INTEGER   | 乐观锁版本号（从 1 递增）                                                         |

### 依赖表（task_dependencies）

| 字段       | 类型 | 说明                             |
| ---------- | ---- | -------------------------------- |
| task_id    | TEXT | 任务 ID                          |
| chat_id    | TEXT | 会话 ID（= AgentContext.chatId） |
| depends_on | TEXT | 依赖任务 ID                      |

> 保证 DAG：添加依赖时必须检测是否形成环。

### 任务备注（task_notes）

| 字段       | 类型      | 说明                             |
| ---------- | --------- | -------------------------------- |
| id         | TEXT (PK) | 备注 ID                          |
| task_id    | TEXT      | 任务 ID                          |
| chat_id    | TEXT      | 会话 ID（= AgentContext.chatId） |
| body       | TEXT      | 备注内容                         |
| created_at | TEXT      | ISO 时间                         |
| author     | TEXT      | agent/user                       |

### 任务关联文件（task_files）

| 字段    | 类型 | 说明                             |
| ------- | ---- | -------------------------------- |
| task_id | TEXT | 任务 ID                          |
| chat_id | TEXT | 会话 ID（= AgentContext.chatId） |
| path    | TEXT | Vault 内相对路径                 |
| role    | TEXT | `input` / `output` / `reference` |

### 事件表（task_events）

| 字段       | 类型      | 说明                                |
| ---------- | --------- | ----------------------------------- |
| id         | TEXT (PK) | 事件 ID                             |
| task_id    | TEXT      | 任务 ID                             |
| chat_id    | TEXT      | 会话 ID（= AgentContext.chatId）    |
| type       | TEXT      | `create/update/status/add_note/...` |
| payload    | TEXT      | JSON 字符串                         |
| created_at | TEXT      | ISO 时间                            |
| actor      | TEXT      | agent/user                          |

### 索引与约束

- 所有表必须建立 `chat_id` 索引（`CREATE INDEX idx_*_chat_id ON ... (chat_id)`）。
- `task_dependencies` 需建立 `(chat_id, task_id)` 与 `(chat_id, depends_on)` 索引。
- `tasks` 必须建立 `UNIQUE(chat_id, id)`，用于外键约束与跨会话隔离。
- 外键约束：`task_dependencies(chat_id, task_id)` 与 `task_dependencies(chat_id, depends_on)` 必须引用 `tasks(chat_id, id)`。
- 所有查询必须带 `chat_id` 过滤，严禁跨会话扫描。

### Schema 版本与迁移

- 使用 `PRAGMA user_version` 记录 schema 版本。
- 启动时检查版本：不匹配则执行迁移脚本（必须显式失败并进入只读模式）。
- 迁移失败时：进入只读模式并提示用户备份 Vault 后重试。

### ID 生成规范

- 统一使用 `CryptoUtils.randomUUID()` 生成 ID，格式：`tsk_${uuid}` / `evt_${uuid}` / `note_${uuid}`。
- 禁止引入额外 ID 依赖（确保 Desktop/Mobile 一致）。
- `chat_id` 必须等于 `AgentContext.chatId`，不允许来自用户输入。

## Tool 协议（Tasks Tools）

> 与现有 `task` 子代理工具名称冲突风险，任务管理工具统一使用 `tasks_*` 前缀。
> `chat_id` 由运行时注入（= chatId），对用户与模型不可见。

### MVP 工具集

1. `tasks_list`
   - 用途：列出任务（可按状态/优先级/owner 过滤）
2. `tasks_get`
   - 用途：查看单个任务详情（含依赖/备注/关联文件）
3. `tasks_create`
   - 用途：创建任务（标题/描述/依赖/优先级）
4. `tasks_update`
   - 用途：更新任务（任意字段 patch）
   - 需 `expectedVersion` 支持乐观锁
5. `tasks_set_status`
   - 用途：切换状态（含阻塞/完成原因）
6. `tasks_add_dependency` / `tasks_remove_dependency`
   - 用途：维护依赖关系（并进行环检测）
7. `tasks_add_note`
   - 用途：追加备注（可含文件引用）
8. `tasks_add_files`
   - 用途：关联任务文件（input/output/reference）
9. `tasks_delete`
   - 用途：删除任务（必须传 `confirm: true`；默认不级联删除）
10. `tasks_graph`

- 用途：输出 mermaid 依赖图（并附文本列表）

### 并发与一致性

- `tasks_update` 必须携带 `expectedVersion`，版本不匹配返回冲突错误。
- 状态变更写入 `task_events`，用于审计与回放。
- 批量更新时提供事务边界（一次工具调用内要么全部成功、要么全部失败）。
- 所有读写必须强制带 `chat_id` 过滤（从 `runContext.context.chatId` 注入）。

## 子代理协作

- 父 Agent 在调用 `task` 子代理前，应：
  1. `tasks_set_status` → `in_progress`
  2. 将 `taskId` 注入子代理 prompt
- 子代理结束后：
  - 成功 → `tasks_set_status` 为 `done`（附简短 summary）
  - 失败 → `tasks_set_status` 为 `failed`（附错误原因）
- 子代理在执行过程中可调用 `tasks_add_note` 追加关键发现。
- 子代理调用时必须继承同一 `chatId`，确保写入同一任务列表。

## 运行时集成与提示词更新

- **移除** `manage_plan` 工具与相关提示词描述。
- **新增** `tasks_*` 工具说明，强调：
  - 复杂任务必须先建 Task 再执行。
  - 子代理执行结束必须同步 Task 状态。
- **Compaction 保护**：将 `tasks_*` 工具输出加入保护列表，避免摘要截断关键任务状态。

## 删除与重构范围（不做兼容）

- 移除 `manage_plan` 及其内存存储逻辑。
- 移除提示词中关于 `manage_plan` 的指导。
- 清理任何与 Plan/Todo 相关的文档描述。
- 删除旧 Todo Panel 与 IPC 类型（renderer/UI 不再暴露 Plan）。

## 失败模式与兜底

- **DB 无法打开/损坏**：进入只读模式，提示用户备份 Vault 并重建 DB。
- **版本冲突**：返回 `conflict` 错误，提示先刷新任务列表再重试。
- **依赖成环**：拒绝写入，并返回具体成环路径。
- **缺少 chatId**：拒绝执行并返回可读错误。
- **跨会话写入**：任何非当前 `chatId` 的读写一律拒绝。

## MVP 里程碑

1. **Task Store**：SQLite + WAL + 基本表结构。
2. **平台适配**：仅 Desktop 使用 `better-sqlite3`，Mobile 使用 expo-sqlite。
3. **Tools**：`tasks_list/get/create/update/set_status` 先落地。
4. **Agent Runtime**：提示词切换到 Tasks，子代理协作串联。
5. **UI/CLI**：最小展示（列表 + 详情）。
6. **测试**：任务依赖环检测、并发更新冲突、子代理同步。

## 验收标准

- 新建任务并刷新会话后仍可读取。
- 两个 Agent 同时写入不会丢失更新（版本冲突可被识别）。
- 任务依赖可视化且不会形成环。
- 子代理结束后任务状态自动同步。

## 风险与对策

- **并发冲突**：强制 `expectedVersion` + 失败重试机制。
- **任务膨胀**：支持归档状态（`archived`）。
- **错误依赖**：依赖变更时检测环并拒绝。

## 执行清单（必须按顺序）

| 步骤 | 说明                                                                      | 负责人 | 状态 | 完成时间   |
| ---- | ------------------------------------------------------------------------- | ------ | ---- | ---------- |
| 1    | 设计 Tasks Store 接口 + SQLite schema/migration 规范（含 chat_id=chatId） |        | ☑    | 2026-01-25 |
| 2    | Desktop 实现 Tasks Store（`better-sqlite3` + WAL + watchFiles 广播）      |        | ☑    | 2026-01-25 |
| 3    | Mobile 实现 Tasks Store（expo-sqlite + Vault 路径）                       |        | ☑    | 2026-01-25 |
| 4    | 确认同步/发布忽略 `.moryflow/agent/`（隐藏目录规则生效）                  |        | ☑    | 2026-01-25 |
| 5    | 生成 `tasks_*` 工具（替代 manage_plan）                                   |        | ☑    | 2026-01-25 |
| 6    | 更新 Agent Runtime 提示词与 Compaction 保护列表（强调 chatId 绑定）       |        | ☑    | 2026-01-25 |
| 7    | 清理 `manage_plan` 相关代码与文档                                         |        | ☑    | 2026-01-25 |
| 8    | 最小 UI 展示（PC + Mobile 列表 + 详情）                                   |        | ☑    | 2026-01-25 |
| 9    | 测试覆盖（依赖成环/并发冲突/子代理同步/跨会话隔离）                       |        | ☑    | 2026-01-25 |

> 规则：每完成一步，必须在本表将状态更新为 `☑` 并补充完成时间，同时在“进度更新”中记录变更摘要。

## 进度更新

- 2026-01-25：建立任务方案与多平台落地规范；新增执行清单与进度追踪（文档更新）。
- 2026-01-25：明确 SQLite 驱动选择、WAL 监听范围、ID 生成规范、移动端 DB 打开方式与同步忽略边界；补充 chatId 绑定与会话隔离（文档更新）。
- 2026-01-25：完成 Tasks Store 接口与 SQLite schema/migrations 规范落地（`packages/agents-tools/src/task/tasks-store.ts`）。
- 2026-01-25：完成 PC 端 TasksStore 单例与变更广播、只读 IPC（`tasks:list/get`）与 renderer 侧 Tasks 面板（列表 + 详情）。
- 2026-01-25：完成 Mobile 端 TasksService（共享 Store + onTasksChange）与 TasksSheet UI（Chat Header 入口、列表 + 详情）。
- 2026-01-25：彻底移除 `manage_plan`、todo panel 与相关 IPC 类型，提示词切换为 `tasks_*`。
- 2026-01-25：补充 Tasks Store 单元测试与子代理同步工具测试（chatId 隔离、依赖成环、乐观锁冲突、状态时间戳更新）。

## 参考路径（防止上下文丢失）

- 任务工具实现：`packages/agents-tools/src/task/tasks-tools.ts`
- 工具装配入口：`packages/agents-tools/src/create-tools.ts`
- 移动端工具装配：`packages/agents-tools/src/create-tools-mobile.ts`
- Agent 系统提示词：`packages/agents-runtime/src/prompt.ts`
- Agent 上下文（chatId）：`packages/agents-runtime/src/types.ts`
- Vault 路径与校验：`packages/agents-runtime/src/vault-utils.ts`
- Desktop 能力适配：`apps/moryflow/pc/src/main/agent-runtime/desktop-adapter.ts`
- Desktop TasksStore 单例：`apps/moryflow/pc/src/main/agent-runtime/shared-tasks-store.ts`
- Desktop Tasks IPC：`apps/moryflow/pc/src/main/tasks/index.ts`
- Desktop Tasks UI：`apps/moryflow/pc/src/renderer/components/chat-pane/components/tasks-panel.tsx`
- Mobile 能力适配：`apps/moryflow/mobile/lib/agent-runtime/mobile-adapter.ts`
- Mobile TasksService：`apps/moryflow/mobile/lib/agent-runtime/tasks-service.ts`
- Mobile Tasks Hook：`apps/moryflow/mobile/lib/hooks/use-tasks.ts`
- Mobile Tasks UI：`apps/moryflow/mobile/components/chat/TasksSheet.tsx`
- Tasks IPC 类型：`apps/moryflow/pc/src/shared/ipc/tasks.ts`
- 云同步方案：`docs/design/moryflow/features/cloud-sync-unified-implementation.md`
- FileIndex 扫描规则：`apps/moryflow/pc/src/main/cloud-sync/file-index/scanner.ts`
- Tasks Store 规范：`packages/agents-tools/src/task/tasks-store.ts`
