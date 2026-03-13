---
title: Moryflow Harness Engineering 基线
date: 2026-03-09
scope: docs/design/moryflow/core + docs/plans + packages/agents-runtime + packages/ui + apps/moryflow/pc + apps/moryflow/mobile + apps/moryflow/server
status: active
---

<!--
[INPUT]: 当前文档治理、Agent Runtime 控制面、对话 UI 协议、Trace 链路与测试覆盖现状
[OUTPUT]: Moryflow Harness Engineering 的当前基线、覆盖缺口、目标闭环与实施边界
[POS]: Moryflow Core / Agent 开发与验证闭环事实源

[PROTOCOL]: 仅在 Harness 分层、覆盖边界、闭环机制或相关事实源失真时更新；不记录阶段进度与执行流水。
-->

# Moryflow Harness Engineering 基线

## 1. 当前结论

Moryflow 的 Harness Engineering 已经从“分散能力已存在”推进到“统一闭环已建立”的状态。

当前冻结结论如下：

1. 长期事实源已经存在：
   - `docs/design/*`、`docs/reference/*`、各目录 `CLAUDE.md`
2. 运行时控制面已经存在：
   - `packages/agents-runtime` 已收敛 `permission / compaction / doom-loop / tool-output / ui-stream`
3. 对话界面共享协议已经存在：
   - `docs/design/moryflow/core/ui-conversation-and-streaming.md`
   - `packages/ui` 与端侧相关测试
4. Trace 采集与服务端存储链路已经存在：
   - PC 主进程上报
   - Server `agent-trace` 模块存储与查询
5. 仓库契约与 Agent 表面清单已经落地：
   - `scripts/check-doc-contracts.mjs`
   - `scripts/generate-agent-surface.mjs`
   - `generated/harness/agent-surface.json`
   - 根脚本 `pnpm harness:check`
6. 运行时场景回放 Harness 已落地：
   - `packages/agents-runtime/test/runtime-harness.spec.ts`
   - `packages/agents-runtime/test/harness-fixtures/*`
7. 对话界面 Harness 已落地：
   - `packages/ui/test/conversation-harness.test.tsx`
   - `apps/moryflow/mobile/lib/chat/__tests__/conversation-harness.spec.ts`
   - `apps/moryflow/pc/tests/helpers/*` 共享 Electron Playwright foundation
   - `apps/moryflow/pc/tests/core-flow.spec.ts`
   - `apps/moryflow/pc/tests/chat-chips.spec.ts`
   - `apps/moryflow/pc/tests/agent-runtime-harness.spec.ts`
   - `apps/moryflow/pc/tests/automations-harness.spec.ts`
   - PC 壳层继续复用既有 `renderer/main` 测试面
8. Trace 驱动评审闭环已落地：
   - `apps/moryflow/server/src/agent-trace/agent-trace-review.service.ts`
   - `scripts/review-agent-traces.mjs`
   - 根脚本 `pnpm trace:review`
   - `apps/moryflow/pc/src/main/agent-runtime/server-tracing-processor.ts` 已把 `platform / mode / modelId / approval / compaction / doomLoop` 收敛为标准 metadata 结构
9. 文档园艺闭环已落地：
   - `scripts/check-plan-drift.mjs`
   - 根脚本 `pnpm docs:garden`
10. 当前主要边界：

- Trace 聚合依赖运行时元数据中已有 `approval / compaction / doomLoop` 标记；若上游未写入，对应统计只保证部分可见

## 2. 文档分层

关于 Harness Engineering，文档分层固定如下：

1. `docs/design/moryflow/core/harness-engineering-baseline.md`
   - 长期事实源
   - 只记录当前基线、覆盖边界、目标闭环与实施边界
2. `docs/plans/2026-03-09-moryflow-harness-engineering-upgrade-plan.md`
   - 执行期计划
   - 只记录分阶段任务、文件落点、验收与验证

约束：

1. 长期事实写入 `core`，不得长期滞留在 `docs/plans/*`
2. `docs/plans/*` 只保留执行所需信息，不保留重复论证与过程稿
3. Harness 的实现事实生效后，必须回写本文件，而不是继续追加到计划文档

## 3. 覆盖现状

### 3.1 仓库契约层

当前已有：

1. `CLAUDE.md` 与 `docs/index.md`、各级 `index.md` 已定义文档治理边界
2. generated 文件禁手改、`docs/plans` 为执行期文档等规则已写明
3. `check-doc-contracts` 已把文档治理、关键入口存在性与 generated 禁手改转成脚本检查
4. `generate-agent-surface` 已把平台、共享包、运行时能力与长期事实入口转成机读清单，并通过 `--check` 模式纳入门禁

当前缺口：

1. 计划文档漂移检测当前仍是规则级文本判断，不是 AST 或语义级比对

### 3.2 运行时契约层

当前已有：

1. `packages/agents-runtime` 已具备共享运行时控制面
2. `packages/agents-tools` 已具备工具装配与 Task 协议
3. PC / Mobile 已各自有权限与模式接入
4. `runtime-harness.spec.ts` 已把权限、压缩、doom loop、输出截断收敛为共享控制面场景回放，并显式断言暂停、恢复、摘要与标记序列
5. Mobile 已补 `once/always` 审批桥接断言

当前缺口：

1. 平台差异当前仍主要依赖既有 PC / Mobile 壳层测试补桥，不单独维护第二套平台回放器

### 3.3 对话界面契约层

当前已有：

1. 对话共享协议、Tool / Reasoning 可见性、round collapse、viewport 语义已有长期事实源
2. `packages/ui/test/conversation-harness.test.tsx` 已固定 shared disclosure、自动折叠与手动展开优先级，以及 viewport intent 场景
3. Mobile 已有 `conversation-harness.spec.ts` 与 `tasks-sheet-model.spec.ts`
4. PC 继续复用 `conversation-section.test.tsx`、`tool-part.test.tsx`、`use-chat-pane-controller.approval.test.tsx`、`task-hover-panel.test.tsx`
5. PC Electron Playwright 已收敛为共享 foundation + feature-specific specs：
   - `tests/helpers/pc-harness.ts`
   - `tests/helpers/workspace-seed.ts`
   - `tests/helpers/log-capture.ts`
   - `tests/helpers/fake-llm-server.ts`
   - `tests/helpers/workspace-actions.ts`
6. PC 已新增 `core-flow.spec.ts`、`chat-chips.spec.ts`、`agent-runtime-harness.spec.ts`、`automations-harness.spec.ts` 四类 feature harness，其中 `automations-harness.spec.ts` 固定覆盖 `Automations` 顶层模块创建与 chat header `Automate` 入口的产品壳层 smoke

当前缺口：

1. PC 的真实工具审批恢复链路在 E2E 中仍未直连远端 Agent，只做壳层冒烟与引用保持验证

### 3.4 Trace 闭环层

当前已有：

1. PC 主进程会上传 Agent Trace
2. Server 已有 Trace 存储、查询与管理接口
3. `AgentTraceReviewService` 已提供失败工具、审批热点、压缩/循环命中率与热点 Trace 聚合
4. `review-agent-traces.mjs` 已提供工程摘要输出与建议回写项

当前缺口：

1. 审批/压缩/循环统计仍受上游运行时是否写入对应标记约束；当前已补齐别名与基础字段标准化

### 3.5 文档园艺层

当前已有：

1. `docs/plans/*` 必须回写长期事实源的治理规则
2. `check-plan-drift.mjs` 已输出 `keep / rewrite-to-design / delete`
3. 已根据 `docs:garden` 清理失效计划文档与悬空引用

当前缺口：

1. 当前园艺分类仍以规则级文本判断为主，不做语义理解

## 4. 目标闭环

Moryflow 的 Harness Engineering 目标闭环固定为 5 层：

### 4.1 仓库契约闭环

目标：

1. 让文档治理、关键入口、generated 约束可被脚本校验
2. 让 Agent 能先读可机读清单，再理解仓库表面

对应产物：

1. 文档契约检查脚本
2. `generated/harness/agent-surface.json`

### 4.2 运行时场景回放闭环

目标：

1. 用标准场景回放共享运行时控制面
2. 避免“单点测试都通过，但整段流程漂移”

标准首批场景固定为：

1. `permission ask -> approve once -> resume`
2. `context window near limit -> compaction`
3. `same tool repeated -> doom loop guard`
4. `large tool output -> truncate + externalize`

场景回放 Harness 的定义：

1. 输入不是单个函数参数，而是一段标准场景
2. 输出不是单个返回值，而是一组运行时事件序列、状态变化、工具摘要与 Trace 标记
3. 共享运行时先回放一次，PC / Mobile 只补各自装配差异

### 4.3 对话界面场景闭环

目标：

1. 把运行时事件映射到可视消息结构与交互语义
2. 保证共享协议与端侧壳层不漂移

标准场景固定包括：

1. Tool / Reasoning 运行中展开、完成后折叠
2. round 结束后仅结论可见
3. disclosure 不打断 viewport follow
4. approval request 插入与恢复不破坏消息顺序
5. task snapshot 只从 session summary 投影

### 4.4 Trace 评审闭环

目标：

1. 让生产 Trace 不只是存档，而是成为工程输入
2. 让失败工具、审批热点、上下文膨胀、doom loop 热点可以周期性回看

固定聚合维度：

1. 高频失败工具
2. 高频审批路径
3. `compaction` 触发率
4. `doom loop` 命中率
5. 长 Trace / 高 Token / 高频中断分布

### 4.5 文档园艺闭环

目标：

1. 控制 `docs/plans/*` 熵增
2. 防止计划文档长期承担稳定事实

固定输出类型：

1. `keep`
2. `rewrite-to-design`
3. `delete`

## 5. 实施边界

Harness Engineering 的实施边界固定如下：

1. 不新建独立平台仓库或平行工具链
2. 不复制第二套文档事实源
3. 不在 PC / Mobile 各写一套语义不同的 Harness
4. 不把 Trace 系统扩展成高成本原始事件倾倒
5. 不把计划文档长期保留为唯一事实源

## 6. 当前文档覆盖结论

当前与 Harness 直接相关的文档覆盖结论如下：

1. 运行时控制面：已有长期事实源，覆盖较完整
2. 对话共享协议：已有长期事实源，覆盖较完整
3. Harness 基线：此前缺失，现由本文件补齐
4. Harness 执行步骤：由 `docs/plans/2026-03-09-moryflow-harness-engineering-upgrade-plan.md` 承担
5. 顶层入口覆盖：
   - `docs/design/moryflow/core/index.md` 必须纳入本文件
   - `docs/index.md` 维持顶层导航，不承担细项罗列

## 7. 当前验证基线

当前固定最小验证入口如下：

1. 文档治理、根脚本或仓库表面改动：`pnpm harness:check`
2. 共享运行时改动：`pnpm --filter @moryflow/agents-runtime test -- test/runtime-harness.spec.ts`
3. 对话界面语义改动：`pnpm --filter @moryflow/ui test -- test/conversation-harness.test.tsx`
4. Mobile 会话语义改动：`pnpm --filter @moryflow/mobile exec vitest run lib/chat/__tests__/approval-store.spec.ts lib/chat/__tests__/conversation-harness.spec.ts lib/chat/__tests__/tasks-sheet-model.spec.ts`
5. PC 壳层语义改动：先执行 `pnpm build:packages && pnpm --filter @moryflow/pc build`，再执行相关 `renderer/main` 测试与 PC Electron Playwright harness：
   - `pnpm --filter @moryflow/pc exec playwright test tests/core-flow.spec.ts`
   - `pnpm --filter @moryflow/pc exec playwright test tests/chat-chips.spec.ts`
   - `pnpm --filter @moryflow/pc exec playwright test tests/agent-runtime-harness.spec.ts`
   - `pnpm --filter @moryflow/pc exec playwright test tests/automations-harness.spec.ts`
6. Trace 评审链路改动：`pnpm --filter @moryflow/server exec vitest run src/agent-trace/agent-trace-review.service.spec.ts` 与 `pnpm trace:review`
7. 文档园艺改动：`node scripts/check-plan-drift.test.mjs` 与 `pnpm docs:garden`
8. 当需要明确进入“可提 PR”状态，或用户明确要求补齐 PR 前信心验证时，额外执行 `pnpm lint` 与 `pnpm typecheck`
9. 仅当涉及跨包契约、根配置或用户主链路时，才升级到根级全量

## 8. 相关文档

1. [ui-conversation-and-streaming.md](ui-conversation-and-streaming.md)
2. [agent-runtime-control-plane-adr.md](agent-runtime-control-plane-adr.md)
3. [chat-stream-runtime-refactor.md](chat-stream-runtime-refactor.md)
4. [testing-and-validation.md](../../../reference/testing-and-validation.md)
5. [2026-03-09-moryflow-harness-engineering-upgrade-plan.md](../../../plans/2026-03-09-moryflow-harness-engineering-upgrade-plan.md)
