---
title: agents-tools 运行时工具盘点与清理方案
date: 2026-03-07
scope: docs/design/moryflow/core
status: completed
---

# agents-tools 运行时工具盘点与清理方案

## 1. 背景与目标

你提到“很多 tool 已不再使用，改成 bash 了”。基于当前代码事实，这个判断在 **PC 端**成立，但在 **Mobile 端**不成立：

1. PC runtime 已是 Bash-First（文件/搜索专用工具默认不注入）。
2. Mobile runtime 仍依赖文件/搜索工具（无 bash 能力）。

本方案目标：

1. 先给出 `packages/agents-tools` 的“仍在使用 / 可删除”清单。
2. 明确可执行的无兼容清理路径（删除真正死代码，不误删 Mobile 必需能力）。
3. 给出目录结构收敛建议与文档同步清单。

## 2. 事实盘点（2026-03-05）

### 2.1 运行时装配事实

1. PC 注入链路：
   `apps/moryflow/pc/src/main/agent-runtime/index.ts` 使用 `createPcToolsWithoutSubagent` + `createSandboxBashTool` + `createSubagentTool` + `skill` + MCP/external。
2. Mobile 注入链路：
   `apps/moryflow/mobile/lib/agent-runtime/runtime.ts` 使用 `createMobileTools`（包含文件/搜索工具，不包含 bash/subagent/skill/MCP）。
3. 设计文档一致性：
   `docs/design/moryflow/features/moryflow-agent-runtime-tool-simplification-plan.md` 已明确“仅 PC Bash-First，Mobile 保持现状”。

### 2.2 agents-tools 工具/装配 API 最终状态（已执行）

| 项目                             | 当前使用状态            | 证据                                                | 结论   |
| -------------------------------- | ----------------------- | --------------------------------------------------- | ------ |
| `createPcToolsWithoutSubagent`   | 使用中（PC 主链路）     | `apps/moryflow/pc/src/main/agent-runtime/index.ts`  | 保留   |
| `createMobileTools`              | 使用中（Mobile 主链路） | `apps/moryflow/mobile/lib/agent-runtime/runtime.ts` | 保留   |
| `createSubagentTool`             | 使用中（PC 主链路）     | `apps/moryflow/pc/src/main/agent-runtime/index.ts`  | 保留   |
| `createTaskTool`                 | 使用中（装配 + 单测）   | `create-tools*.ts` + `task-tool.spec.ts`            | 保留   |
| `createBaseTools`                | 未发现业务调用          | 全仓仅剩导出/文档提及                               | 已删除 |
| `createBaseToolsWithoutSubagent` | 未发现业务调用          | 全仓仅剩导出/文档提及                               | 已删除 |
| `createBashTool`（非沙盒）       | 未发现业务调用          | 注释已标注“当前未被任何平台调用”                    | 已删除 |
| `ToolsContext.enableBash`        | 未发现业务调用          | 仅与 `createBaseTools*`/`createBashTool` 关联       | 已删除 |

补充事实（2026-03-07）：

1. 旧 `createTasksTools` 已随 task 轻量化重构删除，当前只保留单一 `createTaskTool` + `TaskStateService`。
2. task 已不再对应独立 SQLite / `tasks-store` 子系统，而是 session-scoped snapshot 协议。

### 2.3 关于“文件/搜索工具是否可删”的判定

结论：**当前不能删**（至少本轮不能）。

原因：

1. Mobile 仍通过 `createMobileTools` 注入 `read/write/edit/delete/move/ls/glob/grep/search_in_file`。
2. 若直接删，会破坏 Mobile runtime 现有能力，不属于“删除无用代码”，而是功能裁剪。

## 3. 清理范围与非范围

### 3.1 本轮清理范围（已完成）

1. 删除 `createBaseTools` / `createBaseToolsWithoutSubagent`。
2. 删除 `src/platform/bash-tool.ts` 与 `createBashTool` 导出。
3. 删除 `ToolsContext.enableBash` 及相关分支。
4. 收敛 `src/create-tools.ts`，仅保留 PC 装配相关能力，并将 `createPcLeanTools*` 重命名为 `createPcTools*`。

### 3.2 明确不在本轮

1. 不删除 Mobile 所需文件/搜索工具实现。
2. 不改 Mobile 工具策略（仍保持非 bash）。
3. 不改 PC runtime 的 `createSandboxBashTool` 沙盒主通道设计。

## 4. 目录结构调整建议

现状问题：`src/create-tools.ts` 同时承载“已不用的全量装配”和“当前 PC Lean 装配”，语义混杂。

建议（单版本收口）：

1. 将装配入口按端和职责拆分为：
   - `src/assembly/pc-lean-tools.ts`
   - `src/assembly/mobile-tools.ts`
2. `src/platform/` 目录若仅剩死代码则移除（bash 实现统一由 `@moryflow/agents-sandbox` 维护）。
3. `src/index.ts` 仅导出“已在业务中使用”的稳定 API，降低误用和维护成本。

备注：若本轮不做目录重排，至少先完成“死 API 删除 + 导出面收口”，目录重排可作为下一步独立重构。

## 5. 文档同步清单

执行清理时需同步更新：

1. `docs/design/moryflow/core/agent-runtime-control-plane-adr.md`
   - J.2 接口快照移除 `createBaseTools*` 与 `createBashTool` 描述。
2. `docs/design/moryflow/features/moryflow-agent-runtime-tool-simplification-plan.md`
   - 补充“死 API 清理完成态”回写（避免与现状漂移）。
3. `packages/agents-tools/CLAUDE.md`
   - 更新职责范围与入口描述（移除已删除 API）。
4. `docs/design/moryflow/core/index.md`、`docs/index.md`
   - 索引新增本方案或回写完成态链接。

## 6. 实施步骤（执行结果）

1. 代码删除与导出收口：已完成（删除未使用 API/文件，修正 `index.ts` 导出面）。
2. API 命名对齐：已完成（`createPcLeanTools*` -> `createPcTools*`，与 `createMobileTools*` 对齐）。
3. 测试同步：已完成（`create-pc-tools*.spec.ts`）。
4. 文档回写：已完成（ADR + Bash-First 方案文档 + `CLAUDE.md` + 索引）。

## 7. 风险与验证

风险等级：**L2**（跨包接口与工具装配面收敛）。

必须验证：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

建议附加定向验证：

```bash
pnpm --filter @moryflow/agents-tools test:unit
pnpm --filter @moryflow/pc test:unit -- agent-runtime
pnpm --filter @moryflow/mobile test:unit
```

### 7.1 本轮验证结果（2026-03-05）

已执行并通过：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

辅助验证（受影响包）：

```bash
pnpm --filter @moryflow/agents-tools test:unit
pnpm --filter @moryflow/pc test:unit -- src/main/agent-runtime/__tests__/task-state-service.spec.ts src/main/agent-runtime/subagent-tools.test.ts
```

## 8. 验收标准

1. `agents-tools` 不再暴露未被业务使用的 `createBaseTools*` 与非沙盒 `createBashTool`，PC 装配 API 已统一为 `createPcTools*`。
2. PC/Mobile 工具注入行为与现状一致（仅删除死代码，不引入行为回归）。
3. 文档与代码口径一致，不再出现“文档保留旧 API、实现已切换”的漂移。
