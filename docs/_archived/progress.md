---
title: 改造进度记录（P1/P2 完成）
date: 2026-01-07
scope: moryflow.com, anyhunt.app, server.anyhunt.app
status: archived
archived_date: 2026-01-12
---

<!--
[INPUT]: 近期改造内容与里程碑计划
[OUTPUT]: 当前进度 + 下一步行动清单
[POS]: 改造进度追踪文档

[PROTOCOL]: 本文件变更需同步更新 docs/CLAUDE.md 与根 CLAUDE.md 的文档索引。
-->

# 改造进度记录

## 当前进度（截至 2026-01-07）

### 已完成

- 用户系统与 Fetchx 接入方案已更新：`docs/products/anyhunt-dev/migrations/fetchx-integration.md`
- Auth 服务模板已落地：`templates/auth-service/README.md`、`.env.example`、`CLAUDE.md`
- Anyhunt Dev Console/Admin 已接入 `/auth-client`（含 refresh 流程与用户态映射）
- 迁移 Docs 项目：Anyhunt（`apps/anyhunt/docs` → `docs.anyhunt.app`）、Moryflow（`apps/moryflow/docs` → `docs.moryflow.com`）
- 清理旧版后台：删除 `apps/anyhunt/admin/www-old`
- Anyhunt Dev 部署切换为 Dokploy 多项目，Moryflow 保持 compose（端口分配与反代口径已固化）
- ESLint 体系收口：根配置补齐 react-refresh/react-hooks 插件，console/admin 组件目录允许多导出
- Moryflow 侧 lint/type 修复（admin/server/mobile）

### 已验证

- `pnpm lint`（通过，mobile 仍有 warning）
- `pnpm typecheck`（通过）
- `pnpm test:unit`（通过，Redis/网络相关日志为测试噪音）
- `docker compose -f deploy/moryflow/docker-compose.yml config`（通过）

## 当前风险与待处理

- `apps/moryflow/mobile` 仍有 `react-hooks/exhaustive-deps` 与 `no-console` 警告
- `model-registry-data` 拉取依赖外网（离线会使用缓存）

## 下一步（按优先级）

> 你计划先做 P1 + P2 然后一起部署；这里把两部分拆成可执行清单（不做历史兼容）。

### P1：域名口径收口 + 官网合并（准备部署）

**目标**

- Anyhunt Dev 官网统一为 `anyhunt.app`（模块页：`/fetchx`、`/memox`）
- API 固定为 `https://server.anyhunt.app/api/v1/*`
- `console.anyhunt.app`、`admin.anyhunt.app` 保持独立 Web 项目（跨域调用 API）
- API Key 前缀统一为 `ah_`

**任务清单**

- [x] 合并官网代码到 `apps/anyhunt/www`，通过导航栏路由切换模块页（`/fetchx`、`/memox`）
- [x] 清理旧官网目录与引用（不再保留 `fetchx.anyhunt.app` / `memox.anyhunt.app`）
- [x] Console/Admin 全量改为调用 `https://server.anyhunt.app/api/v1`（生产默认；开发可用 Vite proxy）
- [x] 统一 API key 文案与示例：`ah_` + `Authorization: Bearer <apiKey>`
- [x] 统一对外文档入口：`https://docs.anyhunt.app`（产品文档），`https://server.anyhunt.app/api-docs`（Swagger）

**验证清单**

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test:unit`
- [x] 手动验证：`console.anyhunt.app` 登录/refresh/logout 全流程（API 走 `server.anyhunt.app/api/v1`）
- [x] 手动验证：`admin.anyhunt.app` 登录/refresh/logout 全流程（API 走 `server.anyhunt.app/api/v1`）
- [x] 手动验证：`anyhunt.app/fetchx` Demo Playground 可用（验证码/限流/抓取结果展示）

### P2：后端收口为单服务（准备部署）

**目标**

- Anyhunt Dev 只保留一个后端：`apps/anyhunt/server`（最终成为 `server.anyhunt.app` 的唯一 API 服务）
- Memox/Fetchx/Console/Admin 的 API 统一挂载在同一进程与同一 DB 连接策略下（不做兼容层）

**任务清单**

- [x] 迁移/合并 Memox 模块到 `apps/anyhunt/server`（memory/entity/relation/graph/embedding）
  - 记忆/实体/关系/图谱/embedding 等模块
  - Prisma schema 合并（仍在一个 NestJS app 内）
- [x] 删除多余后端包（`apps/anyhunt/memox/server`、`apps/anyhunt/admin/server`）
- [x] 确认 Admin API 以 `apps/anyhunt/server` 为唯一入口（`/api/v1/admin/*`）
- [x] 生产环境 CORS：`ALLOWED_ORIGINS` 覆盖 `https://console.anyhunt.app`、`https://admin.anyhunt.app`、`https://anyhunt.app`

**验证清单**

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test:unit`
- [x] （可选）Docker：起 `deploy/infra/docker-compose.test.yml` 后跑集成测试
- [x] Swagger UI：`https://server.anyhunt.app/api-docs` 能看到 Fetchx + Memox 的公开 API
