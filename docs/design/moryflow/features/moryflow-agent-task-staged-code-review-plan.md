---
title: Moryflow Agent Task 分块 Code Review 总控
date: 2026-03-07
scope: moryflow
status: completed
---

# Moryflow Agent Task 分块 Code Review 总控

## 1. 目的与边界

当前 `task` 轻量化重构涉及 shared packages、PC main / renderer、Mobile runtime / UI、IPC 契约、提示词、文档与协作文件，暂存区文件过多，不能依赖单次上下文窗口做“一把梭”式 review。

因此，本轮 review 采用 **分块推进 + 每块即时回写 + 最后全局复盘** 的方式执行。

本文件是这轮 staged code review 的唯一事实源，负责记录：

1. review 分块与先后顺序；
2. 每块的文件边界与关注点；
3. 每块的 review 状态、问题、修复与复查结论；
4. 最终全局复盘结论。

约束：

- 评审标准只看 **最佳实践、模块化、单一职责、事实源收口、根因治理**。
- **不考虑历史兼容**；如果为达成最佳实践需要重构，可以直接提出或执行。
- review **不能只看 staged diff**；必须沿调用链、数据链、事件链、测试链回读相关背景文件，重复确认上下游语义后再下结论。
- 任何零散口头 review、对话里的临时判断，都 **不计入正式完成状态**；只有回写到本文件的内容才算 review 进度。

## 2. 评审原则

### 2.1 总原则

1. **单一职责**：一个模块只承担一个稳定职责，禁止把存储、协议、事件、UI 派生糊在一起。
2. **单一事实源**：`task` 真相只能在 `ChatSessionSummary.taskState`，不允许旁路状态。
3. **根因治理**：发现问题后优先修事实源、协议边界、写入口，不接受补丁式兜底。
4. **零兼容包袱**：旧 `tasks_*` 语义、独立 store / IPC / 详情模型如果还残留，直接判为问题。
5. **模块化优先**：review 要优先判断模块边界是否干净，再看局部实现是否正确。
6. **文档与实现同源**：代码事实、测试事实、设计文档事实必须一致。

### 2.2 范围判定原则

1. **Diff 只是入口，不是边界**：staged diff 只用于定位本轮变更起点，不能作为 review 的完整范围。
2. **必须回读背景链路**：每个 block 至少补读以下几类背景文件：
   - 事实源定义（types / schema / session summary / state model）
   - 写入口与持久化路径
   - 广播 / 订阅 / IPC / transport 链路
   - 上游调用者与下游消费者
   - 相关测试与设计文档
3. **必须复读直接依赖**：如果一个文件的行为依赖别处约束，必须把那个约束文件一并纳入 review，而不是只看调用点。
4. **允许重复读背景**：进入新 block 时，若链路再次交叉到已读文件，可以重复加载；宁可重复确认，也不要凭记忆推进。
5. **发现隐含耦合要扩范围**：如果 review 中发现 diff 外仍有关键耦合文件，必须先把它补记到当前 block，再继续审查。

### 2.2 问题判定口径

- `blocking`：违反事实源、生命周期、协议边界、数据一致性或会导致明显回归。
- `important`：虽然暂不致命，但已经破坏职责划分、扩展性或使后续维护明显恶化。
- `follow-up`：不阻塞当前块完成，但建议后续收口。

### 2.3 禁止动作

- 不因为“暂时能跑”就保留旧语义兼容层。
- 不因为“一个文件顺手”就跨块随意扩写 review 范围。
- 不把“修代码”当作“完成 review”；必须先记录问题，再修复，再复查。
- 不把临时结论只留在对话里，必须回写本文件。

## 3. 执行流程

每个 review block 都按以下顺序推进：

1. 打开本文件，找到第一个未完成 block；
2. 先看 staged diff，定位该 block 的主变更文件；
3. 再补读该 block 的背景链路文件：事实源、写入口、上下游调用者、广播/订阅链、相关测试与设计文档；
4. 只在完成上述背景回读后，才开始正式判定问题；
5. 按本文件中的“关注点”逐项审查；
6. 把问题写入该 block 的 findings 区；
7. 若用户要求修复，则先修本 block 问题，再回写修复结果；
8. 修完后做 block 级复查；
9. 状态改为 `completed` 后，才进入下一个 block；
10. 全部 block 完成后，再执行 `R7` 全局复盘。

如果 review 过程中新增改动文件：

- 先把文件归入最相关 block；
- 若无法自然归类，再新增一个 block；
- 未归类文件不得跳过。

## 4. 状态机

每个 block 只能处于以下状态之一：

- `todo`：尚未正式开始
- `reviewing`：正在阅读/判定
- `changes_requested`：已发现问题，待修复
- `fixed_pending_recheck`：问题已修，待复查
- `completed`：本块 review 与复查都已完成

## 5. 总览看板

| Block                     | 状态      | 目标                                                | 依赖    |
| ------------------------- | --------- | --------------------------------------------------- | ------- |
| R1 Shared Runtime + Tools | completed | 锁定 task 协议、工具契约、prompt/compaction 事实源  | 无      |
| R2 PC Main Runtime        | completed | 审查 PC 端持久化、写入口、广播与删除并发            | R1      |
| R3 PC IPC + Renderer      | completed | 审查 PC 对外契约与 snapshot-only UI 消费链          | R1, R2  |
| R4 Mobile Runtime + Hooks | completed | 审查 Mobile 持久化、订阅、生命周期与 hook 链        | R1      |
| R5 Mobile UI              | completed | 审查 `activeSession.taskState -> TasksSheet` 展示链 | R4      |
| R6 Docs + Collaboration   | completed | 审查设计文档、索引与 CLAUDE 同步                    | R1 ~ R5 |
| R7 Global Final Review    | completed | 审查跨块一致性、残留旧语义与系统级风险              | R1 ~ R6 |

## 6. 分块与文件顺序

说明：以下“文件范围”是 **每个 block 的最低加载集合**，不是上限。若 review 过程中发现 diff 外仍有关键上下游文件，必须把它们补进当前 block 的记录中。

### R1 Shared Runtime + Tools

**状态**：`completed`

**目标**：

- 确认 `task` 共享协议、校验规则、错误边界、prompt 与 compaction 语义一致；
- 确认 shared package 不再残留旧 `tasks_*` 心智与导出边界问题。

**文件范围**：

- `packages/agents-runtime/package.json`
- `packages/agents-runtime/CLAUDE.md`
- `packages/agents-runtime/src/index.ts`
- `packages/agents-runtime/src/session.ts`
- `packages/agents-runtime/src/task-state.ts`
- `packages/agents-runtime/src/prompt.ts`
- `packages/agents-runtime/src/compaction.ts`
- `packages/agents-runtime/src/ui-message/tool-command-summary.ts`
- `packages/agents-runtime/src/__tests__/compaction.test.ts`
- `packages/agents-runtime/src/__tests__/prompt.test.ts`
- `packages/agents-runtime/src/__tests__/task-state.test.ts`
- `packages/agents-runtime/src/__tests__/tool-command-summary.test.ts`
- `packages/agents-tools/CLAUDE.md`
- `packages/agents-tools/src/create-tools.ts`
- `packages/agents-tools/src/create-tools-mobile.ts`
- `packages/agents-tools/src/index.ts`
- `packages/agents-tools/src/index.browser.ts`
- `packages/agents-tools/src/index.react-native.ts`
- `packages/agents-tools/src/task/task-labels.ts`
- `packages/agents-tools/src/task/task-state.ts`
- `packages/agents-tools/src/task/task-tool.ts`
- `packages/agents-tools/test/create-pc-tools.spec.ts`
- `packages/agents-tools/test/create-pc-tools-subagent.spec.ts`
- `packages/agents-tools/test/index.browser.spec.ts`
- `packages/agents-tools/test/task-state.spec.ts`
- `packages/agents-tools/test/task-tool.spec.ts`
- `packages/agents-tools/tsconfig.json`

**重点检查**：

1. `TaskState` / `TaskItem` / `EMPTY_TASK_STATE` 是否是唯一事实源；
2. `task` 工具是否只保留 `get/set/clear_done`；
3. `validation_error` / `runtime_error` 是否职责清晰；
4. prompt 是否要求复杂任务优先 `task`，恢复/压缩后先 `task.get`；
5. compaction 是否完全摆脱旧 `tasks_*` / `manage_plan` 依赖；
6. browser / react-native 入口是否不再暴露旧重型协议。

**记录模板**：

- Findings:
- 修复记录:
- 复查结论:

### R2 PC Main Runtime

**状态**：`completed`

**目标**：

- 审查 PC 主进程内 task 的事实源、写入口、事件广播、删除并发、持久化一致性。

**文件范围**：

- `apps/moryflow/pc/src/main/CLAUDE.md`
- `apps/moryflow/pc/src/main/agent-runtime/index.ts`
- `apps/moryflow/pc/src/main/agent-runtime/task-state-service.ts`
- `apps/moryflow/pc/src/main/agent-runtime/__tests__/task-state-service.spec.ts`
- `apps/moryflow/pc/src/main/chat-session-store/handle.ts`
- `apps/moryflow/pc/src/main/chat-session-store/handle.test.ts`
- `apps/moryflow/pc/src/main/chat-session-store/session-store-adapter.ts`
- `apps/moryflow/pc/src/main/chat/chat-request.ts`
- `apps/moryflow/pc/src/main/chat/handlers.ts`
- `apps/moryflow/pc/src/main/chat/handlers.session-delete.test.ts`
- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`

**重点检查**：

1. `taskState` 是否只写入 session metadata；
2. `TaskStateService` 是否是唯一写入口；
3. `chat:sessions:delete` 是否先停流再删会话；
4. session update event 是否是唯一广播路径；
5. 已删 `tasks-store/shared-tasks-store` 是否仍有语义残留；
6. main 进程是否还有旁路写 session/taskState 的地方。

**记录模板**：

- Findings:
- 修复记录:
- 复查结论:

### R3 PC IPC + Renderer

**状态**：`completed`

**目标**：

- 审查 PC 的对外契约、preload 暴露、renderer 消费链是否已完全切到 snapshot-only 模型。

**文件范围**：

- `apps/moryflow/pc/CLAUDE.md`
- `apps/moryflow/pc/README.md`
- `apps/moryflow/pc/src/shared/ipc/CLAUDE.md`
- `apps/moryflow/pc/src/shared/ipc/chat.ts`
- `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- `apps/moryflow/pc/src/shared/ipc/index.ts`
- `apps/moryflow/pc/src/preload/index.ts`
- `apps/moryflow/pc/src/renderer/CLAUDE.md`
- `apps/moryflow/pc/src/renderer/components/chat-pane/CLAUDE.md`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-footer.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/task-hover-panel.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/task-hover-panel.test.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/index.ts`

**重点检查**：

1. `DesktopApi.tasks` / `tasks:list/get/changed` 是否彻底移除；
2. renderer 是否只消费 `activeSession.taskState`；
3. task 面板是否还依赖运行态、详情查询或独立 store；
4. README / CLAUDE / IPC 契约是否与实现一致；
5. renderer 是否残留旧 `useTasks` 心智。

**记录模板**：

- Findings:
- 修复记录:
- 复查结论:

### R4 Mobile Runtime + Hooks

**状态**：`completed`

**目标**：

- 审查 Mobile 端 session store、taskState 写路径、订阅链、会话切换/删除生命周期。

**文件范围**：

- `apps/moryflow/mobile/CLAUDE.md`
- `apps/moryflow/mobile/lib/CLAUDE.md`
- `apps/moryflow/mobile/lib/agent-runtime/index.ts`
- `apps/moryflow/mobile/lib/agent-runtime/runtime.ts`
- `apps/moryflow/mobile/lib/agent-runtime/session-store.ts`
- `apps/moryflow/mobile/lib/agent-runtime/task-state-service.ts`
- `apps/moryflow/mobile/lib/agent-runtime/__tests__/task-state-service.spec.ts`
- `apps/moryflow/mobile/lib/hooks/session-selection.ts`
- `apps/moryflow/mobile/lib/hooks/use-chat-sessions.ts`
- `apps/moryflow/mobile/lib/hooks/__tests__/use-chat-sessions.spec.ts`
- `apps/moryflow/mobile/lib/chat/session-lifecycle.ts`
- `apps/moryflow/mobile/lib/chat/__tests__/session-lifecycle.spec.ts`
- `apps/moryflow/mobile/vitest.config.ts`

**重点检查**：

1. `taskState` 是否只经 session store 持久化；
2. `updateSession` / `deleteSession` 对缺失 session 是否 fail-fast；
3. `onSessionEvent -> useChatSessions -> activeSession` 链是否稳定；
4. 删除 active session、切换 session、组件卸载时是否先 `stop()`；
5. test infra 是否足以守住 hook 集成回归；
6. mobile 是否还残留独立 task service/store 语义。

**记录模板**：

- Findings:
- 修复记录:
- 复查结论:

### R5 Mobile UI

**状态**：`completed`

**目标**：

- 审查 Mobile UI 是否只作为 snapshot 投影层，不再承载旧 task 详情系统语义。

**文件范围**：

- `apps/moryflow/mobile/components/CLAUDE.md`
- `apps/moryflow/mobile/components/chat/ChatScreen.tsx`
- `apps/moryflow/mobile/components/chat/TasksSheet.tsx`
- `apps/moryflow/mobile/components/chat/tasks-sheet-model.ts`
- `apps/moryflow/mobile/components/chat/hooks/use-chat-state.ts`
- `apps/moryflow/mobile/lib/chat/__tests__/tasks-sheet-model.spec.ts`

**重点检查**：

1. `TasksSheet` 是否只消费 `taskState`；
2. `ChatScreen` 是否只通过 `activeSession.taskState` 透传；
3. UI 是否还残留 detail / selection / refresh / polling 心智；
4. `note` 是否只作为轻量辅助说明展示；
5. `activeSession.taskState -> TasksSheet` 主链路是否完整、直观、低耦合。

**记录模板**：

- Findings:
- 修复记录:
- 复查结论:

### R6 Docs + Collaboration

**状态**：`completed`

**目标**：

- 审查设计文档、索引、协作文档是否与当前代码事实完全一致。

**文件范围**：

- `docs/CLAUDE.md`
- `docs/index.md`
- `docs/design/moryflow/core/agent-runtime-control-plane-adr.md`
- `docs/design/moryflow/core/agent-tasks-system.md`
- `docs/design/moryflow/core/agents-tools-runtime-inventory-and-pruning-plan.md`
- `docs/design/moryflow/core/index.md`
- `docs/design/moryflow/features/chat-input-and-chat-pane.md`
- `docs/design/moryflow/features/chat-tool-bash-card-redesign-plan.md`
- `docs/design/moryflow/features/index.md`
- `docs/design/moryflow/features/moryflow-agent-runtime-tool-simplification-plan.md`
- `docs/design/moryflow/features/moryflow-agent-task-lightweight-redesign-plan.md`
- `docs/design/moryflow/features/moryflow-agent-task-staged-code-review-plan.md`

**重点检查**：

1. 文档是否还有“待完成 / 兼容期 / 旧 tasks\_\*”残留；
2. 索引是否能正确指向当前事实源；
3. CLAUDE / design / 实现 是否三者一致；
4. review 进度是否按本文件持续回写；
5. 任何新发现问题是否已回写到正确事实源文档。

**记录模板**：

- Findings:
- 修复记录:
- 复查结论:

### R7 Global Final Review

**状态**：`completed`

**目标**：

- 在 R1 ~ R6 全部完成后，做一次系统级复盘，只看跨块一致性与残留系统性问题。

**全局检查问题**：

1. 是否仍存在第二事实源或旁路写入；
2. 是否仍存在旧 `tasks_*` 名称、接口、数据模型、测试心智残留；
3. PC / Mobile / shared packages / docs 的语义是否一致；
4. 生命周期（创建、更新、删除、恢复、压缩、继续执行）是否统一；
5. UI 是否已经彻底变成 snapshot-only 消费层；
6. 文档是否足以支撑后续继续开发与后续 reviewer 接力。

**输出要求**：

- 全局 blocking issues
- 全局 important issues
- 非阻塞 follow-up
- 是否允许继续后续开发

## 7. Findings 记录格式

每条正式问题必须使用统一模板：

```md
### F-<Block>-<编号>

- 等级：blocking | important | follow-up
- 文件：`path/to/file.ts`
- 结论：一句话说明问题
- 根因：为什么在当前代码库里成立
- 建议：按最佳实践应如何收口
- 状态：resolved（2026-03-07，本轮修复与复查已闭环） | fixed | verified | rejected
```

如果某条外部 review/comment 最终判定 **不成立**，也必须记录：

```md
### N-<Block>-<编号>

- 来源：外部 review / 自检
- 结论：not applicable
- 依据：为什么对当前代码库不成立
```

## 8. 推进约束

1. **一次只推进一个 block**，不要跨块并行 review。
2. **每个 block 结束必须回写本文件**，否则不得进入下一个 block。
3. **修复后必须复查**，不能把“已改代码”直接等同于“问题关闭”。
4. **所有结论优先服务于长期结构质量**，不为短期兼容保留坏边界。
5. **如果中途新增 staged 文件**，必须先更新本文件的 block 归属，再继续 review。

## 9. 启动规则

从下一次正式 staged review 开始：

1. 先打开本文件；
2. 从 `R1 Shared Runtime + Tools` 开始；
3. 先看 diff，再沿链路补读背景文件后再做正式判定；
4. 完成一个 block，就把状态和 findings 写回这里；
5. 直到 `R7 Global Final Review` 完成为止。

## 10. 执行结果（2026-03-07）

### 10.1 总结论

- 本轮按 `R1 -> R7` 完成了整批 staged task 重构 review，并严格补读了调用链、数据链、事件链、测试链与相关文档，不是 diff-only 审查。
- 当前结论：**R1 ~ R7 的 review findings 已全部闭环，当前实现可以作为“完全冻结、放心开工”的基线继续开发。**
- 统计：`2` 个 `blocking`、`9` 个 `important`、`4` 个 `follow-up`。
- 允许的下一步：以后续功能开发为主；若 task 链路再调整，继续以本文件记录的事实源与回归清单作为 review 基线。

### 10.2 R1 Shared Runtime + Tools

#### Findings

### F-R1-01

- 等级：important
- 文件：`packages/agents-tools/src/task/task-tool.ts:24`, `packages/agents-tools/src/task/task-tool.ts:67`, `packages/agents-tools/test/task-tool.spec.ts:1`
- 结论：`task` 的输入校验错误没有真正收口到冻结合同里的 `validation_error`，而是会在进入 `execute()` 前泄露成框架层 `InvalidToolInputError`。
- 根因：`set` 缺 `items`、`get/clear_done` 非法携带 `items` 这些 task 专属约束被放在 `tool(...).parameters` 的 Zod schema 边界；schema 失败后 `mapError()` 根本拿不到错误。
- 建议：把 task 合同校验下沉到 `execute()` 内显式 `safeParse` 并统一映射，或在更外层专门拦截 schema error；同时补 `set` 缺 `items`、`get` 携带 `items`、非法 `action` 的回归测试。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

### F-R1-02

- 等级：important
- 文件：`packages/agents-tools/src/task/task-state.ts:58`, `packages/agents-tools/src/task/task-state.ts:117`, `docs/design/moryflow/core/agent-tasks-system.md:80`, `docs/design/moryflow/features/moryflow-agent-task-lightweight-redesign-plan.md:164`
- 结论：在调用方省略 `id` 的常规 `task.set` 路径下，同一份 checklist 重复提交仍会不断生成新 task identity，破坏“无变化保留原 snapshot / 原 updatedAt”的冻结语义。
- 根因：`normalizeTaskState()` 先为每个缺失 `id` 的条目调用 `createId()`，随后才做等价比较；而设计文档与示例又明确允许、甚至默认省略 `id`。
- 建议：二选一尽快冻结：要么在缺省 `id` 时优先复用当前 snapshot 的稳定 identity，要么把 `id` 收紧为调用方必传并同步修正文档/提示词/测试。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

#### 复查结论

- `prompt.ts` 已明确“复杂任务优先 task、恢复/压缩后先 task.get”；`compaction.ts` 也未再保留 `manage_plan` 旧保护。
- R1 的核心问题集中在工具输入合同与 snapshot 稳定性，而不是旧命名残留。

### 10.3 R2 PC Main Runtime

#### Findings

### F-R2-01

- 等级：important
- 文件：`apps/moryflow/pc/src/main/chat-session-store/session-store-adapter.ts:14`, `apps/moryflow/pc/src/main/chat-session-store/session-store-adapter.ts:23`, `apps/moryflow/pc/src/main/chat-session-store/session-store-adapter.ts:62`, `apps/moryflow/pc/src/main/chat-session-store/handle.ts:201`
- 结论：`taskState` 仍然能通过通用 session metadata API 直接落盘，`TaskStateService` 没有被主进程模块边界强制成唯一写入口。
- 根因：`session-store-adapter` 仍把 `taskState` 当成普通 `Partial<ChatSessionSummary>` 元数据字段透传给 `chatSessionStore.updateSessionMeta()`；这条路径会绕过 `task-state-service.ts` 里的规范化、no-op 保持与统一广播职责。
- 建议：从通用 `updateSession` / `updateSessionMeta` 契约移除 `taskState`，给 `TaskStateService` 暴露最小持久化 port；fork 复制保留在 session 创建/复制路径即可，不要继续把 `taskState` 当普通 metadata 字段开放。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

### F-R2-02

- 等级：follow-up
- 文件：`apps/moryflow/pc/src/main/agent-runtime/index.ts:394`, `apps/moryflow/pc/src/main/agent-runtime/__tests__/task-state-service.spec.ts:73`, `apps/moryflow/pc/src/main/chat-session-store/handle.test.ts:72`
- 结论：当前测试只覆盖 service/store 单测，没有锁住真实 runtime 组装层 `TaskStateService -> broadcastSessionEvent` 这条关键集成链。
- 根因：`task-state-service.spec.ts` 是手工注入 `emitSessionUpdated` 的隔离单测，`handle.test.ts` 只验证 store 持久化，尚未覆盖 `createAgentRuntime()` 的实际装配结果。
- 建议：补一条主进程 composition/integration test，至少验证 `task` 写入最终一定复用 `chat:session-event` 广播。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

#### 复查结论

- `chat:session-event` 仍是 PC renderer 的实际消费通道，`chat:sessions:delete` 也已经先 stop 再 delete。
- R2 当前主要问题不是删除顺序，而是“唯一写入口”边界还没有真正封死。

### 10.4 R3 PC IPC + Renderer

#### Findings

### F-R3-01

- 等级：important
- 文件：`apps/moryflow/pc/README.md:42`, `apps/moryflow/pc/README.md:44`, `apps/moryflow/pc/README.md:81`, `apps/moryflow/pc/README.md:103`, `apps/moryflow/pc/README.md:125`
- 结论：PC README 仍在描述重构前的工具面与目录结构，会把后续开发者带回 `manage-plan`、直连文件工具与旧子代理分型心智。
- 根因：README 只局部把名字改成了 `task`，没有随 Bash-First + session-backed `taskState` 的新实现整体重写。
- 建议：按当前真实实现重写 README：默认工具面应以 `web_fetch/web_search/generate_image/task + bash + subagent + skill + MCP/external` 为准，删除 `Vault 操作（9 个）`、`explore/research/batch`、`base-tools.ts`、`manage-plan.ts` 等旧事实。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

### F-R3-02

- 等级：important
- 文件：`apps/moryflow/pc/src/renderer/CLAUDE.md:149`, `apps/moryflow/pc/src/renderer/CLAUDE.md:150`, `apps/moryflow/pc/src/shared/ipc/chat.ts:91`, `apps/moryflow/pc/src/preload/index.ts:197`
- 结论：Renderer 协作说明仍保留两条已失效事实：task 面板复用 browser 标签、mode 切换是会话级并回写会话；都与当前 renderer / IPC 链路不一致。
- 根因：`CLAUDE.md` 的活跃指导区没有随着 snapshot-only task UI 与全局权限模式重构同步收口。
- 建议：把说明改成当前口径：task 面板只消费 `activeSession.taskState`，不依赖 browser labels；mode 统一是 `chat:permission:*` 全局状态，由 `useChatSessions.globalMode` 驱动，不再回写 session。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

### F-R3-03

- 等级：follow-up
- 文件：`apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-footer.tsx:1`
- 结论：`chat-footer.tsx` 的文件 Header 仍写着“仅在会话运行时触发任务面板展示”，但实现已经切到 `activeSession?.taskState` 驱动。
- 根因：代码行为已变，文件头部事实没有同步更新。
- 建议：更新或删除这条 Header 说明，避免继续按旧的 running gating 理解组件职责。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

### F-R3-04

- 等级：follow-up
- 文件：`apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-sessions.test.tsx:1`, `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-footer.tsx:44`, `apps/moryflow/pc/src/renderer/components/chat-pane/components/task-hover-panel.tsx:50`
- 结论：Renderer 核心主链 `chat:session-event -> useChatSessions -> activeSession.taskState -> ChatFooter/TaskHoverPanel` 目前没有回归测试守护。
- 根因：现有 hook 测试只覆盖 hydration 与订阅释放，没有把 IPC 事件语义和 `taskState` 事实源纳入断言。
- 建议：补一个 hook 级回归，用完整 `ChatSessionSummary` fixture 驱动 `updated/deleted` 事件，断言 `activeSession.taskState`、active fallback 与面板消费链。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

#### 复查结论

- `DesktopApi.tasks` / `tasks:list/get` / `tasks.ts` 的实现残留已经删除；R3 的问题集中在文档事实漂移与回归测试缺口。

### 10.5 R4 Mobile Runtime + Hooks

#### Findings

### F-R4-01

- 等级：blocking
- 文件：`apps/moryflow/mobile/lib/agent-runtime/session-store.ts:258`, `apps/moryflow/mobile/lib/agent-runtime/session-store.ts:304`, `apps/moryflow/mobile/lib/agent-runtime/session-store.ts:375`
- 结论：`deleteSession()` 还不是 authoritative delete：会话不存在时不会 fail-fast，仍会广播 `deleted`，而且只删 `chat_history_*`，不会删 `chat_ui_messages_*`。
- 根因：删除路径没有像 `updateSession()` 一样先确认事实源存在，也没有把会话附属 blobs 视为同一个聚合一起删除。
- 建议：删除必须先做 missing-session 断言，并把 session summary / history / uiMessages 放进同一个删除事务边界，全部完成后再广播 `deleted`。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

### F-R4-02

- 等级：blocking
- 文件：`apps/moryflow/mobile/lib/agent-runtime/session-store.ts:282`, `apps/moryflow/mobile/lib/agent-runtime/session-store.ts:375`, `apps/moryflow/mobile/lib/agent-runtime/runtime.ts:373`, `apps/moryflow/mobile/lib/agent-runtime/runtime.ts:386`, `apps/moryflow/mobile/lib/agent-runtime/runtime.ts:472`
- 结论：历史与 UI 消息写入仍是“先写 side blob，再用 `updateSession()` 做存在性校验”，删除竞争下依然可能把孤儿 `history/uiMessages` 重新写回存储。
- 根因：`chat_sessions`、`chat_history_*`、`chat_ui_messages_*` 被拆成多个事实源，且写路径把 session 存在性校验放在 side-write 之后；`stop() -> delete()` 只是降低概率，没有从存储模型上消灭 race。
- 建议：最佳实践是把会话摘要、历史、UI 消息统一到一个 session 聚合写入口；若短期不大改，至少也要在 side-write 前做存在性断言，并在 missing-session 时回滚刚写入的 key。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

### F-R4-03

- 等级：important
- 文件：`apps/moryflow/mobile/lib/hooks/use-chat-sessions.ts:90`, `apps/moryflow/mobile/lib/hooks/use-chat-sessions.ts:110`, `apps/moryflow/mobile/lib/hooks/use-chat-sessions.ts:122`, `apps/moryflow/mobile/lib/hooks/use-chat-sessions.ts:161`
- 结论：`useChatSessions` 现在同时把 `onSessionEvent` 和本地 imperative mutation 当成 `sessions` 写源，偏离了“事件链唯一事实源”；同时 `deleteSession()` / `renameSession()` 还会吞掉错误只打日志。
- 根因：这个 hook 混合了命令下发、事件收敛和本地状态修补三种职责，导致 `sessions` 不再只有一条收敛链，生命周期 helper 也无法感知失败。
- 建议：让 `sessions` 只由 bootstrap / refresh / onSessionEvent 更新；`create/delete/rename` 只负责调用 runtime 命令并维护 `activeSessionId` 之类纯 UI 选择态，错误应显式向调用方返回。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

### F-R4-04

- 等级：follow-up
- 文件：`apps/moryflow/mobile/lib/agent-runtime/__tests__/task-state-service.spec.ts:155`, `apps/moryflow/mobile/lib/hooks/__tests__/use-chat-sessions.spec.ts:99`, `apps/moryflow/mobile/lib/chat/__tests__/session-lifecycle.spec.ts:12`
- 结论：现有测试守住了 taskState happy path、`updated event -> activeSession.taskState` 传播与 `stop before delete` 顺序，但还没守住 authoritative delete contract。
- 根因：测试重点仍停留在 taskState 写入与 helper 顺序，没有把“删除是 session 生命周期边界”提升到 session-store / hook 集成层。
- 建议：至少补 4 类回归：missing session 删除必须 reject、delete 后清空 `history + uiMessages`、`deleted event -> active fallback`、delete 与 `appendHistory/saveUiMessages` 并发不留孤儿 key。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

#### 复查结论

- `taskState -> session-store -> onSessionEvent -> useChatSessions` 主链方向正确，旧 `tasks-store/tasks-service/use-tasks` 也已删除。
- 本轮修复后，Mobile 已达到“删除边界 authoritative、事件链单一事实源”的冻结标准：`deleteSession()` fail-fast 且同边界删除 summary/history/uiMessages，`useChatSessions()` 只由 bootstrap/refresh/session-event 收口 sessions，删除与写入竞争的回归也已补齐。

### 10.6 R5 Mobile UI

#### Findings

- 无新增问题。

#### 复查结论

- `apps/moryflow/mobile/components/chat/ChatScreen.tsx:294` 已直接把 `activeSession?.taskState` 传给 `TasksSheet`。
- `apps/moryflow/mobile/components/chat/TasksSheet.tsx:36` 与 `apps/moryflow/mobile/components/chat/tasks-sheet-model.ts:25` 都是纯 snapshot 投影；没有 detail / selection / refresh / polling 残留。
- `apps/moryflow/mobile/lib/hooks/__tests__/use-chat-sessions.spec.ts:99` 已覆盖 `updated event -> activeSession.taskState -> checklist rows` 主链回归。

### 10.7 R6 Docs + Collaboration

#### Findings

### F-R6-01

- 等级：important
- 文件：`docs/CLAUDE.md:46`, `docs/index.md:43`, `docs/design/moryflow/features/index.md:23`, `docs/design/moryflow/features/moryflow-agent-task-lightweight-redesign-plan.md:5`, `docs/design/moryflow/features/moryflow-agent-task-lightweight-redesign-plan.md:546`
- 结论：多个入口文档仍宣称 task 轻量化“已完成 staged review / 已最终冻结 / lint+typecheck+unit 全绿”，这和本轮全量 staged review 的实际结论冲突。
- 根因：之前的冻结复审结论被提前写成了完成态，但这次覆盖 shared / PC / Mobile / docs 的整批 review 又发现了新的 blocking / important 问题，入口文档没有回滚状态。
- 建议：在所有入口文档显式改成“实现已落地，但 full staged review 仍有 open findings，以本总控文档为当前事实源”，不要再把 lightweight plan 标成已完成冻结版。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

### F-R6-02

- 等级：important
- 文件：`docs/design/moryflow/core/agent-tasks-system.md:60`, `docs/design/moryflow/features/moryflow-agent-task-lightweight-redesign-plan.md:498`, `docs/design/moryflow/features/moryflow-agent-task-lightweight-redesign-plan.md:509`
- 结论：设计文档已经把“`TaskStateService` 是唯一写入口 / 不存在双轨写入 / Hook 不直接 patch session”写成了当前事实，但实现还没有真正达到这个状态。
- 根因：文档把目标边界和当前实现混成了同一口径；而 PC `session-store-adapter` 的 `taskState` 侧门、Mobile `useChatSessions` 的本地 patch、多 key 删除/写入竞争都还存在。
- 建议：把设计目标与当前偏差显式分层：目标仍保持零兼容/单一职责，但在文档中注明当前 open deviations，并把修复事实统一回写到本总控文档关闭后再恢复 completed 口径。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

#### 复查结论

- 文档目录结构与索引链路已按最新实现与验证结果回写，task 相关入口文档不再存在“完成态早于事实”的漂移。

### 10.8 R7 Global Final Review

#### Findings

### F-R7-01

- 等级：important
- 文件：`packages/agents-runtime/src/session.ts:42`, `apps/moryflow/pc/src/main/chat-session-store/session-store-adapter.ts:62`, `apps/moryflow/mobile/lib/agent-runtime/session-store.ts:234`, `apps/moryflow/mobile/lib/agent-runtime/index.ts:46`
- 结论：跨端“唯一 task 写入口”没有真正冻结，根因已经上移到共享会话契约：`SessionStore.updateSession(id, Partial<ChatSessionSummary>)` 仍把 `taskState` 当普通会话 patch 字段暴露出去。
- 根因：shared session 协议没有把 taskState 从通用 summary patch 中拆出来，导致 PC adapter、Mobile session-store 与对外导出天然保留 side-write 能力，文档里的“唯一写入口”只能靠约定而不是类型/模块边界保证。
- 建议：按最佳实践直接破坏性重构：把 `SessionStore` 切成更窄的 ports（如 `renameSession/updateSessionPrefs/setTaskState/clearTaskState`），让 taskState 只能经 `TaskStateService` 进入持久化层。
- 状态：resolved（2026-03-07，本轮修复与复查已闭环）

#### 全局结论

- 本轮 staged review 的 `blocking / important / follow-up` findings 已全部闭环，并已回写对应实现、测试、README、CLAUDE 与设计文档。
- 关键收口点已经冻结：
  - shared `task` 工具运行期合同已固定为 `missing_context / validation_error / runtime_error`，重复 `set` 在省略 `id` 时保持 snapshot identity 稳定；
  - shared `SessionStore` 已移除通用 `updateSession` patch，PC / Mobile 现在都通过专用 `setTaskState` 入口持久化 taskState；
  - Mobile delete contract 已升级为 authoritative delete，`history/uiMessages` 写入与删除竞争不再留下孤儿数据；
  - PC renderer 与 Mobile hook/UI 都只消费 `activeSession.taskState`，不再存在任务面板双写源或独立 task 读模型；
  - 入口文档、索引、CLAUDE 与实现口径已重新对齐。
- 回归与验证已经补齐：shared task tool / runtime 协议、PC main wiring / renderer hook、Mobile session-store / hook / lifecycle 主链都有定向回归，根级 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 也已通过。
- 是否允许继续后续开发：**允许**。当前版本可作为 task 轻量化改造的冻结基线继续开发。
