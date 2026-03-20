---
title: Moryflow PC Agent Runtime 模块化重构方案
date: 2026-03-21
scope: apps/moryflow/pc/src/main/agent-runtime
status: implemented
---

# Moryflow PC Agent Runtime 模块化重构方案

## 当前状态

本方案已完成实现，当前代码状态为：

- `index.ts` 已退回稳定入口，只负责导出 runtime factory / session / vault context
- `runtime-factory.ts` 成为装配层 owner，`runtime-events.ts` 负责顶层事件绑定
- Memory 子域已收敛为 `memory-scope.ts` / `memory-capability.ts` / `memory-tooling.ts` / `knowledge-reader.ts` / `memory-prompt.ts`
- `permission/`、`tooling/`、`mcp/`、`session/`、`prompt/`、`tracing/`、`registry/` 已完成一级分域
- 主进程调用点与正式 design/reference 文档已同步到新目录结构

## 1. 背景

当前 `apps/moryflow/pc/src/main/agent-runtime` 已经承载了过多职责：

- `index.ts` 同时负责 runtime 装配、model factory、toolset 装配、Memory/Knowledge scope 解析、prompt 注入、external tools、MCP 管理、membership 响应、会话运行前预处理。
- `agent-runtime` 根目录同时平铺了 memory、permission、audit、task state、prompt、tooling、desktop adapter、runtime context 等多个子域文件。
- 新需求已经开始被迫在根目录继续追加 `memory-capability.ts`、`memory-tooling.ts` 这类中层模块，说明现有结构的扩展方式已经失真。

这不是单纯的“文件太大”。真正的问题是：

1. **装配层与业务层耦合**：runtime 入口文件既是 composition root，又承载大量业务规则。
2. **子域边界缺失**：Memory、Permission、Tooling、Session、Prompt 等概念在同一层级平铺，维护时难以判断职责归属。
3. **事实源分裂**：同一类规则经常在 tool 注入、prompt 注入、运行前预热、IPC 调用等多个位置重复解析。
4. **测试颗粒度失真**：已有测试虽然不少，但很多仍围绕“文件名”而不是“子域职责”组织，导致重构成本越来越高。

如果继续在当前结构上迭代，短期还可以工作，但会持续恶化：

- 新增一个子能力，就要继续在 `index.ts` 堆一层 wiring + 状态判断。
- 运行时能力边界会继续分散在多个文件里，越来越依赖约定而不是结构。
- 未来的 Memory、MCP、subagent、tool policy 等演进，会把 `agent-runtime` 根目录变成新的“主进程垃圾场”。

因此这次重构目标不是“把大文件拆小”，而是**把 PC Agent Runtime 收敛成稳定的子域架构**。

## 2. 重构目标

本次目标固定为以下 6 条：

1. **`index.ts` 只保留 composition root 职责**
   - 只做依赖初始化、子模块装配、事件订阅、对外 runtime API 暴露。
   - 不再包含具体子域规则。

2. **按子域建模而不是按实现细节平铺文件**
   - Memory、Tooling、Permission、Prompt、Session、Runtime Core 必须有清晰目录边界。

3. **同一业务规则只能有一个事实源**
   - 例如 Memory capability、Memory scope、tool gating、prompt gating 不能再各自维护一套逻辑。

4. **单一职责**
   - 每个模块要么负责“状态解析”，要么负责“工具构建”，要么负责“装配与生命周期”，不能三者混在一起。

5. **可测试**
   - 新结构必须天然支持单元测试、Harness 测试和运行时回归，不依赖超大集成测试文件才能建立信心。

6. **不保留历史包袱**
   - 不保留“先放这里以后再整理”的临时目录。
   - 不保留与目标结构冲突的旧 facade、旧 helper、旧 wiring。

## 3. 非目标

本次不做：

- 重写整个 agents runtime 协议
- 改动 mobile agent runtime 结构
- 改动 `packages/agents-runtime` 的公共抽象
- 把所有测试一次性迁移成新的风格，只要求覆盖重构后的核心边界

## 4. 根因分析

### 4.1 现状中的结构问题

当前 `agent-runtime` 有三个层级被混在了一起：

1. **平台层**
   - Model factory
   - MCP manager
   - Permission runtime
   - Doom loop
   - Tool output truncation

2. **产品层**
   - Memory / Knowledge tools
   - Chat session scope
   - Workspace profile
   - Vault-bound file reading

3. **运行时装配层**
   - 依赖注入
   - 事件监听
   - runtime API 暴露
   - run 前准备

这三层混在一起的直接后果是：

- 产品规则必须依附在 runtime 入口才能生效。
- 运行时装配修改时会误伤产品规则。
- 难以单独测试“一个规则”，只能通过大集成入口侧面验证。

### 4.2 Memory 能力只是暴露了现有结构问题

这次 Memory tool 的问题本质上不是“未登录时报错”，而是：

- tool 注入
- prompt 注入
- workspace 解析
- knowledge_read 本地边界

这些都没有单一事实源，因此一改就要同时动多个位置。

也就是说，Memory 不是特殊例外，而是当前 `agent-runtime` 结构失真后最先爆出来的症状。

## 5. 设计原则

### 5.1 目录按子域而不是按技术类型拆

错误做法：

- `tools/`
- `prompts/`
- `helpers/`
- `utils/`

这类目录会把同一产品能力再次拆散。

正确做法：

- `memory/`
- `runtime/`
- `tooling/`
- `permission/`
- `session/`
- `tracing/`

### 5.2 Composition Root 单独收口

`index.ts` 必须是 composition root，不再承担业务逻辑。

允许它做的事：

- 初始化依赖
- 创建子域模块
- 订阅顶层事件
- 暴露 runtime 接口

不允许它做的事：

- 解析 Memory capability
- 决定 knowledge_read scope
- 拼接 memory prompt 规则
- 手写 tool gating 策略

### 5.3 一个规则只有一个 owner

例如 Memory 子域内：

- `scope` 负责解析会话/工作区绑定
- `capability` 负责把 scope 解释成读写能力
- `tooling` 负责把 capability 解释成 tool set + prompt
- `reader` 负责 knowledge_read 的本地文件读取边界

上层只依赖这些结果，不重复实现。

## 6. 目标架构

目标目录结构如下：

```text
apps/moryflow/pc/src/main/agent-runtime/
  index.ts

  runtime/
    runtime-factory.ts
    runtime-events.ts
    runtime-config.ts
    runtime-vault-context.ts
    desktop-adapter.ts

  session/
    session-scope.ts
    chat-session.ts
    task-state-runtime.ts
    task-state-service.ts

  memory/
    memory-scope.ts
    memory-capability.ts
    memory-prompt.ts
    memory-tooling.ts
    memory-tools.ts
    knowledge-tools.ts
    knowledge-reader.ts

  tooling/
    external-tools.ts
    subagent-tools.ts
    skill-tool.ts
    tool-output-storage.ts

  permission/
    permission-runtime.ts
    permission-runtime-guards.ts
    permission-audit.ts
    permission-store.ts
    doom-loop-runtime.ts
    bash-audit.ts
    audit-log.ts

  mcp/
    mcp-manager.ts
    mcp-utils.ts

  prompt/
    prompt-resolution.ts

  tracing/
    tracing-setup.ts
    server-tracing-processor.ts

  registry/
    agent-store.ts
```

说明：

- `index.ts` 仍保留在根目录，作为稳定入口。
- 根目录除了 `index.ts` 和少数目录级 README，不再长期堆业务文件。
- Memory 相关文件全部进入 `memory/`，避免继续散落。
- `task-state-*` 不再留在根目录，而是归入 `session/`。
- `prompt-resolution.ts` 单独归入 `prompt/`，避免与 Memory prompt 混淆。

## 7. 模块职责定义

### 7.1 runtime/

职责：

- 创建 runtime 实例
- 组装各子域依赖
- 连接子域输出
- 处理顶层生命周期事件

不负责：

- 具体 Memory 规则
- 具体 permission rule
- tool 选择逻辑

关键文件：

- `runtime-factory.ts`
  - 创建 model factory、agent factory、wrapped tools
- `runtime-events.ts`
  - membership change / settings change / MCP reload / vault change 的统一响应

### 7.2 session/

职责：

- chat session scope
- vault-root 解析
- task state

关键规则：

- 会话绑定的 `profileKey / vaultPath` 是 session 事实源
- session scope 解析失败时必须 fail-closed，由上层 capability 决定是否暴露能力

### 7.3 memory/

这是本次重构最重要的子域。

#### `memory-scope.ts`

职责：

- 从 `chatId`、`chatSessionStore`、`workspaceProfileService`、active profile 解析 Memory scope
- 输出明确的 scope 结果，而不是直接混入 capability 或 tool 逻辑

输出固定为：

- `session_resolved`
- `session_unresolved`
- `active_resolved`
- `workspace_unavailable`
- `login_required`

#### `memory-capability.ts`

职责：

- 把 scope 转成 capability

只负责这些问题：

- 能不能读 memory / knowledge
- 能不能写 memory
- 能不能读本地全文

不负责：

- 工具名字
- prompt 文案
- API 调用

#### `memory-tooling.ts`

职责：

- 根据 capability 产生：
  - memory tools
  - knowledge tools
  - memory prompt instructions

这是唯一允许解释“某个 capability 对应哪些 tool”的地方。

#### `knowledge-reader.ts`

职责：

- 对接 `readWorkspaceFileIpc`
- 只处理 knowledge_read 所需的 session-bound local file read 解析

它不再夹在 runtime `index.ts` 里。

#### `memory-prompt.ts`

职责：

- 只负责：
  - memory block 格式化
  - tool instruction 文本模板

不再做 scope 解析。

### 7.4 tooling/

职责：

- 非业务型工具装配
- external tools
- subagent tools
- skill tool
- tool output truncation storage

### 7.5 permission/

职责：

- permission runtime
- doom loop runtime
- audit / bash audit

这几个模块本来就是安全/控制面，应从业务目录里独立出来。

### 7.6 mcp/

职责：

- MCP manager
- MCP utility

不应继续挂在 `core/` 或根目录。

## 8. `index.ts` 重构后的目标形态

`index.ts` 最终应缩成：

1. 初始化底层依赖
2. 调用 `createRuntimeFactory(...)`
3. 注册 runtime 事件监听
4. 导出 `createAgentRuntime()`

也就是说它更像：

```ts
export const createAgentRuntime = () => {
  const deps = createRuntimeDeps();
  const memoryModule = createMemoryModule(deps);
  const toolingModule = createToolingModule(deps, memoryModule);
  const runtime = createRuntimeFactory(deps, toolingModule);
  bindRuntimeEvents(runtime, deps);
  return runtime;
};
```

而不是继续写一千行组合逻辑。

## 9. 关键设计决策

### 9.1 不做“登录态二元开关”

这是一个明确设计决策。

理由：

- `memory_search`
- `memory_save`
- `knowledge_search`
- `knowledge_read`

这四类能力需要的前提并不完全相同。

若只用 `loggedIn` 一个条件，会继续产生：

- 能搜但不该写
- 能搜但不该读本地全文
- 会话 scope 丢失后读错 active workspace

因此需要 capability 分层，而不是单一 `loggedIn`。

### 9.2 fail-closed 优先于 fallback

对于带 `chatId` 的对话运行，session scope 是主事实源。

规则固定为：

- session scope 解析成功：使用 session scope
- session scope 解析失败：禁用对应 Memory/Knowledge tools
- 不允许静默 fallback 到当前 active workspace

只有无会话绑定的预加载场景，才允许 active profile fallback。

### 9.3 prompt 与 tool 必须复用同一 capability

不能出现：

- tool 不注入，但 prompt 还说“你有这些工具”
- tool 注入 A workspace，prompt 却预热 B workspace 的 memory block

因此：

- `memory block`
- `tool instructions`
- `tool exposure`

都必须共享同一 capability / workspace 事实源。

## 10. 实施顺序

### Phase 1：结构冻结

1. 新建目录：
   - `runtime/`
   - `session/`
   - `memory/`
   - `tooling/`
   - `permission/`
   - `mcp/`
   - `prompt/`
   - `tracing/`
   - `registry/`
2. 新建目录级 `README.md` 或局部 `CLAUDE.md`（仅在文件数满足条件时）
3. 先移动不带行为变化的文件，确保路径清晰

### Phase 2：Memory 子域收口

1. 引入 `memory-scope.ts`
2. 让 `memory-capability.ts` 只消费 scope
3. 把 knowledge_read 本地解析迁到 `knowledge-reader.ts`
4. 让 `memory-tooling.ts` 成为唯一 tool/prompt 解释层

### Phase 3：Runtime 装配收口

1. 新建 `runtime-factory.ts`
2. 把 `index.ts` 中的 wiring 移到 `runtime-factory.ts`
3. 新建 `runtime-events.ts`
4. 把 membership/settings/MCP/vault 的顶层事件响应迁移过去

### Phase 4：权限 / Tooling / MCP 子域归位

1. 移动 permission 相关文件到 `permission/`
2. 移动 external/subagent/skill/output storage 到 `tooling/`
3. 移动 MCP 到 `mcp/`

### Phase 5：测试与文档收口

1. 更新 import 路径
2. 按子域重排测试文件
3. 回写 design/reference 正文
4. 删除过时的 plan 文档中重复事实

## 11. 测试策略

### 11.1 Memory 子域单测

必须覆盖：

- session scope resolved
- session scope unresolved
- active profile fallback
- capability -> tooling 映射
- capability -> prompt 映射
- knowledge_read 与 capability scope 一致性

### 11.2 Runtime 装配测试

必须覆盖：

- membership 变化后重新生成 toolset
- vault 切换后重新生成 toolset
- settings 变化后不破坏 capability gating

### 11.3 Harness

必须保留并扩展：

- `tests/memory-harness.spec.ts`

至少增加：

- 未登录时 Memory/Knowledge tools 不可用
- 登录后重新进入会话，tool set 更新
- 切换 workspace 后旧 chat 不会读到新 workspace 的 memory

## 12. 验收标准

满足以下条件，才算这次重构完成：

1. `index.ts` 不再承载子域业务规则，长度与复杂度显著下降
2. Memory / Tooling / Permission / Session / MCP 至少完成一级目录分域
3. Memory scope、capability、tooling、prompt 只保留一套事实源
4. 未登录 / 未绑定 / scope 丢失时，tool exposure 与 prompt 注入完全一致
5. 现有 Memory harness 与相关单测全部通过
6. 没有遗留“以后再迁”的双轨目录

## 13. 必须删除的历史包袱

本次重构明确要求删除：

- `agent-runtime` 根目录里与目标分域冲突的旧平铺文件
- runtime 入口里手写的 Memory scope 解析逻辑
- prompt 侧独立于 capability 的 workspace 解析
- tool exposure 与知识全文读取的重复 scope 逻辑

不允许保留：

- `legacy-*`
- `temp-*`
- `*_v2`
- `old/`
- 仅为兼容目录结构而保留的 re-export 文件

如果确实需要过渡导出，只允许在同一轮重构内短暂存在，并在合并前删除。

## 14. 推荐实施方式

建议按一次完整重构完成，而不是边挪文件边继续开发。

原因：

- 这类结构性问题最怕半迁移状态
- 双轨目录比旧结构更难维护
- 当前 Memory 子域正好是重构的最佳切入点，继续拖延只会让重构面更大

因此推荐：

1. 先冻结这份方案
2. 按 Phase 1-5 一次性完成
3. 一轮完成代码、测试、文档同步

这次重构的目标不是“整理一下目录”，而是把 Moryflow PC Agent Runtime 从持续膨胀的主入口，重构成**有稳定子域边界、单一事实源、可持续演进的运行时架构**。
