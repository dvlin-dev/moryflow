---
title: Aiget Server：Agent 模块 typecheck OOM 排查与方案跟踪
date: 2026-01-13
scope: aiget-server, typescript, agents-core, browser
status: active
---

<!--
[INPUT]: `apps/aiget/server` 在当前分支 `pnpm typecheck` 发生 OOM；与 agent 模块、browser 工具集成、@aiget/agents-core 交互相关
[OUTPUT]: 可复现的排查结论、当前进度、下一步计划、最佳实践落地方向（持续更新）
[POS]: 记录一次“类型系统导致 OOM”的工程排障，用于团队协作与后续重构决策

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`；若影响全局约束，需同步更新根 `CLAUDE.md`。
-->

# 背景

- **问题**：`apps/aiget/server` 执行 `pnpm --filter @aiget/aiget-server typecheck` 发生 OOM（内存溢出）。
- **对照**：main 分支在 `--max-old-space-size=4096` 可通过；当前分支即使 `--max-old-space-size=16384` 也 OOM。
- **近期变更**：browser 模块大幅扩展（引入 Playwright 浏览器自动化能力，增加 agent 与 browser tools 集成）。

# 已知现象与关键发现

## 模块隔离结果（用户提供）

- browser 模块单独编译：可通过（存在类型错误，但不 OOM）
- agent 模块单独编译：OOM
- 核心模块（prisma/redis/common）：可通过
- browser + 其他模块组合：OOM
- 指向 agent 模块是主要问题源，尤其是与 `@aiget/agents-core` 的交互

## 重要对照参考

- `apps/moryflow/pc` 也依赖 `@aiget/agents-core`，但不 OOM，可用于对照其类型边界设计方式。

# 假设（根因方向）

> 当前最可信方向：**TypeScript 在 agent 模块里触发了极重的泛型推断/结构类型比较**，并把 Playwright 等“超大类型”卷入了 `@aiget/agents-core` 的泛型参数中，导致 `tsc` 在类型检查阶段内存爆炸。

典型触发链路（简化）：

1. `BrowserToolContext` 引用 `BrowserSession`（包含 Playwright `Page`/`BrowserContext` 等重类型）
2. `browserTools` 在类型层面被推断/标注为 `Tool<BrowserToolContext>[]`
3. `@aiget/agents-core` 的 `Tool<Context>` / `FunctionTool<Context>` 将 `Context` 放入函数参数（如 `invoke(runContext: RunContext<Context>, ...)`）中
4. TypeScript 为验证可赋值性，会反复展开/比较大类型（尤其是函数参数位置），引发 OOM

# 当前进度（已完成的验证与止血）

## 方案 A：在 agent 层做类型边界降级（验证/止血）

目标：让 `@aiget/agents-core` 的泛型推断 **看不到** Playwright 相关大类型。

已做的验证性改动（以当前工作区为准）：

- `apps/aiget/server/src/agent/tools/browser-tools.ts`：
  - 将 `browserTools` 从 `Tool<BrowserToolContext>[]` 降级为 `Tool[]`（切断 `Context` 泛型推断链路）
  - `tool({ parameters })` 处对 `parameters` 做 `as any`，并将 `execute(input)` 处的 `input` 降级为 `any`（避免工具参数类型参与复杂推断）
- `apps/aiget/server/src/agent/agent.service.ts`：
  - 在 `new Agent(...)` 与 `run(...)` 处对参数/返回做 `as any`（阻断 `run()` 对 `TContext` 等泛型的推断）
- 结果：`tsc --noEmit` **不再 OOM**，能够在可接受时间内结束并输出普通的 TS 报错（说明 OOM 的主要触发点已被隔离）。

## 本次止血改动清单（工作区变更）

> 说明：以下是为了“验证 OOM 触发点 + 让 typecheck 可结束”而做的止血性改动，存在 `any`/类型降级；后续最佳实践落地会逐步收回到更干净的边界设计。

- `apps/aiget/server/src/agent/tools/browser-tools.ts`
  - `browserTools` 从 `Tool<BrowserToolContext>[]` 降级为 `Tool[]`（避免 `BrowserToolContext` 注入 `@aiget/agents-core` 泛型）
  - 所有 `tool({ parameters })` 的 `parameters` 改为 `... as any`，`execute(input)` 的 `input` 标注为 `any`（避免工具参数类型参与复杂推断）
  - 调用 `actionHandler.execute(...)` 时补齐必填字段 `timeout`（当前 `ActionInput` 推断为必填）
  - 这部分改动的目标是：**让 agents-core 的类型世界看不到 Playwright 重类型 + 避免 Zod 类型身份冲突导致的深层比较**

- `apps/aiget/server/src/agent/agent.service.ts`
  - `new Agent({...})` 处 `as any`，`run(agent, ..., { context })` 处对 `agent/context/options` 做 `as any`
  - 目的：阻断 `run()` 反向推断出 `TContext = BrowserToolContext` 后触发极重的结构类型比较

- `apps/aiget/server/src/agent/agent.controller.ts`
  - `ZodError` 输出字段改为 `.issues`（对齐当前后端实际使用的 zod 类型定义）

- `apps/aiget/server/src/agent/dto/agent.schema.ts`
  - `schema: z.record(...)` 改为 `z.record(z.string(), z.unknown())`（对齐当前后端代码中的一致写法，如 `src/extract/dto/extract.dto.ts`）

- `apps/aiget/server/CLAUDE.md`
  - 增加约束：Agent + `@aiget/agents-core` 集成时避免透传 Playwright 等重类型进入 `Tool<Context>`/`Agent<TContext>` 泛型
  - `Module Structure` 表中补充 `agent/` 模块条目，便于定位

## 当前验证命令与信号

- 验证命令（不经过 pnpm scripts，直接跑 tsc 以缩短反馈回路）：
  - `./apps/aiget/server/node_modules/.bin/tsc -p apps/aiget/server/tsconfig.json --noEmit`
- 关键验证信号：
  - 在应用上述止血改动后，`tsc` 可以在几秒内结束并输出 TS 报错（不再 OOM / 不再长时间卡死）

## 关于 Zod 入口（避免误用范围）

- **前端表单**：遵循 `docs/guides/frontend/forms-zod-rhf.md`，使用 `import { z } from 'zod/v3'`（目标是兼容 `@hookform/resolvers` 的类型要求）。
- **后端 server**：现有代码广泛使用 `import { z } from 'zod'`；本次排障中，server 侧应优先保持与现有 server 代码一致，避免在后端混用 `zod/v3` 入口导致类型身份冲突、进一步放大推断成本。

# 当前剩余问题（typecheck 仍失败，但已不 OOM）

> 以下条目是当前 `tsc` 报错的主要来源（已从“OOM”回落为普通类型错误），应在进入“最佳实践重构”前先清零。

- `apps/aiget/server/src/agent/agent.controller.ts`：`ApiKeyPayload` 导出名不一致（需要对齐 `src/api-key` 的实际导出）。
- `apps/aiget/server/src/agent/agent.service.ts`：`RunStreamEvent` 的 raw model stream 事件分支与 SDK 类型不一致（需要按 SDK 的实际事件类型做兼容分支/类型收敛）。
- `apps/aiget/server/src/browser/browser-session.service.ts`：Playwright `Browser` vs `BrowserContext` 类型用法不一致（需要修正调用点或类型声明）。

# 接下来的计划（短期）

1. **修复剩余 TS 错误并保持不 OOM**：先让 `pnpm --filter @aiget/aiget-server typecheck` 回归通过（同时保持方案 A 的边界降级不引入 OOM）。
2. **最小化 “any 止血层” 的覆盖面**：逐步把 `as any` 收敛到“边界文件/边界类型”上，避免 `any` 外溢到业务逻辑层。

# 未来方向（最佳实践落地候选）

> 目标：保留类型安全，但避免把 Playwright 等重类型传入 agents-core 的泛型世界。

- **方向 1：Ports / Facade（推荐）**  
  在 browser 模块提供 agent-facing 的最小接口（ports），agent/tools 只依赖这些 ports 类型；ports 中不暴露 Playwright `Page`/`BrowserContext` 等大类型。

- **方向 2：工具参数类型策略**  
  对 tools 的 `parameters` 统一采用 JSON schema（或在边界层完成 Zod → JSON schema 转换），避免 zod 类型参与 agents-core 泛型推断。

- **方向 3：对齐 moryflow/pc 的集成方式**  
  参考 `apps/moryflow/pc` 对 agents-core 的使用边界（更偏向只消费协议/事件类型），减少对 agents-core 泛型 API 的直接耦合。

# 附录：关键文件清单

- `apps/aiget/server/src/agent/`
- `apps/aiget/server/src/agent/tools/browser-tools.ts`
- `apps/aiget/server/src/agent/agent.service.ts`
- `apps/aiget/server/src/browser/session/session.manager.ts`（`BrowserSession` 含 Playwright 类型）
- `packages/agents-core/src/tool.ts`（`Tool<Context>` / `FunctionTool<Context>` 泛型定义）
