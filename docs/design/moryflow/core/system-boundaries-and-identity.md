---
title: Moryflow 核心边界与身份约束
date: 2026-02-28
scope: www.moryflow.com, server.moryflow.com, moryflow.app
status: active
---

# 核心边界

- Moryflow 与 Anyhunt 账号体系隔离，不共享账号/Token/数据库。
- API 入口：`https://server.moryflow.com/api/v1`。
- 域名职责：
  - `www.moryflow.com`：营销入口。
  - `server.moryflow.com`：应用与 API。
  - `moryflow.app`：用户发布站。

## 发布站规则（moryflow.app）

- 仅允许 `GET/HEAD`；其他方法返回 `405`。
- `OFFLINE/EXPIRED/404` 页面必须 `no-store`。
- 根域 `moryflow.app/*` 重定向到 `www.moryflow.com/*`。

## Auth 基线

- Web：refresh token 用 HttpOnly Cookie，access token 内存态。
- 原生端：refresh token 放请求体并携带 `X-App-Platform`。
- refresh rotation 开启，旧 refresh token 立即失效。

## 文档治理约束（已生效）

- 文档目录不保留 archive；历史文档无价值即删除。
- 删除前必须把可执行事实回写到 design 文档。
