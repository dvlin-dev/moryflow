# Agent Memory Access Simplification And Repo-Wide Cleanup Plan

**Current Status:** Implemented and frozen as current-state summary. Stable semantics are reflected in [workspace-profile-and-memory-architecture.md](/Users/lin/.codex/worktrees/66bc/moryflow/docs/design/moryflow/core/workspace-profile-and-memory-architecture.md) and [testing-and-validation.md](/Users/lin/.codex/worktrees/66bc/moryflow/docs/reference/testing-and-validation.md).

**Goal:** 从根上收口 Moryflow agent memory access 设计：删除 `canRead/canWrite/canReadKnowledgeFile` 布尔状态机与 active-profile read-only fallback，统一成 session-bound access 模型，并一次性清理仓内所有相关代码、测试、稳定文档、局部协作文档和失真计划文档，不留历史包袱。

**Architecture:** 保留 `memory-scope` 作为 session-bound 事实源，把 memory access 收敛为 `memory-access`，只表达 `enabled / disabled` 主状态与 `vaultPath` 派生文件读取能力。`memory-tools`、`knowledge-tools`、`memory-prompt` 与 `runtime-factory` 不再各自理解“读写差异”，统一消费 `MemoryAccess`。`knowledge_read` 继续保留单独边界，但不再参与主状态建模。

**Tech Stack:** Electron main process, TypeScript, Vitest, OpenAI Agents runtime, Moryflow workspace profile / chat session stores

## Current State

- PC agent memory access 已统一为 session-bound 模型。
- `canRead`、`canWrite`、`canReadKnowledgeFile` 已从主状态设计中移除。
- active-profile read-only fallback 已删除。
- `knowledge_read` 仅作为 `enabled + vaultPath` 下的附加能力保留。
- 局部协作文档、稳定设计文档、测试基线与失真历史计划文档已同步清理。

## Root Cause

- 旧实现用多个布尔值表达一个很小的状态机，导致语义看起来像通用 permission，而不是 memory access。
- `memory-tools` 通过 `getWorkspaceId(chatId, requireSession?)` 把读写差异泄漏到工具层。
- `memory-tooling`、`memory-prompt` 和 runtime wiring 分别重复解释布尔位，造成模块职责重叠。
- “无 session 时允许 active profile 只读 fallback”收益较低，但显著增加了心智负担、测试面与维护成本。

## Adopted Decision

采用以下固定策略：

1. 删除 active profile read-only fallback。
2. Memory / Knowledge 主能力只以 chat-bound session scope 为准。
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

## Scope

### Directly Changed

- [memory-access.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.ts)
- [memory-tooling.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tooling.ts)
- [memory-prompt.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-prompt.ts)
- [memory-tools.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.ts)
- [knowledge-tools.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.ts)
- [memory-runtime-support.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-runtime-support.ts)
- [runtime-factory.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-factory.ts)
- [runtime-chat-turn.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-chat-turn.ts)
- [README.md](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/README.md)
- [CLAUDE.md](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/CLAUDE.md)
- [workspace-profile-and-memory-architecture.md](/Users/lin/.codex/worktrees/66bc/moryflow/docs/design/moryflow/core/workspace-profile-and-memory-architecture.md)
- [testing-and-validation.md](/Users/lin/.codex/worktrees/66bc/moryflow/docs/reference/testing-and-validation.md)

### Historical Cleanup

- 已删除 [2026-03-21-pc-agent-runtime-modular-refactor.md](/Users/lin/.codex/worktrees/66bc/moryflow/docs/plans/2026-03-21-pc-agent-runtime-modular-refactor.md) 中保留旧 fallback 口径的历史计划文档。

### Reviewed And Confirmed Unchanged

- `apps/moryflow/mobile/lib/agent-runtime/**`
- `packages/agents-runtime/**`
- `packages/agents-tools/**`

这些区域没有同构的 memory access 状态机或同类 fallback 语义，本次不做无收益联动重构。

## Module Boundaries

### `memory-scope`

- 只负责 session-bound 事实解析。
- 不决定工具集合，不决定 prompt 注入，不处理 active profile fallback。

### `memory-access`

- 只负责把登录态、active vault 与 session scope 解释为 `MemoryAccess`。
- 不暴露 `canRead` / `canWrite` 一类工具级细节。

### `memory-tools` / `knowledge-tools`

- 只负责具体工具实现。
- 不自行决定可用性，不再接受 `requireSession?: boolean`。

### `memory-tooling`

- 只负责根据 `MemoryAccess` 组装 tool surface 与 instructions。
- `knowledge_read` 是否存在只由 `vaultPath` 决定。

### `memory-runtime-support`

- 只负责缓存、刷新和变更通知。
- cache key 只保留 access state 与 file-read capability。

## Validation Baseline

- `pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/memory/memory-access.test.ts src/main/agent-runtime/memory/memory-tooling.test.ts src/main/agent-runtime/memory/memory-prompt.test.ts src/main/agent-runtime/memory/memory-tools.test.ts src/main/agent-runtime/memory/knowledge-tools.test.ts src/main/agent-runtime/runtime/runtime-chat-turn.test.ts src/main/agent-runtime/runtime/runtime-toolchain.test.ts`
- `pnpm --filter @moryflow/pc exec vitest run src/main/app/ipc/memory.test.ts src/main/memory-indexing/__tests__/engine.spec.ts src/main/memory-indexing/reconcile.spec.ts src/main/app/runtime/active-vault-runtime.test.ts`
- `pnpm harness:check`
- `pnpm docs:garden`

## Risk Boundary

- 这是有意为之的行为收紧：没有 chat-bound session scope 时，memory / knowledge 工具全部关闭。
- 如果未来需要“无 chat 预热”能力，应单独设计 preload source，而不是恢复 active-profile fallback。
