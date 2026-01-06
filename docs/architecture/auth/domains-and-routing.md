---
title: Auth - 域名与路由
date: 2026-01-05
scope: moryflow.com, aiget.dev
status: active
---

<!--
[INPUT]: 两条业务线（moryflow.com / aiget.dev）；三机反代；Web 与 API 同源
[OUTPUT]: 对外域名职责与入口反代路由规则
[POS]: 域名与 API 路由规范（可执行）
-->

# 域名与路由

## 对外域名职责（固定）

### Moryflow

- `www.moryflow.com`：营销入口（落地页/文档）。
- `app.moryflow.com`：主应用（Web UI）+ API（同域）。
- `moryflow.app`：用户发布站（Cloudflare Worker + R2）。

### Aiget Dev

- `console.aiget.dev`：控制台（Web UI）+ API（同域）。
- Agentsbox/Memox 官网：独立域名，仅做跳转到 `console.aiget.dev`（不承载登录态）。

## API 规范（固定）

- Moryflow API base：`https://app.moryflow.com/api/v1`
- Aiget Dev API base：`https://console.aiget.dev/api/v1`

约束：

- Web 端只请求同源 API（不做跨域 CORS 方案）。
- Auth 路由固定：`/api/v1/auth/*`（不做 OAuth）。
- Aiget Dev 能力路由建议按模块分前缀：
  - Memox：`/api/v1/memox/*`
  - Agentsbox：`/api/v1/agentsbox/*`

## 入口反代（megaboxpro / 1panel）

你当前的默认入口为 megaboxpro（所有用户先到 megaboxpro，再转发到 4c6g/8c16g）。

最小规则（按 Host 分流）：

- `www.moryflow.com` → 4c6g（moryflow-www）
- `app.moryflow.com` → 4c6g（moryflow-app，包含 `/api/v1`）
- `console.aiget.dev` → 8c16g（aiget-console，包含 `/api/v1`）

> 由于 Aiget Dev 已收敛为单一入口 `console.aiget.dev`，不再需要“按能力/产品拆多个子域名入口”的网关逻辑。
