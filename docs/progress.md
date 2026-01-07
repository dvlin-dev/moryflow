---
title: 改造进度记录
date: 2026-01-07
scope: moryflow.com, aiget.dev
status: active
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

- 用户系统与 Fetchx 接入方案已更新：`docs/features/user-system/fetchx-integration-plan.md`
- Auth 服务模板已落地：`templates/auth-service/README.md`、`.env.example`、`CLAUDE.md`
- Aiget Dev Console/Admin 已接入 `@aiget/auth-client`（含 refresh 流程与用户态映射）
- 迁移 Docs 项目：Aiget（`apps/aiget/docs` → `docs.aiget.dev`）、Moryflow（`apps/moryflow/docs` → `docs.moryflow.com`）
- 清理旧版后台：删除 `apps/aiget/admin/www-old`
- ESLint 体系收口：根配置补齐 react-refresh/react-hooks 插件，console/admin 组件目录允许多导出
- Moryflow 侧 lint/type 修复（admin/server/mobile）

### 已验证

- `pnpm lint`（通过，mobile 仍有 warning）
- `pnpm typecheck`（通过）
- `pnpm test:unit`（通过，Redis/网络相关日志为测试噪音）

## 当前风险与待处理

- `apps/moryflow/mobile` 仍有 `react-hooks/exhaustive-deps` 与 `no-console` 警告
- `model-registry-data` 拉取依赖外网（离线会使用缓存）

## 下一步（按优先级）

> 你计划先做 P1 + P2 然后一起部署；这里把两部分拆成可执行清单（不做历史兼容）。

### P1：域名口径收口 + 官网合并（准备部署）

**目标**

- Aiget Dev 官网统一为 `aiget.dev`（模块页：`/fetchx`、`/memox`）
- API 固定为 `https://aiget.dev/api/v1/*`
- `console.aiget.dev`、`admin.aiget.dev` 保持独立 Web 项目（跨域调用 API）
- API Key 前缀统一为 `ag_`

**任务清单**

- [x] 合并官网代码到 `apps/aiget/www`，通过导航栏路由切换模块页（`/fetchx`、`/memox`）
- [x] 清理旧官网目录与引用（不再保留 `fetchx.aiget.dev` / `memox.aiget.dev`）
- [ ] Console/Admin 全量改为调用 `https://aiget.dev/api/v1`（不依赖同源 `/api/v1`）
- [ ] 统一 API key 文案与示例：`ag_` + `X-API-Key`（或最终统一成 `Authorization: Bearer`，二选一）
- [ ] 统一对外文档入口：`https://docs.aiget.dev`（产品文档），`https://aiget.dev/api-docs`（Swagger）

**验证清单**

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test:unit`
- [ ] 手动验证：`console.aiget.dev` 登录/refresh/logout 全流程（API 走 `aiget.dev/api/v1`）
- [ ] 手动验证：`admin.aiget.dev` 登录/refresh/logout 全流程（API 走 `aiget.dev/api/v1`）
- [ ] 手动验证：`aiget.dev/fetchx` Demo Playground 可用（验证码/限流/抓取结果展示）

### P2：后端收口为单服务（准备部署）

**目标**

- Aiget Dev 只保留一个后端：`apps/aiget/server`（最终成为 `aiget.dev` 的唯一 API 服务）
- Memox/Fetchx/Console/Admin 的 API 统一挂载在同一进程与同一 DB 连接策略下（不做兼容层）

**任务清单**

- [ ] 迁移/合并 `apps/aiget/memox/server` 的业务模块到 `apps/aiget/server`
  - 记忆/实体/关系/图谱/embedding 等模块
  - Prisma schema 合并（或拆分成多 datasource，但仍在一个 NestJS app 内）
- [ ] 合并/替换 `apps/aiget/admin/server` 的运营接口到 `apps/aiget/server`（或直接删除）
- [ ] 统一 CORS/CSRF：生产环境 `ALLOWED_ORIGINS` 包含 `https://console.aiget.dev`、`https://admin.aiget.dev`
- [ ] 清理并删除多余后端包（`apps/aiget/memox/server`、`apps/aiget/admin/server` 等）

**验证清单**

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test:unit`
- [ ] （可选）Docker：起 `deploy/infra/docker-compose.test.yml` 后跑集成测试
- [ ] Swagger UI：`https://aiget.dev/api-docs` 能看到 Fetchx + Memox 的公开 API
