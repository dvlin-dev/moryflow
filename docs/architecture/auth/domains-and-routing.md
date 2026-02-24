---
title: Auth - 域名与路由
date: 2026-01-05
scope: moryflow.com, anyhunt.app, server.anyhunt.app
status: active
---

<!--
[INPUT]: 两条业务线（moryflow.com / anyhunt.app / server.anyhunt.app）；三机反代；Anyhunt Dev API 统一入口
[OUTPUT]: 对外域名职责与入口反代路由规则
[POS]: 域名与 API 路由规范（可执行）
-->

# 域名与路由

## 对外域名职责（固定）

### Moryflow

- `www.moryflow.com`：营销入口（落地页）。
- `docs.moryflow.com`：产品文档（独立 Docs 项目）。
- `server.moryflow.com`：主应用（Web UI）+ API（同域）。
- `moryflow.app`：用户发布站（Cloudflare Worker + R2）。

### Anyhunt Dev

- `anyhunt.app`：官网（模块页 `/fetchx`、`/memox`）。
- `server.anyhunt.app`：统一 API（`/api/v1`）。
- `console.anyhunt.app`：控制台（Web UI，仅前端）。
- `admin.anyhunt.app`：管理后台（Web UI，仅前端）。
- `docs.anyhunt.app`：产品文档（独立 Docs 项目）。

## API 规范（固定）

- Moryflow API base：`https://server.moryflow.com/api/v1`
- Anyhunt Dev API base：`https://server.anyhunt.app/api/v1`

约束：

- Moryflow Web 端只请求同源 API（不做跨域 CORS 方案）。
- Anyhunt Dev 的 Web（console/admin）跨域调用 `server.anyhunt.app/api/v1`：必须配置 CORS 与 refresh CSRF 白名单。
- Auth 路由固定：`/api/auth/*`（包含 Google/Apple 登录）。
- Anyhunt Dev 能力路由按功能资源组织（不再使用 memox 前缀）：
  - Memox：`/api/v1/memories`、`/api/v1/entities`、`/api/v1/relations`、`/api/v1/graph`
  - Fetchx Search：`/api/v1/search`
  - Agentsbox：`/api/v1/agentsbox/*`

## 入口反代（megaboxpro / 1panel）

你当前的默认入口为 megaboxpro（所有用户先到 megaboxpro，再转发到 4c6g/8c16g）。

最小规则（按 Host 分流）：

- `www.moryflow.com` → 4c6g（moryflow-www）
- `server.moryflow.com` → 4c6g（moryflow-app，包含 `/api/v1`）
- `anyhunt.app` → 8c16g（anyhunt-web）
- `server.anyhunt.app` → 8c16g（anyhunt-api，包含 `/api/v1`）
- `console.anyhunt.app` → 8c16g（anyhunt-console-web）
- `admin.anyhunt.app` → 8c16g（anyhunt-admin-web）

> 不做旧域名兼容：不再维护 `fetchx.anyhunt.app`、`memox.anyhunt.app` 等子域名（文档域名固定为 `docs.anyhunt.app`）。
