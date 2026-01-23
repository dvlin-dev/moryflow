---
title: 用户系统（两套 Auth）- 总览与技术方案
date: 2026-01-25
scope: moryflow.com, anyhunt.app, server.anyhunt.app
status: active
---

<!--
[INPUT]: 两条业务线（Moryflow / Anyhunt Dev）；支持 Google/Apple 登录；独立用户体系与数据库；Token 策略（Web refresh cookie + access memory；原生 secure storage）
[OUTPUT]: 两套用户系统的核心流程（注册/登录/刷新/登出）与接口约定（同路径、不同域名），以及落地技术方案
[POS]: Guide：Auth 的流程与接口约定（实现/前端接入对齐），不承载系统级架构决策

[PROTOCOL]: 本文件变更若影响全局约束，需同步更新 `docs/architecture/auth.md`、`docs/index.md` 与根 `CLAUDE.md`。
-->

# 用户系统（两套 Auth）

本指南用于统一 Auth 的“接口与流程”口径。系统级不变量以 `docs/architecture/auth.md` 为准（本文件不与其冲突；如冲突，以 architecture 为准）。

## 关键概念

- **User**：业务线内唯一用户（email 唯一）；Moryflow 与 Anyhunt Dev 各自独立
- **Profile**：用户资料（昵称、头像等）；仅在所属业务线内
- **Account（OAuth Account）**：支持 Google/Apple 账号绑定；仅在所属业务线内
- **Session**：登录会话；仅在所属业务线内；由 refresh token 驱动续期
- **Access Token**：短期访问 token，用于 API 请求鉴权
- **Refresh Token**：长期续期 token，用于刷新 access token（开启 rotation）

## 服务形态（如何“复用但不复杂”）

- **Moryflow Auth**：只服务 `app.moryflow.com`（cookie `Domain=.moryflow.com`）。
- **Anyhunt Dev Auth**：只服务 `server.anyhunt.app`（cookie `Domain=.anyhunt.app`，平台内模块共享；console/admin 为独立 Web 前端）。
- 两条 Auth **共享代码**（抽到 `packages/*`），但 **不共享数据库/密钥**。
- User/Profile/Session 等核心数据各自独立，禁止跨业务线关联。

## 统一接口规范（/api/auth）

> 这些路由在各自业务线的应用域名下保持一致：
>
> - Moryflow：`https://app.moryflow.com/api/auth/*`
> - Anyhunt Dev：`https://server.anyhunt.app/api/auth/*`（console/admin 跨域调用）

- `POST /api/auth/sign-up/email`
  - 输入：name、email、password
  - 输出：创建用户并设置 session cookie（后续需调用 refresh 获取 access/refresh）
- `POST /api/auth/email-otp/verify-email`
  - 输入：email、otp
  - 输出：完成邮箱验证（后续需调用 refresh 获取 access/refresh）
- `POST /api/auth/sign-in/email`
  - 输入：email、password
  - 输出：设置 session cookie（后续需调用 refresh 获取 access/refresh）
- `POST /api/auth/sign-in/social`
  - 输入：provider + callbackURL（可选）
  - 输出：返回授权跳转 URL（Web）或返回用户信息（Native）
- `POST /api/auth/refresh`
  - 行为：校验 refresh token → 轮换（rotation）→ 发新 access token（+ 新 refresh）
  - 原生端必须携带 `X-App-Platform` 并在 body 传 refresh token
- `POST /api/auth/logout`
  - 行为：失效当前 refresh；清理 session/refresh cookie
  - 原生端必须携带 `X-App-Platform` 并在 body 传 refresh token
- `POST /api/auth/sign-out`
  - 行为：同 `/api/auth/logout`，同时失效 refresh + session（Better Auth 默认出口）
  - 原生端必须携带 `X-App-Platform` 并在 body 传 refresh token
- `GET /api/v1/user/me`
  - 行为：返回当前用户（需 Bearer access token）
- `GET /api/auth/jwks`
  - 行为：提供 JWKS，用于服务端离线验签

## 核心流程

### 1) 邮箱注册（必须验证码）

1. `POST /api/auth/sign-up/email`（创建用户，进入验证码验证阶段）
2. 用户输入 OTP → `POST /api/auth/email-otp/verify-email`
3. 调 `POST /api/auth/refresh` 获取 access/refresh（refresh rotation 开启）
   - Web：写入 refresh `HttpOnly Cookie`（Moryflow：`Domain=.moryflow.com`；Anyhunt Dev：`Domain=.anyhunt.app`）；返回 access token
   - 原生：返回 refresh token + access token（由客户端写入 Secure Storage/内存）

### 2) 邮箱登录

1. `POST /api/auth/sign-in/email`
2. 校验密码 → 创建 session
3. 调 `POST /api/auth/refresh` 下发 token（同上）

### 3) 第三方登录（Google / Apple）

1. OAuth callback 获取 profile/email
2. 若 `identity.user.email` 已存在：绑定第三方 account 到该 user
3. 若不存在：创建 user 并绑定 account

### 4) Anyhunt Dev 平台内免重复登录

- Anyhunt Dev 的登录态通过 `Domain=.anyhunt.app` Cookie 在 `anyhunt.app` / `server.anyhunt.app` / `console.anyhunt.app` / `admin.anyhunt.app` 共享；不做旧子域名兼容。
- Moryflow 与 Anyhunt Dev **永不互通**，因此不设计跨域免登录。

### 5) 原生端免登录

- App 启动从 Secure Storage 取 refresh token，走 `POST /api/auth/refresh` 换取新 access（并轮换 refresh）。

## 安全约束（必须）

- Web：access token 不落 localStorage；refresh token 必须 `HttpOnly` cookie。
- Refresh rotation 开启：refresh 一旦使用就轮换，旧 token 立即失效。
- Token 泄露处置：支持按 session 粒度 revoke（登出/强制下线）。
- 账号唯一性：业务线内以 `email` 作为唯一用户键（仅邮箱/密码/OTP）。

## 技术方案（落地细节）

### 总原则（固定）

1. **两套 Auth**：
   - Moryflow Auth：仅服务 `app.moryflow.com`
   - Anyhunt Dev Auth：仅服务 `server.anyhunt.app`
2. **永不互通**：不共享账号/Token/数据库；OAuth 仅限业务线内。
3. **Anyhunt Dev API 固定入口**：`https://server.anyhunt.app/api/v1`；console/admin 为独立 Web，需要 CORS 与 CSRF 白名单。

### 域名与路由

- Moryflow（应用 + API）：`https://app.moryflow.com/api/v1/...`
- Anyhunt Dev（API）：`https://server.anyhunt.app/api/v1/...`
- Anyhunt Dev（Web）：`https://console.anyhunt.app`、`https://admin.anyhunt.app`

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
  - Anyhunt Dev：`Domain=.anyhunt.app`
- accessToken：仅内存；页面刷新后调用 refresh 恢复

### 刷新流程（必须）

1. 正常请求只带 `Authorization: Bearer <accessToken>`
2. `401 token_expired` 时调用 `POST /api/auth/refresh`
3. 成功后更新 accessToken（内存），原请求仅重试一次

### refresh 的 CSRF 约束（必须）

- 只允许 `POST`
- 仅校验 `Origin`（无 Origin 且携带 Cookie 会被拒绝）
- 校验 `Origin`：
  - Moryflow：必须是 `https://app.moryflow.com`
  - Anyhunt Dev：必须是 `https://console.anyhunt.app` / `https://admin.anyhunt.app`
- `POST /api/auth/logout` 与 `POST /api/auth/sign-out` 同样要求 Origin 校验

### refresh 的原生端约束（必须）

- refreshToken 必须放在请求体
- 必须携带 `X-App-Platform`（ios/android/desktop/electron/cli）

### 服务端鉴权（JWT）

- 业务服务离线验签 JWT：
  - 通过 `GET /api/auth/jwks` 拉取并缓存 JWKS
  - 按 `kid` 自动更新

### Anyhunt Dev 对外能力（API key）

Anyhunt Dev 下的 Memox/Agentsbox 对外 API 使用 API key 鉴权：

- Header：`Authorization: Bearer <apiKey>`
- 多租户隔离（最小可用）：`tenantId` 从 apiKey 推导；按 `namespace + externalUserId` 划分数据域

详见：`docs/architecture/auth/quota-and-api-keys.md`。
