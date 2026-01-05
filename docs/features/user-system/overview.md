---
title: 用户系统（统一）- 总览
date: 2026-01-06
scope: aiget.dev
status: active
---

<!--
[INPUT]: 多产品；统一用户/计费；子域名架构；Token 策略（Web refresh cookie + access memory；原生 secure storage）
[OUTPUT]: 统一用户系统的核心流程（注册/登录/刷新/登出/账号绑定）与接口约定
[POS]: Feature 文档：用户系统，供后端实现与前端接入对齐

[PROTOCOL]: 本文件变更若影响 UIP 全局约束，需同步更新 `docs/architecture/unified-identity-platform.md`。
-->

# 统一用户系统（User System）

本功能是 UIP 的 identity 层落地规范：让所有产品共用 **同一套用户数据** 与 **同一套 token/session 策略**，同时保持每个产品独立部署与独立子域名访问。

更详细、可直接落地的技术方案见：`docs/features/user-system/tech-spec.md`。

## 关键概念

- **User**：平台唯一用户（email 唯一）；在所有产品共享
- **Profile**：用户资料（昵称、头像等）；共享
- **Account（OAuth Account）**：第三方账号绑定（Google 等）；共享
- **Session**：登录会话；共享；由 refresh token 驱动续期
- **Access Token**：短期访问 token，用于 API 请求鉴权
- **Refresh Token**：长期续期 token，用于刷新 access token（开启 rotation）

## 服务形态（如何“复用但不复杂”）

- **建议形态**：每个产品的 Server 都提供同一套 `/v1/auth/*` 路由，但底层复用同一份 `@aiget/auth` 代码与同一个 `identity` schema。
  - 优点：同域名同 origin（`https://{product}.aiget.dev`），Web 不需要额外 CORS/反向代理。
  - 结果：用户在 `moryflow.aiget.dev` 登录后，`Domain=.aiget.dev` 的 refresh cookie 也能被 `fetchx.aiget.dev` 使用，从而“免重复登录”。

## 统一接口规范（v1）

> 这些路由在每个产品域名下保持一致：`https://{product}.aiget.dev/v1/auth/*`

- `POST /v1/auth/register`
  - 输入：email、password、verifyCode（邮箱验证码）
  - 输出：设置 refresh cookie（Web）或返回 refresh token（原生），并返回 access token
- `POST /v1/auth/login`
  - 输入：email、password
  - 输出：同上
- `POST /v1/auth/google/start` 与 `GET /v1/auth/google/callback`
  - 行为：Google OAuth；callback 后与 email 对齐并绑定到同一 User
- `POST /v1/auth/refresh`
  - 行为：校验 refresh token → 轮换（rotation）→ 发新 access token（+ 新 refresh）
- `POST /v1/auth/logout`
  - 行为：失效当前 session/refresh；清理 Web refresh cookie
- `GET /v1/auth/me`
  - 行为：返回当前用户（需 access token）

## 核心流程

### 1) 邮箱注册（必须验证码）

1. `POST /v1/auth/register`（携带邮箱验证码）
2. 创建 `identity.user` + `identity.profile`
3. 创建 `identity.session`
4. 下发 token
   - Web：写入 refresh `HttpOnly Cookie`（`Domain=.aiget.dev`）；返回 access token
   - 原生：返回 refresh token + access token（由客户端写入 Secure Storage/内存）

### 2) 邮箱登录

1. `POST /v1/auth/login`
2. 校验密码 → 创建/更新 session → 下发 token（同上）

### 3) Google 登录（账号合并）

1. OAuth callback 获取 Google profile/email
2. 若 `identity.user.email` 已存在：绑定 Google account 到该 user（不新建 user）
3. 若不存在：创建 user 并绑定

### 4) Web 端跨子域免登录（`*.aiget.dev`）

- `refreshToken` cookie 的 `Domain=.aiget.dev` 让浏览器在访问 `fetchx.aiget.dev` 时也会带上同一个 refresh token。
- 应用启动时：
  1. 前端调用 `POST /v1/auth/refresh`（无需显式携带 refresh，浏览器自动带 cookie）
  2. 服务器轮换 refresh → 返回 access token
  3. 前端把 access token 放内存，之后所有 API 请求 `Authorization: Bearer <access>`

### 5) 原生端免登录

- App 启动从 Secure Storage 取 refresh token，走 `POST /v1/auth/refresh` 换取新 access（并轮换 refresh）。

## 安全约束（必须）

- Web：access token 不落 localStorage；refresh token 必须 `HttpOnly` cookie。
- Refresh rotation 开启：refresh 一旦使用就轮换，旧 token 立即失效。
- Token 泄露处置：支持按 session 粒度 revoke（登出/强制下线）。
- 账号唯一性：以 `email` 作为唯一用户键（注册/Google OAuth 均以此合并）。
