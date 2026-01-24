---
title: Anyhunt Server Prisma & Multi-DB Boundary Code Review
date: 2026-01-26
scope: apps/anyhunt/server (prisma/vector-prisma/migrations)
status: done
---

<!--
[INPUT]: apps/anyhunt/server/prisma/*, prisma.*.config.ts, src/prisma/*, src/vector-prisma/*, docker-entrypoint.sh, test/helpers/containers.ts, package.json
[OUTPUT]: 风险清单 + 修复建议 + 进度记录
[POS]: Phase 2 / P0 模块审查记录（Anyhunt Server：Prisma/迁移/多数据库边界）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Server Prisma / 迁移 / 多数据库边界 Code Review

## 范围

- Prisma Schema & Migrations
  - `apps/anyhunt/server/prisma/main/schema.prisma`
  - `apps/anyhunt/server/prisma/main/migrations/`
  - `apps/anyhunt/server/prisma/vector/schema.prisma`
  - `apps/anyhunt/server/prisma/vector/migrations/`
- Prisma Config
  - `apps/anyhunt/server/prisma.main.config.ts`
  - `apps/anyhunt/server/prisma.vector.config.ts`
- Prisma Clients / DI
  - `apps/anyhunt/server/src/prisma/`
  - `apps/anyhunt/server/src/vector-prisma/`
- 迁移与测试入口
  - `apps/anyhunt/server/docker-entrypoint.sh`
  - `apps/anyhunt/server/test/helpers/containers.ts`
  - `apps/anyhunt/server/package.json`（prisma scripts）

主要入口点（迁移/测试/运行）：

- 生产迁移：`docker-entrypoint.sh` → `prisma migrate deploy --config prisma.*.config.ts`
- 测试容器：`test/helpers/containers.ts` → `prisma migrate deploy/reset --config prisma.*.config.ts`
- 本地开发：`pnpm prisma:migrate:*` / `pnpm prisma:push:*`

依赖：

- PostgreSQL 16（主库）
- PostgreSQL + pgvector（向量库）
- Prisma CLI + @prisma/adapter-pg

## 结论摘要

- 高风险问题（P0）：0
- 中风险问题（P1）：1（暂不处理）
- 低风险/规范问题（P2）：0

## 发现（按严重程度排序）

- [P1] **跨库删除缺少统一清理策略** → 用户软删除仅写 `deletedAt`（`user.service.ts`），不会触发主库关联数据或向量库数据的清理；ApiKey 删除只有在走 `ApiKeyService.delete` 时才会清理向量库，且异步无重试。若产品要求“删除账号即删除全部数据”，当前实现无法满足。  
  影响：向量库残留数据（Memory/Entity/Relation），无法通过主库级删除保证一致性。  
  建议：明确数据删除策略；如需清理，增加“统一清理管道”（后台 job/批处理），对主库 ApiKey 与向量库数据做一致性清理与重试。（本轮暂不处理）

- [P1] **测试/本地与生产迁移路径不一致，可能掩盖迁移错误（已修复）** → 修复前 TestContainers 使用 `db push`（`test/helpers/containers.ts`），`db push` 会绕过 migration SQL，无法发现 migration 失效/不兼容问题。  
  影响：迁移在生产失败但测试仍通过。  
  修复：TestContainers 改为 `prisma migrate deploy/reset --config prisma.*.config.ts`，与生产路径对齐。

- [P1] **PrismaService 未显式校验 DATABASE_URL（已修复）** → 修复前 `VectorPrismaService` 会在缺失 `VECTOR_DATABASE_URL` 时直接抛错，但主库 `PrismaService` 没有对应校验，可能导致启动时报错信息不清晰。  
  影响：环境变量配置错误时排障成本高。  
  修复：主库增加 `DATABASE_URL` fail-fast 校验，错误提示对齐。

- [P1] **Prisma 配置使用存在不一致（已修复）** → 修复前迁移与 deploy 使用 `prisma.*.config.ts`，但 `package.json` 的 `prisma:migrate:*` 仍使用 `--schema`，导致 `shadowDatabaseUrl` 等配置只在部分流程生效。  
  影响：开发/测试/生产行为分裂，迁移与 shadow DB 策略难统一。  
  修复：迁移脚本统一使用 `--config prisma.*.config.ts`。

- [P2] **缺少向量库变更约束文档（已补充）** → `prisma/vector/` 未有协作文档（符合“文件数 < 10 不创建 CLAUDE.md”的规则），但 vector DB 的变更策略与主库不同（extensions/pgvector/soft reference）。  
  修复：在 `apps/anyhunt/server/CLAUDE.md` 补充向量库变更规范与部署要求入口。

- [P2] **prisma:push 脚本未标记 dev-only（已修复）** → 修复前提供 `prisma:push:*` 但未说明“仅开发/测试”，容易被误用到生产。  
  修复：脚本增加 guard（检测 `NODE_ENV=production` 时拒绝执行）。

## 测试审计

- 已有：
  - `apps/anyhunt/server/test/helpers/containers.ts`（TestContainers + migrate deploy/reset）
  - 集成测试对双库连接的依赖（如 `quota.service.integration.spec.ts`）
- 缺失：
  - 跨库清理策略的集成验证（用户删除 / apiKey 删除）

## 修复计划与进度

1. 明确跨库数据删除策略（合规/产品确认），按策略实现统一清理管道与重试机制。（P1）→ **deferred**
2. 在测试/CI 增加 `migrate deploy` 验证，避免迁移漂移。（P1）→ **done**
3. PrismaService 增加 `DATABASE_URL` 校验并统一错误提示。（P1）→ **done**
4. 统一 prisma script 使用 `--config`，收敛迁移路径。（P1）→ **done**
5. 补充向量库变更规范的文档入口。（P2）→ **done**

状态：**done（跨库删除策略暂不处理）**
