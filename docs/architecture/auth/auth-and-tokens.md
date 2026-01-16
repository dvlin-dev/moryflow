---
title: Auth - 认证与 Token
date: 2026-01-05
scope: web
status: active
---

<!--
[INPUT]: 邮箱验证码注册/登录 + 密码；Google/Apple 登录；Web refresh cookie + access memory
[OUTPUT]: Token 模型、存储方式、刷新流程与校验方式
[POS]: 两套 Auth 的认证与会话策略（Token-only for API）
-->

# 认证与 Token

## 认证方式

- 邮箱验证码：注册/登录
- 邮箱 + 密码：登录
- 第三方登录：Google / Apple（OAuth/OIDC）

## Token 规则（固定参数）

- `accessTokenTtl=6h`（JWT）
- `refreshTokenTtl=90d`
- `refreshRotation=on`（每次 refresh 都签发新 refreshToken，旧的立刻失效）

## Token 存储（固定规则）

- Web（SPA/SSR）：
  - refreshToken：`HttpOnly; Secure; SameSite=Lax` Cookie
  - accessToken：内存（页面刷新后通过 refresh 重新获取）

Cookie domain 规则：

- Moryflow：`Domain=.moryflow.com`
- Anyhunt Dev：`Domain=.anyhunt.app`

## 刷新主流程（必须实现）

1. 业务请求只带 `Authorization: Bearer <accessToken>`
2. accessToken 过期/收到 `401 token_expired`：
   - 调 `POST /api/v1/auth/refresh`
   - 成功后更新 refreshToken（Web 写 Cookie；Electron/RN 写 Secure Storage）
   - 更新内存 accessToken
3. 原请求仅重试一次

## Web refresh 的 CSRF 约束（必须实现）

因为 refreshToken 在 Cookie 中，`POST /api/v1/auth/refresh` 必须：

- 只允许 `POST`
- 要求 `Content-Type: application/json`
- 校验 `Origin` 必须是：
  - Moryflow：`https://app.moryflow.com`
  - Anyhunt Dev：`https://console.anyhunt.app` / `https://admin.anyhunt.app`

## 产品服务端校验 accessToken（固定规则）

- Auth 服务暴露 JWKS：`GET /api/v1/auth/jwks`
- 业务服务离线验签 JWT（缓存 JWKS，按 `kid` 自动更新）
