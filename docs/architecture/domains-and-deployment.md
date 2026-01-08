---
title: 域名与部署架构（两条业务线）
date: 2026-01-06
scope: moryflow.com, aiget.dev
status: active
---

<!--
[INPUT]: 两条业务线（Moryflow / Aiget Dev）；三机部署（megaboxpro/4c6g/8c16g）；支持 Google/Apple 登录；只共享代码
[OUTPUT]: 域名职责、入口反代、服务分层与部署边界的可执行方案
[POS]: 当前阶段的“默认架构真相”，实现与部署应以此为准

[PROTOCOL]: 本文件变更时，需同步更新 docs/architecture/CLAUDE.md、docs/CLAUDE.md；若影响全局约束（域名/路由/模型），需同步更新根 CLAUDE.md。
-->

# 域名与部署架构（两条业务线）

本方案的目标是：在不做跨域账号互通的前提下支持 Google/Apple 登录，把域名与部署复杂度压到个人可维护，同时保留未来扩展空间（主要通过 `packages/*` 复用代码）。

## 核心原则（固定）

1. **两条业务线互不互通**：不共享账号/Token/数据库。
2. **只共享代码**：后端基础设施抽到 `packages/*` 复用；部署互不影响。
3. **Aiget Dev API 统一入口**：Aiget Dev 对外 API 固定 `https://aiget.dev/api/v1`；控制台/后台为独立 Web 应用，需按 Origin 配置 CORS 与 CSRF。
   - 服务端生产环境强制要求配置 `ALLOWED_ORIGINS`（逗号分隔），至少包含 `https://aiget.dev`、`https://console.aiget.dev`、`https://admin.aiget.dev`。
4. **OAuth 登录**：支持 Google/Apple；每条业务线独立配置与回调域名。
5. **不引入 Tailscale**：服务间走公网 HTTPS；安全依靠鉴权 + 限流 + 最小暴露面。
6. **服务机只暴露 `IP:端口`**：4c6g/8c16g 不处理域名与证书；域名反代统一在 megaboxpro（1panel）。

## 域名职责（固定）

### Moryflow（主产品）

- `www.moryflow.com`：营销入口（落地页）。
- `docs.moryflow.com`：产品文档（独立 Docs 项目）。
- `app.moryflow.com`：主应用（Web UI）+ API（同域，`/api/v1`）。
- `moryflow.app`：用户发布站（Cloudflare Worker + R2，按 `*.moryflow.app` 映射）。

#### `moryflow.app` 发布站点约定（固定）

> 实现位置：`apps/moryflow/publish-worker/`（Worker + R2）。

- 访问域名：`https://{siteSlug}.moryflow.app/...`
- 根域名：`https://moryflow.app/*` 301 重定向到 `https://www.moryflow.com/*`
- R2 对象前缀：`sites/{siteSlug}/...`
  - 元数据：`sites/{siteSlug}/_meta.json`
  - 首页：`sites/{siteSlug}/index.html`
  - 可选自定义 404：`sites/{siteSlug}/404.html`

### Aiget Dev（开发者平台）

- `aiget.dev`：官网 + 统一 API（`/api/v1`）。
  - 模块入口：`/fetchx`、`/memox`
- `console.aiget.dev`：控制台（Web UI，仅前端）。
- `admin.aiget.dev`：管理后台（Web UI，仅前端）。
- `docs.aiget.dev`：产品文档（独立 Docs 项目）。

> 不做旧域名兼容：不再使用 `fetchx.aiget.dev`、`memox.aiget.dev` 等子域名（文档域名固定为 `docs.aiget.dev`）。

## 对外 API 规范（固定）

- Moryflow API base：`https://app.moryflow.com/api/v1`
- Aiget Dev API base：`https://aiget.dev/api/v1`

约定：

- `app.setGlobalPrefix('api')`；对外统一 `/api/v1/...`
- Auth：`/api/v1/auth/*`（支持 Google/Apple 登录）
- Aiget Dev API Key：`Authorization: Bearer <apiKey>`
- 生产环境 CORS：两条业务线服务端都要求配置 `ALLOWED_ORIGINS`（逗号分隔），按业务线分别填：
  - Moryflow：至少包含 `https://www.moryflow.com`、`https://admin.moryflow.com`、`https://app.moryflow.com`
  - Aiget：至少包含 `https://aiget.dev`、`https://console.aiget.dev`、`https://admin.aiget.dev`

## 三机部署拓扑（当前默认）

你当前机器分工建议固化为：

1. **megaboxpro（2c2g，中国大陆优化）**：只做入口反代（1panel/Nginx），不承载核心业务。
2. **4c6g（主服务稳定性）**：只跑 Moryflow 一套（单份 docker compose）+ 独立 DB/Redis。
3. **8c16g（重服务）**：只跑 Aiget Dev 多项目（Dokploy）+ 独立 DB/Redis。

### 服务清单（固定）

> 说明：Moryflow 使用单份 compose；Aiget Dev 采用 Dokploy 多项目部署（每个服务一个项目）。

**4c6g：Moryflow（`deploy/moryflow/docker-compose.yml`）**

- `moryflow-server`：API（对外通过反代暴露）
- `moryflow-www`：`www.moryflow.com`（占位页）
- `moryflow-docs`：`docs.moryflow.com`（Docs 项目）
- `moryflow-admin`：后台（独立 Web 前端）
- `moryflow-app`：`app.moryflow.com`（占位页；未来 Web App）
- `moryflow-postgres` / `moryflow-redis`：仅服务于 Moryflow 这一套

端口分配（固定）：

- `3100`：`moryflow-server`（API）
- `3102`：`moryflow-www`（www，占位页）
- `3103`：`moryflow-docs`
- `3101`：`moryflow-admin`
- `3105`：`moryflow-app`（app，占位页；未来 Web App）

**8c16g：Aiget Dev（Dokploy 多项目）**

- `aiget-server`：统一 API（Fetchx/Memox 等全部挂载于此）
- `aiget-www`：`aiget.dev` 官网（模块路由：`/fetchx`、`/memox`）
- `aiget-console`：`console.aiget.dev`（独立 Web 前端）
- `aiget-admin`：`admin.aiget.dev`（独立 Web 前端）
- `aiget-docs`：`docs.aiget.dev`（Docs 项目）
- `aiget-postgres` / `aiget-redis` / `aiget-vector-postgres`：仅服务于 Aiget Dev 这一套（不与 Moryflow 共享）

端口分配（建议固定，便于 megaboxpro 反代）：

- `3100`：`aiget-server`（API）
- `3103`：`aiget-www`（官网）
- `3102`：`aiget-console`
- `3101`：`aiget-admin`
- `3110`：`aiget-docs`

## 入口反代（megaboxpro / 1panel）建议

你已确认：Cloudflare 仅做 DNS，不开橙云；所有用户先到 megaboxpro，再反代到 4c6g/8c16g。

建议按 Host + Path 分流（服务机只暴露 `IP:端口`）：

- `www.moryflow.com` → `http://<4c6g-ip>:3102`
- `docs.moryflow.com` → `http://<4c6g-ip>:3103`
- `app.moryflow.com` → `http://<4c6g-ip>:3105`（当前占位页）
- `app.moryflow.com` 的 `/api/*` → `http://<4c6g-ip>:3100`（API，占位页不影响 API）
- `aiget.dev` → `http://<8c16g-ip>:3103`（官网）
- `aiget.dev` 的 `/api/*` → `http://<8c16g-ip>:3100`（统一 API）
- `docs.aiget.dev` → `http://<8c16g-ip>:3110`
- `console.aiget.dev` → `http://<8c16g-ip>:3102`
- `admin.aiget.dev` → `http://<8c16g-ip>:3101`

> 具体 Nginx 示例与部署 checklist 见：`docs/architecture/refactor-and-deploy-plan.md`。
