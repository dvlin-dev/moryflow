---
title: Auth - 域名与路由
date: 2026-01-05
scope: moryflow.com, aiget.dev
status: active
---

<!--
[INPUT]: 两条业务线（moryflow.com / aiget.dev）；三机反代；Aiget Dev API 统一入口
[OUTPUT]: 对外域名职责与入口反代路由规则
[POS]: 域名与 API 路由规范（可执行）
-->

# 域名与路由

## 对外域名职责（固定）

### Moryflow

- `www.moryflow.com`：营销入口（落地页）。
- `docs.moryflow.com`：产品文档（独立 Docs 项目）。
- `app.moryflow.com`：主应用（Web UI）+ API（同域）。
- `moryflow.app`：用户发布站（Cloudflare Worker + R2）。

### Aiget Dev

- `aiget.dev`：官网 + 统一 API（`/api/v1`；模块页 `/fetchx`、`/memox`）。
- `console.aiget.dev`：控制台（Web UI，仅前端）。
- `admin.aiget.dev`：管理后台（Web UI，仅前端）。
- `docs.aiget.dev`：产品文档（独立 Docs 项目）。

## API 规范（固定）

- Moryflow API base：`https://app.moryflow.com/api/v1`
- Aiget Dev API base：`https://aiget.dev/api/v1`

约束：

- Moryflow Web 端只请求同源 API（不做跨域 CORS 方案）。
- Aiget Dev 的 Web（console/admin）跨域调用 `aiget.dev/api/v1`：必须配置 CORS 与 refresh CSRF 白名单。
- Auth 路由固定：`/api/v1/auth/*`（包含 Google/Apple 登录）。
- Aiget Dev 能力路由建议按模块分前缀：
  - Memox：`/api/v1/memox/*`
  - Agentsbox：`/api/v1/agentsbox/*`

## 入口反代（megaboxpro / 1panel）

你当前的默认入口为 megaboxpro（所有用户先到 megaboxpro，再转发到 4c6g/8c16g）。

最小规则（按 Host 分流）：

- `www.moryflow.com` → 4c6g（moryflow-www）
- `app.moryflow.com` → 4c6g（moryflow-app，包含 `/api/v1`）
- `aiget.dev` → 8c16g（aiget-web + aiget-api，包含 `/api/v1`）
- `console.aiget.dev` → 8c16g（aiget-console-web）
- `admin.aiget.dev` → 8c16g（aiget-admin-web）

> 不做旧域名兼容：不再维护 `fetchx.aiget.dev`、`memox.aiget.dev` 等子域名（文档域名固定为 `docs.aiget.dev`）。
