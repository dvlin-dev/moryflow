# Agent Memory Access Simplification And Repo-Wide Cleanup Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 从根上收口 Moryflow agent memory access 设计：删除 `canRead/canWrite/canReadKnowledgeFile` 布尔状态机与 active-profile read-only fallback，统一成 session-bound access 模型，并一次性清理仓内所有相关代码、测试、稳定文档、局部协作文档和失真计划文档，不留历史包袱。

**Architecture:** 保留 `memory-scope` 作为 session-bound 事实源，把 memory access 收敛为 `memory-access`，只表达 `enabled / disabled` 主状态与 `vaultPath` 派生文件读取能力。`memory-tools`、`knowledge-tools`、`memory-prompt` 与 `runtime-factory` 不再各自理解“读写差异”，统一消费 `memory access`。`knowledge_read` 继续保留单独边界，但不再参与主状态建模。仓内文档口径同步改成“memory/knowledge 仅在 chat-bound session scope 下可用”，并删除所有保留旧 fallback 的叙述。

**Tech Stack:** Electron main process, TypeScript, Vitest, OpenAI Agents runtime, Moryflow workspace profile / chat session stores

---

## Execution Checklist

- [completed] Task 0: 补执行清单与进度同步区
- [completed] Task 1: 收口 access 模型并移除布尔状态机
- [completed] Task 2: 收口 tool surface，去掉读写布尔消费
- [completed] Task 3: 从工具层移除 `requireSession` 泄漏
- [completed] Task 4: 收口 runtime support 与 chat turn 的 access 消费
- [completed] Task 5: 清理命名与模块边界
- [completed] Task 6: 清理局部协作文档与 README
- [completed] Task 7: 回写稳定设计文档
- [completed] Task 8: 清理失真的历史计划文档
- [completed] Task 9: 最小必要回归与仓级验证

## Execution Notes

- 2026-03-24: 用户确认按此方案一次性执行，并要求每一步完成后同步进度到本文档。
- 2026-03-24: 已补 execution checklist，开始执行 Task 1。
- 2026-03-24: 已完成 Task 1-5。`memory-capability` 已重命名为 `memory-access`，session-bound access 模型与相关定向单测已转绿。
- 2026-03-24: 已完成 Task 6-8。`agent-runtime` 局部文档、稳定 design/testing 文档已改到新口径，失真的 `2026-03-21-pc-agent-runtime-modular-refactor.md` 已删除。
- 2026-03-24: 已完成 Task 9。验证通过：
  - `pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/memory/memory-access.test.ts src/main/agent-runtime/memory/memory-tooling.test.ts src/main/agent-runtime/memory/memory-prompt.test.ts src/main/agent-runtime/memory/memory-tools.test.ts src/main/agent-runtime/memory/knowledge-tools.test.ts src/main/agent-runtime/runtime/runtime-chat-turn.test.ts src/main/agent-runtime/runtime/runtime-toolchain.test.ts`
  - `pnpm --filter @moryflow/pc exec vitest run src/main/app/ipc/memory.test.ts src/main/memory-indexing/__tests__/engine.spec.ts src/main/memory-indexing/reconcile.spec.ts src/main/app/runtime/active-vault-runtime.test.ts`
  - `pnpm harness:check`
  - `pnpm docs:garden`

## 方案复审结论

当前版本方案能解决 PC main 代码问题，但还不够“一次性彻底收口”。按全仓标准复审后，必须扩大范围，原因如下：

1. 代码问题不只是一组布尔值，而是“session-bound access”与“active profile fallback”两套语义并存。
2. 失真不仅在实现层，还存在于局部协作文档、README 和历史计划文档里。
3. 如果只改 PC main 代码，不改稳定事实源与失真计划，仓库会继续保留互相冲突的口径，后续维护还会被旧文档带偏。
4. mobile / `packages/*` 当前没有同构的 memory access 状态机，不能为了“全仓都动”而做空转重构；但必须把“已审阅、确认无同类问题”的结论写进方案。

## 背景结论

当前复杂度不是来自真实产品需求，而是来自状态表达方式失真：

- [memory-access.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.ts) 之前的 `canRead` / `canWrite` / `canReadKnowledgeFile` 三个布尔值表达的是一个很小的状态机。
- [memory-tools.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.ts) 通过 `getWorkspaceId(chatId, requireSession?)` 把“读可 fallback、写必须 session-bound”的差异泄漏到工具层。
- [memory-tooling.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tooling.ts) 与 [memory-prompt.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-prompt.ts) 重复消费这些布尔位，导致语义越来越像 permission，而不是 memory access。
- 当前“无 session 绑定时允许 active profile 只读 fallback”的收益较低，但显著增加心智负担、测试面和 wiring 复杂度。

## 推荐决策

采用以下固定策略：

1. 删除 active profile read-only fallback。
2. Memory / Knowledge 的主能力只以 chat-bound session scope 为准。
3. `knowledge_read` 继续保留，但它只是 `enabled + vaultPath` 下的附加能力，不再单独参与主状态设计。
4. runtime 内只保留一个明确模型：

```ts
type MemoryAccess =
  | {
      state: 'disabled';
      reason: 'login_required' | 'workspace_unavailable' | 'scope_unavailable';
      workspaceId: null;
      vaultPath: null;
      profileKey: string | null;
    }
  | {
      state: 'enabled';
      workspaceId: string;
      vaultPath: string | null;
      profileKey: string;
    };
```

派生规则固定为：

- `state === 'enabled'`：暴露 `memory_search`、`memory_save`、`memory_update`、`knowledge_search`
- `state === 'enabled' && vaultPath !== null`：额外暴露 `knowledge_read`
- `state === 'disabled'`：不注入 memory prompt，不暴露任何 memory / knowledge tools

## 非目标

- 不改动通用 permission pipeline
- 不改动 mobile agent runtime 结构
- 不改动 `packages/agents-runtime` 公共抽象
- 不把 `knowledge_read` 合并进其他工具
- 不额外引入新的 store、settings 或 renderer 开关

## 仓级影响面总表

### 直接修改

- [apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.ts)
- [apps/moryflow/pc/src/main/agent-runtime/memory/memory-tooling.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tooling.ts)
- [apps/moryflow/pc/src/main/agent-runtime/memory/memory-prompt.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-prompt.ts)
- [apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.ts)
- [apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.ts)
- [apps/moryflow/pc/src/main/agent-runtime/memory/memory-runtime-support.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-runtime-support.ts)
- [apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-factory.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-factory.ts)
- [apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-chat-turn.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-chat-turn.ts)
- [apps/moryflow/pc/src/main/agent-runtime/README.md](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/README.md)
- [apps/moryflow/pc/src/main/agent-runtime/CLAUDE.md](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/CLAUDE.md)

### 测试需要同步

- [apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.test.ts)
- [apps/moryflow/pc/src/main/agent-runtime/memory/memory-tooling.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tooling.test.ts)
- [apps/moryflow/pc/src/main/agent-runtime/memory/memory-prompt.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-prompt.test.ts)
- [apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.test.ts)
- [apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.test.ts)
- [apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-chat-turn.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-chat-turn.test.ts)
- [apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-toolchain.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-toolchain.test.ts)

### 稳定文档与仓内事实源

- [docs/design/moryflow/core/workspace-profile-and-memory-architecture.md](/Users/lin/.codex/worktrees/66bc/moryflow/docs/design/moryflow/core/workspace-profile-and-memory-architecture.md)
- [docs/reference/testing-and-validation.md](/Users/lin/.codex/worktrees/66bc/moryflow/docs/reference/testing-and-validation.md)

### 已清理的历史口径

- 已删除失真的 `docs/plans/2026-03-21-pc-agent-runtime-modular-refactor.md`
- 其中已被清理的错误口径包括：
  - “只有无会话绑定的预加载场景，才允许 active profile fallback”

### 已审阅但无需改动

- `apps/moryflow/mobile/lib/agent-runtime/**`
- `packages/agents-runtime/**`
- `packages/agents-tools/**`

审阅结论：

- mobile 当前没有 PC 这套 memory / knowledge access 子域，也没有 `canRead/canWrite` 同构实现
- shared packages 当前不持有这套产品层 memory access 规则
- 本次不为了“扩大范围”而引入无收益改动

## 模块化改造原则

### 1. `memory-scope` 只负责事实解析

- 输入：`chatId`、session summary、workspace profile service
- 输出：session scope 是否可解析
- 不负责决定工具集合
- 不负责决定 prompt 注入
- 不负责 active profile fallback

### 2. `memory-access` 只负责访问状态解释

- 输入：登录态、active vault、session scope
- 输出：`MemoryAccess`
- 不暴露 `canRead` / `canWrite`
- 不暴露“读 fallback / 写 session”这种工具级细节

### 3. `memory-tools` / `knowledge-tools` 只负责具体工具

- 不自行决定可不可用
- 不再接受 `requireSession?: boolean`
- 只接受已经收口后的 workspace resolver

### 4. `memory-tooling` 只负责 surface 组装

- 根据 `MemoryAccess` 返回 tool surface 与 instructions
- `knowledge_read` 是否存在由 `vaultPath` 决定
- prompt instructions 不再单独理解读写布尔位

### 5. `memory-runtime-support` 只负责缓存和刷新

- 继续做 tool cache、prompt cache、变更通知
- 不再维护 `canRead/canWrite` 快照键
- cache key 只保留 access state 与 file-read capability

## 分步任务

### Task 1: 收口 access 模型并移除布尔状态机

**Files:**

- Modify: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.ts)
- Test: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.test.ts)

**Step 1: 写失败测试，冻结新 access 合同**

- 把测试断言改为：
  - session scope resolved => `state: 'enabled'`
  - no chatId => `state: 'disabled'`，不再返回 read-only fallback
  - unresolved chat-bound scope => `state: 'disabled'`
  - vaultPath 缺失但 session resolved => `state: 'enabled'` 且 `vaultPath: null`

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/memory/memory-access.test.ts
```

Expected:

- 旧测试中“falls back to active profile for read-only access”失败

**Step 2: 最小实现**

- 把 `MemoryToolCapability` 收敛为 `MemoryAccess`
- 删除 `canRead` / `canWrite` / `canReadKnowledgeFile`
- 删除 `chatId` 缺失时的 active profile fallback 分支
- 把 `profile_unavailable` 统一收口为 `scope_unavailable`

**Step 3: 再跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/memory/memory-access.test.ts
```

Expected:

- PASS

### Task 2: 收口 tool surface，去掉读写布尔消费

**Files:**

- Modify: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-tooling.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tooling.ts)
- Modify: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-prompt.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-prompt.ts)
- Test: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-tooling.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tooling.test.ts)
- Test: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-prompt.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-prompt.test.ts)

**Step 1: 改测试**

- `disabled` 时无 memory / knowledge tools、无 instructions
- `enabled + vaultPath` 时有完整 toolset
- `enabled + vaultPath=null` 时无 `knowledge_read`，但保留 `memory_*` 与 `knowledge_search`
- 不再保留“read-only prompt”

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/memory/memory-tooling.test.ts src/main/agent-runtime/memory/memory-prompt.test.ts
```

Expected:

- 旧的只读分支断言失败

**Step 2: 最小实现**

- `buildMemoryToolInstructions()` 改为消费 `enabled` 与 `canReadKnowledgeFile` 之类的派生输入，或直接消费 `MemoryAccess`
- `memory-tooling` 改为：
  - disabled => 空 surface
  - enabled => `memory_search/save/update` + `knowledge_search`
  - enabled + vaultPath => 增加 `knowledge_read`

**Step 3: 再跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/memory/memory-tooling.test.ts src/main/agent-runtime/memory/memory-prompt.test.ts
```

Expected:

- PASS

### Task 3: 从工具层移除 `requireSession` 泄漏

**Files:**

- Modify: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.ts)
- Modify: [apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.ts)
- Modify: [apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-factory.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-factory.ts)
- Test: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.test.ts)
- Test: [apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.test.ts)

**Step 1: 改测试**

- 不再断言 `getWorkspaceId(chatId, true)`
- 改成断言统一 resolver，只接受 `chatId`
- 若需要写工具，tooling 层保证只在 enabled 状态下暴露写工具，而不是工具自身再区分 requireSession

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/memory/memory-tools.test.ts src/main/agent-runtime/memory/knowledge-tools.test.ts
```

Expected:

- 旧的 `requireSession=true` 断言失败

**Step 2: 最小实现**

- `MemoryToolDeps['getWorkspaceId']` 改为单签名：`(chatId?: string) => Promise<string>`
- `runtime-factory` 内只提供 session-bound workspace resolver
- `memory_save` / `memory_update` 不再主动请求“写权限”；写权限由 tool surface 决定

**Step 3: 再跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/memory/memory-tools.test.ts src/main/agent-runtime/memory/knowledge-tools.test.ts
```

Expected:

- PASS

### Task 4: 收口 runtime support 与 chat turn 的 access 消费

**Files:**

- Modify: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-runtime-support.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-runtime-support.ts)
- Modify: [apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-chat-turn.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-chat-turn.ts)
- Test: [apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-chat-turn.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-chat-turn.test.ts)

**Step 1: 改测试**

- mock 的 memory runtime 返回值切到 `MemoryAccess`
- 不再在 test fixture 里构造 `canRead/canWrite`

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/runtime/runtime-chat-turn.test.ts
```

Expected:

- 旧 fixture 类型不匹配

**Step 2: 最小实现**

- `memory-runtime-support.refreshTooling()` 返回 `MemoryAccess`
- prompt block 缓存逻辑改成仅在 `state === 'enabled'` 时拉取
- cache key 改成：

```ts
JSON.stringify({
  state: access.state,
  hasVaultPath: Boolean(access.state === 'enabled' && access.vaultPath),
});
```

- `runtime-chat-turn` 的 unavailable fallback 改成 disabled access

**Step 3: 再跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/runtime/runtime-chat-turn.test.ts
```

Expected:

- PASS

### Task 5: 清理命名与模块边界

**Files:**

- Modify: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.ts)
- Modify: [apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.test.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.test.ts)

**Step 1: 决定是否改文件名**

推荐直接 rename：

- `memory-access.ts`
- `memory-access.test.ts`

理由：

- `capability` 太抽象
- `access` 更接近真实含义
- 后续不会再让人误解为通用 permission

**Step 2: 更新 import**

- 更新 `memory-runtime-support`
- 更新 `runtime-chat-turn`
- 更新所有对应 test imports

**Step 3: 再跑定向测试**

Run:

```bash
  pnpm --filter @moryflow/pc exec vitest run \
  src/main/agent-runtime/memory/memory-access.test.ts \
  src/main/agent-runtime/memory/memory-tooling.test.ts \
  src/main/agent-runtime/memory/memory-prompt.test.ts \
  src/main/agent-runtime/memory/memory-tools.test.ts \
  src/main/agent-runtime/memory/knowledge-tools.test.ts \
  src/main/agent-runtime/runtime/runtime-chat-turn.test.ts
```

Expected:

- PASS

Note:

- 如果测试文件已 rename，同步替换命令路径

### Task 6: 清理局部协作文档与 README，避免新旧口径并存

**Files:**

- Modify: [apps/moryflow/pc/src/main/agent-runtime/README.md](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/README.md)
- Modify: [apps/moryflow/pc/src/main/agent-runtime/CLAUDE.md](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/CLAUDE.md)

**Step 1: 更新局部文档口径**

- `memory/`
  从 “Memory scope/capability” 改成 “session-bound memory access”
- 明确 `memory/*` 的边界是：
  - session-bound memory / knowledge tool surface
  - prompt block
  - `knowledge_read` file-read bridge
- 不再保留 `capability` 术语或 fallback 语义

**Step 2: 检查 header 注释**

- 已完成 `memory-access.ts` rename，并同步更新 import / test / header
- 同步更新该目录内 header `[PROVIDES] / [DEPENDS] / [POS]`

### Task 7: 回写稳定设计文档，冻结新的长期规则

**Files:**

- Modify: [docs/design/moryflow/core/workspace-profile-and-memory-architecture.md](/Users/lin/.codex/worktrees/66bc/moryflow/docs/design/moryflow/core/workspace-profile-and-memory-architecture.md)

**Step 1: 补充稳定事实**

- PC agent memory / knowledge tools 只在 chat-bound session scope 下可用
- active profile 只负责当前 workspace/profile 解析，不再作为无 session 的 memory read fallback
- `knowledge_read` 是 session-bound access 下的本地文件桥接，不是独立主状态

**Step 2: 删除歧义**

- 禁止保留“无 session 可只读 memory/knowledge”的模糊表述

### Task 8: 清理失真的历史计划文档，去掉仓内历史包袱

**Files:**

- Delete: `docs/plans/2026-03-21-pc-agent-runtime-modular-refactor.md`

**Step 1: 处理原则**

- 如果该文档仍需保留，必须冻结为“当前状态”，删除已失真的 fallback 设计叙述
- 如果其大部分内容都已被稳定文档吸收，且剩余价值不足，直接删除

**Step 2: 最低要求**

- 仓内不能再保留 `active profile fallback` 是当前正确方案的文字事实

### Task 9: 最小必要回归与仓级验证

**Files:**

- Review: [docs/reference/testing-and-validation.md](/Users/lin/.codex/worktrees/66bc/moryflow/docs/reference/testing-and-validation.md)

**Step 1: 运行 memory 子域最小闭环**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/agent-runtime/memory/memory-access.test.ts \
  src/main/agent-runtime/memory/memory-tooling.test.ts \
  src/main/agent-runtime/memory/memory-prompt.test.ts \
  src/main/agent-runtime/memory/memory-tools.test.ts \
  src/main/agent-runtime/memory/knowledge-tools.test.ts \
  src/main/agent-runtime/runtime/runtime-chat-turn.test.ts \
  src/main/agent-runtime/runtime/runtime-toolchain.test.ts
```

Expected:

- 全部 PASS

**Step 2: 按验证基线补受影响外围**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/app/ipc/memory.test.ts \
  src/main/memory-indexing/__tests__/engine.spec.ts \
  src/main/memory-indexing/reconcile.spec.ts \
  src/main/app/runtime/active-vault-runtime.test.ts
```

Expected:

- 全部 PASS

**Step 3: 判断是否需要回写稳定文档**

- 本次按长期规则处理，必须回写稳定文档
- 同时更新受影响的局部 CLAUDE / README
- 同时清理失真的旧计划文档

## 实施注意事项

- 不保留兼容分支；旧的 read-only fallback 应直接删除
- 不在工具内部兜底“如果没有 session 就尝试 active profile”
- 不把 `knowledge_read` 提升成新的主状态字段
- 不引入新的 enum + 多个派生布尔的双重表达
- 如果 rename 文件，务必同步 header 注释与 import 路径，避免留下 `capability` 残名
- 不允许仓内稳定文档、README、CLAUDE 或历史计划继续保留旧 fallback 口径

## 风险与回滚点

### 风险

- 某些没有 session 绑定但存在 active profile 的旧预热场景，会从“只读可用”变成“不可用”
- 若上层有隐式依赖该降级体验，可能导致 memory prompt 不再预注入

### 缓解

- 先用定向测试覆盖 `no chatId` 与 `chatId unresolved` 两类场景
- 若发现确有业务依赖预热注入，可单独设计 `bootstrap prompt preload`，不要继续复用 read-only fallback

### 回滚原则

- 如上线后发现强依赖无 session 只读场景，优先恢复单独的“预热 prompt source”
- 不回滚到 `canRead/canWrite` 布尔状态机
- 不回滚到 active profile fallback

## 预期结果

- memory 子域对外只暴露一个明确 access 模型
- `memory-tools` 不再理解写权限
- `memory-tooling` 成为唯一 surface owner
- `knowledge_read` 只保留为 enabled 状态下的附加文件读取能力
- 后续任何人看到代码时，不会再把这套逻辑误读成通用 permission
- 仓内所有相关事实源都与实现一致，不再同时存在新旧两套语义
