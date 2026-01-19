---
title: 合并 dvlin-dev/agent-browser-research 冲突解决方案
date: 2026-01-19
scope: anyhunt-monorepo
status: review
---

# 合并 dvlin-dev/agent-browser-research 冲突解决方案

## 背景

需求分支：`dvlin-dev/agent-browser-research`  
目标分支：`main`

该分支的核心目标见：`docs/research/agent-browser-integration.md`（L2 Browser + L3 Agent 的总体设计与边界）。

本合并的冲突主要来自两类变化叠加：

1. Anyhunt 品牌迁移（Aiget → Anyhunt）导致多个 `CLAUDE.md` 文案被同时修改
2. 分支新增 Browser/Agent 相关能力，带来大量新文件（以及 `AppModule` 依赖变更）

---

## 冲突总览（约 30 个）

### 1) 大量 “added by them” 的新文件（Browser 模块）

路径集中在：`apps/anyhunt/server/src/browser/**`

特点：

- 这些文件在 `main` 原本不存在（或仅存在骨架），分支引入完整实现
- Git merge 停在冲突状态时，这些文件会显示为 _unmerged / added by them_（只存在 stage=3）

推荐处理策略：

- **整体接受 theirs**（`git add apps/anyhunt/server/src/browser`），避免手工逐文件合并造成结构性偏差
- 之后再通过 `pnpm lint/typecheck/test:unit` 兜底校验

### 2) 文档/模块指南类文件的 “both modified”

冲突文件：

- `docs/CLAUDE.md`
- `apps/anyhunt/server/CLAUDE.md`

特点：

- `main`：完成 Anyhunt 业务线统一命名、域名约束（`server.anyhunt.app`）等
- 分支：补充 Research 写作约束、Agent 取消竞态/Shadow DB 等工程约束，但仍使用旧命名（Aiget）

推荐处理策略：

- **保留 main 的命名与域名约束**
- **合并分支的工程约束（Research 写作约束、Shadow DB 等）**
- **删除/替换旧命名（Aiget → Anyhunt）**，避免违反“零兼容原则”

---

## 关键合并决策（你审核时重点看）

### A. Browser 模块：直接采纳分支实现

结论：

- `apps/anyhunt/server/src/browser/**` 新增文件以分支版本为准（避免碎片化改动）
- Browser 模块在 `apps/anyhunt/server/src/browser/browser.module.ts` 中作为 `@Global()` 模块导出 `BrowserAgentPortService`，为 Agent 提供轻量端口（隔离 Playwright 重类型）

### B. Agent 模块：补齐 Anyhunt Server 缺失实现（修复 typecheck）

合并过程中暴露的问题：

- `apps/anyhunt/server/src/app.module.ts` 已引入 `AgentModule`（`import { AgentModule } from './agent'`）
- 但 `main` 并不存在 `apps/anyhunt/server/src/agent/**`，导致 `pnpm typecheck` 失败

结论（为了保证合并结果可编译/可运行）：

- 在 `apps/anyhunt/server/src/agent/**` 补齐 L3 Agent 实现，并使用 `@anyhunt/agents-core`（workspace 包）
- Agent 通过 `BrowserAgentPortService` 调用浏览器能力，不直接依赖 Playwright 类型

### C. 配额/计费：统一使用 `deduct.breakdown` 与 `refund:${transactionId}`

Anyhunt 当前的配额体系是 “Daily + Monthly + Purchased” 多 bucket，扣费返回 `deduct.breakdown`（可跨多个 bucket）。

结论：

- Agent 的 checkpoint / final settlement 扣费必须记录到 `AgentTaskCharge`，按 `breakdown` 逐条落库
- 失败退款必须基于 `breakdown`，并使用稳定幂等 key：`referenceId = refund:${transactionId}`
- **Daily bucket 退款必须携带 `deductTransactionId`**（用于定位 UTC 天）

### D. Prisma：为 AgentTask/AgentTaskCharge 补齐迁移

结论：

- `apps/anyhunt/server/prisma/main/schema.prisma` 引入 `AgentTask` / `AgentTaskCharge` / `AgentTaskStatus`
- 同步添加迁移：`apps/anyhunt/server/prisma/main/migrations/20260119203000_add_agent_task/migration.sql`

### E. Dokploy/Docker 构建：修复 workspace 依赖缺失导致的安装失败

现象（Dokploy 日志）：

- `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND: "@anyhunt/agents-core@workspace:*" ... no package named "@anyhunt/agents-core" is present in the workspace`

根因：

- `apps/anyhunt/server/Dockerfile` 的 `deps/prod-deps` 阶段只 `COPY` 了根 `package.json` 与 `apps/anyhunt/server/package.json`
- 但 `@anyhunt/anyhunt-server` 依赖 `@anyhunt/agents-core`（workspace 包），pnpm 在 Docker 构建中无法发现该 workspace 包（因为它的 `package.json` 没有进镜像）

结论（合并结果必须可部署）：

- 在 `apps/anyhunt/server/Dockerfile` 的 `deps/prod-deps` 阶段补充 `COPY packages/agents-core/package.json`
- 在 `builder/runner` 阶段补充 `COPY packages/agents-core`，避免 workspace symlink 在运行时变成断链
- Docker 构建默认 `pnpm install --ignore-scripts`：workspace 包不会自动生成 `dist/`。由于 `@anyhunt/agents-core` 的 `types` 指向 `dist/*`，需要在 `builder` 阶段显式 `tsc` 生成 `packages/agents-core/dist`，否则会触发 `TS2307: Cannot find module '@anyhunt/agents-core'`
- Prisma 在容器内可能提示 OpenSSL 检测警告；为避免 engine 选择不稳定，在镜像中安装 `openssl`

---

## 推荐操作流程（如果你要自己手工合并一次）

1. 查看冲突列表：`git diff --name-only --diff-filter=U`
2. 对 Browser 新增文件：`git add apps/anyhunt/server/src/browser`
3. 对 `docs/CLAUDE.md`、`apps/anyhunt/server/CLAUDE.md`：手工合并（保留 Anyhunt 命名 + 合并分支约束）
4. 处理完后验证：
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test:unit`

---

## 回归验证点（你审核时可对照）

- `apps/anyhunt/server/src/app.module.ts` 能成功编译（不再因 `./agent` 缺失失败）
- `fetchx.agent` / `fetchx.agent.estimate` 已加入 `apps/anyhunt/server/src/billing/billing.rules.ts`
- Agent 退款逻辑基于 `deduct.breakdown`，且 Daily 退款携带 `deductTransactionId`
- Dokploy/Docker 构建能完成 `pnpm install --filter @anyhunt/anyhunt-server... --prod`（不再因 workspace 包缺失失败）
- `pnpm lint && pnpm typecheck && pnpm test:unit` 全部通过

## 核对记录

- 2026-01-19：复核冲突解法与部署报错；本地通过 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit`、`pnpm build`。
