# Agent Runtime

## 目录职责

- `index.ts`：稳定导出面；只暴露 `createAgentRuntime`、`createChatSession`、`runWithRuntimeVaultRoot` 和公共类型。
- `runtime/*`：运行时装配层；负责把模型工厂、tool wiring、workspace 解析、memory cache、compaction、settings 监听组合成可执行 runtime。
- `memory/*`：memory / knowledge tool 与 memory prompt 注入。
- `permissions/*`：权限规则存储、审计、判定与 tool wrapping。
- `core/*`：MCP manager、chat session 等底层运行时核心能力。
- 根目录其余文件：平台适配器与跨模块桥接，例如 `desktop-adapter.ts`、`runtime-config.ts`、`task-state-runtime.ts`、`tool-output-storage.ts`。

## 结构边界

- `runtime/*`、`memory/*`、`permissions/*` 禁止反向依赖根 `index.ts`。
- `agent-runtime` 内部实现不得直接依赖 `electron`；需要宿主能力时通过 adapter / capability 注入。
- `index.ts` 不承载运行时实现；新增装配逻辑优先放进 `runtime/*`。
- `memory/*` 只负责记忆与知识工具，不混入 MCP、权限、模型工厂或主流程编排。
- `permissions/*` 只负责权限决策、规则存储和审计，不承载 chat IPC 或 renderer 行为。

## 关键入口

- 运行时工厂：[runtime/create-agent-runtime.ts](/Users/lin/.codex/worktrees/7168/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/create-agent-runtime.ts)
- Workspace / vault 解析：[runtime/workspace-context.ts](/Users/lin/.codex/worktrees/7168/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/workspace-context.ts)
- 会话压缩：[runtime/compaction.ts](/Users/lin/.codex/worktrees/7168/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/compaction.ts)
- 权限运行时：[permissions/permission-runtime.ts](/Users/lin/.codex/worktrees/7168/moryflow/apps/moryflow/pc/src/main/agent-runtime/permissions/permission-runtime.ts)
- Memory / knowledge tools：[memory/memory-tools.ts](/Users/lin/.codex/worktrees/7168/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.ts)、[memory/knowledge-tools.ts](/Users/lin/.codex/worktrees/7168/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.ts)
