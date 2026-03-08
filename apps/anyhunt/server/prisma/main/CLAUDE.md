<!--
[INPUT]: 主库 Prisma schema + migrations（PostgreSQL 16）
[OUTPUT]: 当前基线、迁移约束与操作清单（开发/部署）
[POS]: apps/anyhunt/server/prisma/main 的协作入口，约束“如何改 schema、如何写 migration、如何部署”

[PROTOCOL]: 仅在 schema/migrations 职责、迁移基线或关键操作约束变化时更新本文件。
-->

# Anyhunt Server 主库 Prisma（prisma/main）

## 当前基线

- `schema.prisma` 是 Anyhunt Dev 主库唯一 schema 事实源。
- 当前主库重置后只保留 1 条基线 migration：`20260306173000_init`。
- 后续 schema 变更必须继续新增 migration，禁止回写、改名或重做历史 migration。

## 迁移原则（强制）

- 已生成的 migration 禁止修改，避免生产/测试环境漂移。
- 项目默认零兼容，允许 `DROP COLUMN/TABLE`，但必须保证部署顺序明确：先执行 migration，再部署 server 代码。
- 开发环境可用 `prisma:push` 快速同步，但正式基线与 CI/部署都以 migration 为准。

## 常用命令

- 开发生成 migration：`pnpm --filter @anyhunt/anyhunt-server prisma:migrate:main`
- 仅应用 migration（生产）：`pnpm --filter @anyhunt/anyhunt-server prisma migrate deploy --config prisma.main.config.ts`
- 快速同步（仅开发/测试）：`pnpm --filter @anyhunt/anyhunt-server prisma:push:main`

## 测试与部署

- TestContainers 与 CI 优先使用 `prisma migrate deploy --config prisma.main.config.ts` 校验 migration 有效性。
- 若需要重建基线，只能通过新增 migration 或明确的仓库级迁移重置流程处理，不能直接篡改 `20260306173000_init`。
