<!--
[INPUT]: 主库 Prisma schema + migrations（PostgreSQL 16）
[OUTPUT]: 可执行的 DB 变更规范与操作清单（开发/部署）
[POS]: apps/anyhunt/server/prisma/main 的协作入口，约束“如何改 schema、如何写迁移、如何部署”

[PROTOCOL]: 本目录（schema 或 migrations）变更时，需同步更新本文件的“变更记录/操作清单”（保持可独立理解）。
-->

# Anyhunt Server 主库 Prisma（prisma/main）

## 目录职责

- `schema.prisma`：Anyhunt Dev 主库（业务数据）唯一数据源
- `migrations/*`：主库迁移历史（只增不改）

## 迁移原则（强制）

- 已进入 `migrations/` 的迁移 **禁止修改**（避免生产/测试环境漂移）。
- 新变更一律新增 migration（哪怕“不考虑历史兼容”，也必须保证迁移链可顺序执行）。
- 允许 `DROP COLUMN/TABLE`（本项目默认零兼容），但必须确保：
  - 线上部署有明确的执行顺序（先 deploy migration，再 deploy server 代码）。

## 常用命令

- 开发生成迁移：`pnpm --filter @anyhunt/anyhunt-server prisma:migrate:main`
- 仅应用迁移（生产）：`pnpm --filter @anyhunt/anyhunt-server prisma migrate deploy --schema=prisma/main/schema.prisma`

## 近期变更记录

- 2026-01-20：LLM Settings 拆分默认模型：`defaultModelId` → `defaultAgentModelId/defaultExtractModelId`（新增补丁迁移，避免修改既有迁移）。
