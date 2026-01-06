---
title: 域名与部署架构（两条业务线）
date: 2026-01-06
scope: moryflow.com, aiget.dev
status: active
---

<!--
[INPUT]: 两条业务线（Moryflow / Aiget Dev）；三机部署（megaboxpro/4c6g/8c16g）；不做 OAuth；只共享代码
[OUTPUT]: 域名职责、入口反代、服务分层与部署边界的可执行方案
[POS]: 当前阶段的“默认架构真相”，实现与部署应以此为准

[PROTOCOL]: 本文件变更时，需同步更新 docs/architecture/CLAUDE.md、docs/CLAUDE.md；若影响全局约束（域名/路由/模型），需同步更新根 CLAUDE.md。
-->

# 域名与部署架构（两条业务线）

本方案的目标是：在不引入 OAuth、不做跨域账号互通的前提下，把域名与部署复杂度压到个人可维护，同时保留未来扩展空间（主要通过 `packages/*` 复用代码）。

## 核心原则（固定）

1. **两条业务线互不互通**：不共享账号/Token/数据库。
2. **只共享代码**：后端基础设施抽到 `packages/*` 复用；部署互不影响。
3. **Web 与 API 同源**：避免 CORS 和跨站 Cookie 复杂度。
4. **不引入 Tailscale**：服务间走公网 HTTPS；安全依靠鉴权 + 限流 + 最小暴露面。

## 域名职责（固定）

### Moryflow（主产品）

- `www.moryflow.com`：营销入口（文档/落地页）。
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

- `console.aiget.dev`：控制台（Web UI）+ API（同域，`/api/v1`）。
  - Agentsbox / Memox 等能力均作为模块在此域名下提供 API。
- Agentsbox/Memox 官网：独立域名，仅做营销与跳转到 `console.aiget.dev`（不承载登录态）。

## 对外 API 规范（固定）

- Moryflow API base：`https://app.moryflow.com/api/v1`
- Aiget Dev API base：`https://console.aiget.dev/api/v1`

约定：

- `app.setGlobalPrefix('api')`；对外统一 `/api/v1/...`
- Auth：`/api/v1/auth/*`（不做 OAuth）
- Aiget Dev API Key：`Authorization: Bearer <apiKey>`

## 三机部署拓扑（当前默认）

你当前机器分工建议固化为：

1. **megaboxpro（2c2g，中国大陆优化）**：只做入口反代（1panel/Nginx），不承载核心业务。
2. **4c6g（主服务稳定性）**：只跑 Moryflow 业务与数据库。
3. **8c16g（重服务）**：跑 Aiget Dev（console + API）、Memox、Agentsbox，以及所有重任务 worker；向量库单独 Postgres。

### 服务清单（建议）

**4c6g：Moryflow**

- `moryflow-web`（`app.moryflow.com`）
- `moryflow-api`（同域，或与 web 同服务）
- `moryflow-postgres`
- `moryflow-redis`

**8c16g：Aiget Dev + Memox**

- `aiget-console-web`（`console.aiget.dev`）
- `aiget-console-api`（同域，或与 web 同服务）
- `aigetdev-postgres`（Auth/Console/Agentsbox/Memox 元数据）
- `aigetdev-redis`（队列/限流/缓存）
- `memox-vector-postgres`（pgvector，独立实例，避免膨胀拖垮主库）
- `agentsbox-worker`（无头浏览器/抓取等重任务）
- `memox-worker`（embedding 计算、批量写入等）

## 入口反代（megaboxpro / 1panel）建议

你已确认：Cloudflare 仅做 DNS，不开橙云；所有用户先到 megaboxpro，再反代到 4c6g/8c16g。

建议按 Host 直接分流：

- `www.moryflow.com` → 4c6g（营销站）
- `app.moryflow.com` → 4c6g（应用+API）
- `console.aiget.dev` → 8c16g（控制台+API）

> 具体 Nginx 示例与部署 checklist 见：`docs/architecture/refactor-and-deploy-plan.md`。
