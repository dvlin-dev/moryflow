---
title: 测试与验证
date: 2026-03-08
scope: monorepo
status: active
---

<!--
[INPUT]: 测试要求、风险分级、校验命令与测试环境
[OUTPUT]: 最小必要验证基线
[POS]: docs/reference/ 测试规范

[PROTOCOL]: 仅在测试分级、命令基线或测试环境失真时更新本文件。
-->

# 测试与验证

## 总原则

- 新功能必须补单元测试
- Bug 修复必须补回归测试
- 重构必须确保现有测试仍然成立
- 本地验证优先受影响模块的最小闭环，不把根级全量校验当作默认动作
- 执行验证前必须先保证所需依赖已就绪；若因缺少 workspace 依赖导致命令不可执行，AI Agent 默认应先在仓库根目录完成依赖安装，再继续验证，除非用户明确禁止或外部环境权限受限

## 测试环境

测试用 Docker Compose：

```bash
docker compose -f deploy/infra/docker-compose.test.yml up -d
```

包含：

- PostgreSQL 16
- Redis 7

## 后端测试

- 单元测试：Vitest
- 集成测试：依赖本地 Docker 数据库/缓存
- E2E：按包内命令执行

常用命令：

```bash
pnpm --filter @anyhunt/anyhunt-server test
pnpm --filter @anyhunt/anyhunt-server test:e2e
```

## 前端测试

- 单元测试：Vitest + Testing Library
- E2E：Playwright
- 核心用户流程必须有 E2E 覆盖

常用命令：

```bash
pnpm --filter @anyhunt/admin test:unit
pnpm --filter @anyhunt/admin test:e2e
pnpm --filter @anyhunt/console test
pnpm --filter @anyhunt/console test:e2e
```

## Harness 验证

- 文档治理、根脚本、仓库契约或 `generated/harness/agent-surface.json` 相关改动，至少执行 `pnpm harness:check`
- `pnpm harness:check` 当前固定包含：
  - `node scripts/check-doc-contracts.mjs`
  - `node scripts/generate-agent-surface.mjs --check`
- 需要刷新机读产物时，执行 `pnpm harness:sync`
- 运行时场景回放：`pnpm --filter @moryflow/agents-runtime test -- test/runtime-harness.spec.ts`
- 对话界面 Harness：`pnpm --filter @moryflow/ui test -- test/conversation-harness.test.tsx`
- Mobile 会话桥接：`pnpm --filter @moryflow/mobile exec vitest run lib/chat/__tests__/approval-store.spec.ts lib/chat/__tests__/conversation-harness.spec.ts lib/chat/__tests__/tasks-sheet-model.spec.ts`
- PC 壳层语义：先执行 `pnpm build:packages && pnpm --filter @moryflow/pc build`，再执行相关 `vitest` 文件
- PC 主进程 Memory / Knowledge 工具变更，至少执行：
  - `pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/memory/knowledge-tools.test.ts`
  - `pnpm --filter @moryflow/pc exec vitest run src/main/app/ipc/memory.test.ts src/main/memory-indexing/__tests__/engine.spec.ts src/main/memory-indexing/reconcile.spec.ts src/main/app/runtime/active-vault-runtime.test.ts`
- PC Electron Harness：共享 foundation 位于 `apps/moryflow/pc/tests/helpers/*`，feature-specific specs 固定包括：
  - `pnpm --filter @moryflow/pc exec playwright test tests/core-flow.spec.ts`
  - `pnpm --filter @moryflow/pc exec playwright test tests/chat-chips.spec.ts`
  - `pnpm --filter @moryflow/pc exec playwright test tests/agent-runtime-harness.spec.ts`
  - `pnpm --filter @moryflow/pc exec playwright test tests/automations-harness.spec.ts`
  - `pnpm --filter @moryflow/pc exec playwright test tests/memory-harness.spec.ts`
- Moryflow PC Automations / Telegram delivery 变更，至少补以下最小闭环：
  - `pnpm --filter @moryflow/automations-core test:unit`
  - `pnpm --filter @moryflow/pc exec vitest run src/main/automations/store.test.ts src/main/automations/context-store.test.ts src/main/automations/policy.test.ts src/main/automations/scheduler.test.ts src/main/automations/runner.test.ts src/main/automations/delivery.test.ts src/main/automations/integration.test.ts src/main/automations/service.test.ts src/main/app/ipc/automations.test.ts src/main/channels/telegram/inbound-reply-service.test.ts`
  - `pnpm --filter @moryflow/pc exec playwright test tests/automations-harness.spec.ts`
- Trace 评审：`pnpm --filter @moryflow/server exec vitest run src/agent-trace/agent-trace-review.service.spec.ts` 与 `pnpm trace:review`
  `pnpm trace:review` 默认读取仓库内固定样例；如需评审真实 Trace，使用 `--input <traces.json>` 或 stdin 覆盖；数值参数必须传合法整数
- 文档园艺：`node scripts/check-plan-drift.test.mjs` 与 `pnpm docs:garden`

## 风险分级

### L0

纯样式、文案、布局微调，且不涉及业务逻辑或状态流。

- 可跳过根级全量
- 按需做手工验证

### L1

组件交互、状态管理、数据映射、非核心逻辑重构。

- 至少运行受影响包的 `typecheck` 与 `test:unit`
- 如有对应测试文件，优先只跑相关用例
- 如涉及文档契约、计划文档、根脚本或仓库结构入口，同时执行 `pnpm harness:check`

### L2

核心业务逻辑、跨包接口、后端模块、构建/基础设施改动。

- 默认先跑受影响模块的最小必要验证，并补齐回归测试
- 仅当影响根配置、共享包、跨包集成或用户明确要求时，才升级为根级全量

根级全量命令：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

## 本地与 CI 分工

- 本地默认优先最小必要验证
- 当需要明确进入“可提 PR”状态，或用户明确要求补齐 PR 前信心验证时，本地额外执行 `pnpm lint` 与 `pnpm typecheck`
- PR 场景由 CI 负责根级全量 `lint` / `typecheck` / diff 范围 `test:unit`
- `main/develop` 分支 CI 还会执行全量 `test:unit` 与 `build`
- 当前 git hooks：
  - `.husky/pre-commit` 依次执行 `pnpm lint-staged`；若 staged 变更全为 Markdown/MDX 则直接结束；否则继续执行 `pnpm typecheck`
  - 当 staged 变更位于业务 workspace 内时，`pre-commit` 会按 workspace 收窄执行 `pnpm turbo run test:unit --concurrency=4`；共享 `packages/*` 默认带上 dependents
  - 当 staged 变更命中 `.husky/` 或 `scripts/` 时，`pre-commit` 会先执行 `node --test scripts/*.test.mjs`；若同次提交还包含业务 workspace 或根级配置变更，再继续执行对应 scoped/full `test:unit`
  - Markdown/MDX 文档与代码同次提交时，不会单独放大全局测试范围；只有纯文档提交才会整体跳过 `typecheck` 与 `test:unit`
  - 当 staged 变更命中根级依赖/构建图配置、`tooling/`、`.github/` 或无法安全收窄到单个 workspace package 时，`pre-commit` 会回退到全量 `pnpm turbo run test:unit --concurrency=4`
  - `.husky/commit-msg` 执行 `pnpm exec commitlint --edit $1`
- `.husky/pre-commit` 必须遵守最小化原则；纯 Markdown staged changes 不得额外触发根级 `typecheck`

## 继续阅读

- 协作与交付：`docs/reference/collaboration-and-delivery.md`
- 构建与部署基线：`docs/reference/build-and-deploy-baselines.md`
- Harness 基线：`docs/design/moryflow/core/harness-engineering-baseline.md`
