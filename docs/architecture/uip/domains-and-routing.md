---
title: UIP - 域名与路由
date: 2026-01-05
scope: aiget.dev
status: active
---

<!--
[INPUT]: 子域名架构（*.aiget.dev）+ 单一 UIP
[OUTPUT]: 对外域名职责与 Nginx 路由转发规则
[POS]: 统一入口域名与 API 路由规范
-->

# 域名与路由

## 对外域名职责

- `moryflow.com`：落地页/文档（营销入口）；点击登录跳到 `moryflow.aiget.dev`
- `moryflow.aiget.dev`：主应用（Web UI）+ API（同域）
- `moryflow.app`：用户发布站（Cloudflare Worker + R2）

## API 规范（固定）

所有产品统一：

- API base：`https://{product}.aiget.dev/v1`
- 浏览器端只请求同源 API（不做跨域 CORS 方案）

## 网关转发（固定）

每个产品在 `{product}.aiget.dev` 前置 Nginx，按路径转发：

- `/v1/auth/*` → UIP
- `/v1/users/*` → UIP
- `/v1/subscriptions/*` → UIP
- `/v1/wallet/*` → UIP
- `/v1/entitlements/*` → UIP
- `/v1/payments/*` → UIP
- `/v1/webhooks/*` → UIP
- 其它 `/v1/*` → 产品业务服务

Nginx 必须为转发到 UIP 的请求注入并固定校验的产品标识：

- `X-Aiget-Product: moryflow|fetchx|memox|...`

