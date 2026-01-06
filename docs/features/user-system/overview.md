---
title: 用户系统（两套 Auth）- 总览与技术方案
date: 2026-01-06
scope: moryflow.com, aiget.dev
status: active
---

<!--
[INPUT]: 两条业务线（Moryflow / Aiget Dev）；支持 Google/Apple 登录；独立用户体系与数据库；Token 策略（Web refresh cookie + access memory；原生 secure storage）
[OUTPUT]: 两套用户系统的核心流程（注册/登录/刷新/登出）与接口约定（同路径、不同域名），以及落地技术方案
[POS]: Feature 文档：用户系统，供后端实现与前端接入对齐

[PROTOCOL]: 本文件变更若影响全局约束，需同步更新 `docs/architecture/auth.md`。
-->

# 用户系统（两套 Auth）

本功能约定当前仓库的用户系统落地方式：**两条业务线各自独立 Auth**，不做跨域互通。

## 关键概念

- **User**：业务线内唯一用户（email 唯一）；Moryflow 与 Aiget Dev 各自独立
- **Profile**：用户资料（昵称、头像等）；仅在所属业务线内
- **Account（OAuth Account）**：支持 Google/Apple 账号绑定；仅在所属业务线内
- **Session**：登录会话；仅在所属业务线内；由 refresh token 驱动续期
- **Access Token**：短期访问 token，用于 API 请求鉴权
- **Refresh Token**：长期续期 token，用于刷新 access token（开启 rotation）

## 服务形态（如何“复用但不复杂”）

- **Moryflow Auth**：只服务 `app.moryflow.com`（cookie `Domain=.moryflow.com`）。
- **Aiget Dev Auth**：只服务 `console.aiget.dev`（cookie `Domain=.aiget.dev`，平台内模块共享）。
- 两条 Auth **共享代码**（抽到 `packages/*`），但 **不共享数据库/密钥**。
- User/Profile/Session 等核心数据各自独立，禁止跨业务线关联。

## 统一接口规范（v1）

> 这些路由在各自业务线的应用域名下保持一致：
>
> - Moryflow：`https://app.moryflow.com/api/v1/auth/*`
> - Aiget Dev：`https://console.aiget.dev/api/v1/auth/*`

- `POST /api/v1/auth/register`
  - 输入：name、email、password
  - 输出：返回 `next=VERIFY_EMAIL_OTP`（注册后需要验证码完成登录态建立）
- `POST /api/v1/auth/verify-email-otp`
  - 输入：email、otp
  - 输出：设置 refresh cookie（Web）或返回 refresh token（原生），并返回 access token
- `POST /api/v1/auth/login`
  - 输入：email、password
  - 输出：同上
- `POST /api/v1/auth/google/start`
  - 输入：callbackURL（可选）
  - 输出：返回授权跳转 URL（Web）
- `POST /api/v1/auth/google/token`
  - 输入：idToken
  - 输出：返回 access/refresh 与用户信息（Native）
- `POST /api/v1/auth/apple/start`
  - 输入：callbackURL（可选）
  - 输出：返回授权跳转 URL（Web）
- `POST /api/v1/auth/apple/token`
  - 输入：idToken
  - 输出：返回 access/refresh 与用户信息（Native）
- `POST /api/v1/auth/refresh`
  - 行为：校验 refresh token → 轮换（rotation）→ 发新 access token（+ 新 refresh）
- `POST /api/v1/auth/logout`
  - 行为：失效当前 session/refresh；清理 Web refresh cookie
- `GET /api/v1/auth/me`
  - 行为：返回当前用户（需已登录；Web 用 refresh cookie，原生用 Bearer token）
- `GET /api/v1/auth/jwks`
  - 行为：提供 JWKS，用于服务端离线验签

## 核心流程

### 1) 邮箱注册（必须验证码）

1. `POST /api/v1/auth/register`（创建用户，进入验证码验证阶段）
2. 用户输入 OTP → `POST /api/v1/auth/verify-email-otp`
3. 创建 `identity.session`
4. 下发 token（refresh rotation 开启）
   - Web：写入 refresh `HttpOnly Cookie`（Moryflow：`Domain=.moryflow.com`；Aiget Dev：`Domain=.aiget.dev`）；返回 access token
   - 原生：返回 refresh token + access token（由客户端写入 Secure Storage/内存）

### 2) 邮箱登录

1. `POST /api/v1/auth/login`
2. 校验密码 → 创建/更新 session → 下发 token（同上）

### 3) 第三方登录（Google / Apple）

1. OAuth callback 获取 profile/email
2. 若 `identity.user.email` 已存在：绑定第三方 account 到该 user
3. 若不存在：创建 user 并绑定 account

### 4) Aiget Dev 平台内免重复登录

- Aiget Dev 已收敛为单入口 `console.aiget.dev`；平台内模块共享登录态无需跨子域方案。
- Moryflow 与 Aiget Dev **永不互通**，因此不设计跨域免登录。

### 5) 原生端免登录

- App 启动从 Secure Storage 取 refresh token，走 `POST /api/v1/auth/refresh` 换取新 access（并轮换 refresh）。

## 安全约束（必须）

- Web：access token 不落 localStorage；refresh token 必须 `HttpOnly` cookie。
- Refresh rotation 开启：refresh 一旦使用就轮换，旧 token 立即失效。
- Token 泄露处置：支持按 session 粒度 revoke（登出/强制下线）。
- 账号唯一性：业务线内以 `email` 作为唯一用户键（仅邮箱/密码/OTP）。

## 技术方案（落地细节）

### 总原则（固定）

1. **两套 Auth**：
   - Moryflow Auth：仅服务 `app.moryflow.com`
   - Aiget Dev Auth：仅服务 `console.aiget.dev`
2. **永不互通**：不共享账号/Token/数据库；OAuth 仅限业务线内。
3. **Web 与 API 同源**：避免 CORS 与跨站 Cookie 复杂度。

### 域名与路由

- Moryflow（应用 + API）：`https://app.moryflow.com/api/v1/...`
- Aiget Dev（控制台 + API）：`https://console.aiget.dev/api/v1/...`

### 第三方登录（OAuth/OIDC）

- 支持 Google/Apple；每条业务线使用独立的 clientId/回调域名。
- 账号合并以 email 为主键，仅在本业务线内生效。

### Token 规则（固定）

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

### 服务端鉴权（JWT）

- 业务服务离线验签 JWT：
  - 通过 `GET /api/v1/auth/jwks` 拉取并缓存 JWKS
  - 按 `kid` 自动更新

### Aiget Dev 对外能力（API key）

Aiget Dev 下的 Memox/Agentsbox 对外 API 使用 API key 鉴权：

- Header：`Authorization: Bearer <apiKey>`
- 多租户隔离（最小可用）：`tenantId` 从 apiKey 推导；按 `namespace + externalUserId` 划分数据域

详见：`docs/architecture/auth/quota-and-api-keys.md`。
