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
  - `node scripts/generate-agent-surface.mjs`
- 运行时场景回放：`pnpm --filter @moryflow/agents-runtime test -- test/runtime-harness.spec.ts`
- 对话界面 Harness：`pnpm --filter @moryflow/ui test -- test/conversation-harness.test.tsx`
- Mobile 会话桥接：`pnpm --filter @moryflow/mobile exec vitest run lib/chat/__tests__/approval-store.spec.ts lib/chat/__tests__/conversation-harness.spec.ts lib/chat/__tests__/tasks-sheet-model.spec.ts`
- PC 壳层语义：先执行 `pnpm build:packages && pnpm --filter @moryflow/pc build`，再执行相关 `vitest` 文件
- PC Electron Harness：`pnpm --filter @moryflow/pc exec playwright test tests/agent-runtime-harness.spec.ts`
- Trace 评审：`pnpm --filter @moryflow/server exec vitest run src/agent-trace/agent-trace-review.service.spec.ts` 与 `pnpm trace:review`
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
- `.husky/pre-commit` 必须遵守最小化原则；纯 Markdown staged changes 不得额外触发根级 `typecheck`

## 继续阅读

- 协作与交付：`docs/reference/collaboration-and-delivery.md`
- 构建与部署基线：`docs/reference/build-and-deploy-baselines.md`
- Harness 基线：`docs/design/moryflow/core/harness-engineering-baseline.md`
