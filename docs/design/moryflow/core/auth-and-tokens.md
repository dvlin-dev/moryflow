---
title: Moryflow Auth 与 Token（产品视角）
date: 2026-02-28
scope: apps/moryflow/*
status: active
---

<!--
[INPUT]: 平台统一 token 契约 + Moryflow 域名与客户端形态
[OUTPUT]: Moryflow Auth 关键差异与落地约束（避免双份全文重复）
[POS]: Moryflow Core / Auth

[PROTOCOL]: 本文件变更需同步 `docs/design/moryflow/core/index.md`、`docs/design/anyhunt/core/auth-and-tokens.md` 与 `docs/index.md`。
-->

# Moryflow Auth 与 Token

## 1. 单一事实源

平台级通用规则以以下文档为准：

- `docs/design/anyhunt/core/auth-and-tokens.md`

本文件仅保留 Moryflow 专属口径，避免双份全文并行维护。

## 2. Moryflow 专属约束

### 2.1 Cookie 与域名

- Cookie Domain：`.moryflow.com`
- Web 主域：`https://server.moryflow.com`
- 认证相关 Origin 校验至少覆盖：
  - `https://server.moryflow.com`
  - `https://www.moryflow.com`（如前端链路涉及）

### 2.2 客户端形态

- Web：refresh token 放 `HttpOnly` Cookie，access token 内存态。
- PC/Mobile：refresh token 使用安全存储，不落普通本地存储。
- 原生端 refresh 必须携带 `X-App-Platform`。

### 2.3 刷新与重试

- 业务请求仅携带 access token。
- 收到 `401 token_expired` 后执行一次 refresh 并仅重试一次原请求。
- refresh 失败必须回收本地会话并引导重新登录。

## 3. 与发布/同步链路的协同约束

- Token 逻辑不得与 cloud-sync/site publish 业务状态耦合。
- 所有 auth 失败分支应保持统一错误码与可观测日志字段，便于跨端排障。

## 4. 代码落点参考

- Server Auth：`apps/moryflow/server/src/auth/`
- PC Auth：`apps/moryflow/pc/src/renderer/features/auth/`
- Mobile Auth：`apps/moryflow/mobile/lib/auth/`

## 5. 变更门禁

出现以下情况时，必须同时回写共享文档与 Moryflow 文档：

1. token ttl / rotation / refresh 语义变化
2. Origin 校验策略变化
3. 原生端 refresh 协议变化（header/body）
