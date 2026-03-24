# Agent Runtime

## 目录职责

- `index.ts`：稳定导出面；只暴露 `createAgentRuntime`、`createChatSession`、`runWithRuntimeVaultRoot` 和公共类型。
- `runtime/*`：运行时装配层；负责把模型工厂、tool wiring、chat turn、compaction、event wiring 组合成可执行 runtime。
- `memory/*`：session-bound memory / knowledge tool surface、memory prompt 注入与 `knowledge_read` 本地文件桥接。
- `permission/*`：权限规则存储、审计、判定与 tool wrapping。
- `mcp/*`、`prompt/*`、`registry/*`、`session/*`、`tooling/*`、`tracing/*`：分别承载 MCP、prompt、agent registry、session、工具适配和 tracing 相关能力。

## 结构边界

- `runtime/*`、`memory/*`、`permission/*` 禁止反向依赖根 `index.ts`。
- `agent-runtime` 内部实现不得直接依赖 `electron`；需要宿主能力时通过 adapter / capability 注入。
- `index.ts` 不承载运行时实现；新增装配逻辑优先放进 `runtime/*`。
- `memory/*` 只负责 session-bound memory access、记忆/知识工具、prompt 注入与 `knowledge_read` 文件读取边界；不混入 MCP、权限、模型工厂或主流程编排。
- `permission/*` 只负责权限决策、规则存储和审计，不承载 chat IPC 或 renderer 行为。

## 关键入口

- 运行时工厂：[runtime/runtime-factory.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-factory.ts)
- Chat turn 入口：[runtime/runtime-chat-turn.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-chat-turn.ts)
- 会话压缩：[runtime/runtime-compaction-support.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/runtime/runtime-compaction-support.ts)
- 权限运行时：[permission/permission-runtime.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/permission/permission-runtime.ts)
- Memory access：[memory/memory-access.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-access.ts)
- Memory / knowledge tools：[memory/memory-tools.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/memory-tools.ts)、[memory/knowledge-tools.ts](/Users/lin/.codex/worktrees/66bc/moryflow/apps/moryflow/pc/src/main/agent-runtime/memory/knowledge-tools.ts)
