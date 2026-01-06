---
title: 用户系统（两套 Auth）- 技术方案
date: 2026-01-06
scope: moryflow.com, aiget.dev
status: active
---

<!--
[INPUT]: 两条业务线（Moryflow / Aiget Dev）；不做 OAuth；Web 同源 API；refresh cookie + access memory；Aiget Dev 对外能力走 API key
[OUTPUT]: 可落地的 Auth 服务形态、路由、token 规则与安全约束
[POS]: 用户系统实现与前端接入的“默认真相”

[PROTOCOL]: 本文件变更若影响全局架构约束，需同步更新 `docs/architecture/auth.md` 与 `docs/architecture/domains-and-deployment.md`。
-->

# 技术方案

## 总原则（固定）

1. **两套 Auth**：
   - Moryflow Auth：仅服务 `app.moryflow.com`
   - Aiget Dev Auth：仅服务 `console.aiget.dev`
2. **永不互通**：不共享账号/Token/数据库；不做 OAuth。
3. **Web 与 API 同源**：避免 CORS 与跨站 Cookie 复杂度。

## 域名与路由

- Moryflow（应用 + API）：`https://app.moryflow.com/api/v1/...`
- Aiget Dev（控制台 + API）：`https://console.aiget.dev/api/v1/...`

Auth 路由（两套一致）：

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email-otp`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/jwks`

## Token 规则（固定）

- `accessTokenTtl=6h`（JWT）
- `refreshTokenTtl=90d`
- `refreshRotation=on`

### 存储策略（Web）

- refreshToken：`HttpOnly; Secure; SameSite=Lax` Cookie
  - Moryflow：`Domain=.moryflow.com`
  - Aiget Dev：`Domain=.aiget.dev`
- accessToken：仅内存；页面刷新后调用 refresh 恢复

### 刷新流程（必须）

1. 正常请求只带 `Authorization: Bearer <accessToken>`
2. `401 token_expired` 时调用 `POST /api/v1/auth/refresh`
3. 成功后更新 accessToken（内存），原请求仅重试一次

### refresh 的 CSRF 约束（必须）

- 只允许 `POST`
- 要求 `Content-Type: application/json`
- 校验 `Origin`：
  - Moryflow：必须是 `https://app.moryflow.com`
  - Aiget Dev：必须是 `https://console.aiget.dev`

## 服务端鉴权（JWT）

- 业务服务离线验签 JWT：
  - 通过 `GET /api/v1/auth/jwks` 拉取并缓存 JWKS
  - 按 `kid` 自动更新

## Aiget Dev 对外能力（API key）

Aiget Dev 下的 Memox/Agentsbox 对外 API 使用 API key 鉴权：

- Header：`Authorization: Bearer <apiKey>`
- 多租户隔离（最小可用）：`tenantId` 从 apiKey 推导；按 `namespace + externalUserId` 划分数据域

详见：`docs/architecture/auth/quota-and-api-keys.md`。
