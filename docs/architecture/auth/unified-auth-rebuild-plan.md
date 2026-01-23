---
title: Anyhunt/Moryflow Auth 交互统一与数据库重置改造方案
date: 2026-01-25
scope: apps/anyhunt/server, apps/moryflow/server, packages/*
status: done
---

<!--
[INPUT]: Anyhunt/Moryflow 现有 Auth 实现与 Prisma schema
[OUTPUT]: 统一交互模型 + DB 重置改造方案
[POS]: Auth 体系统一与数据库重建方案
-->

# 统一目标（最佳实践 + 低复杂度）

- **交互统一**：两条业务线统一为 `access JWT + refresh rotation + JWKS`
- **多端一致**：Web/桌面/移动/CLI 使用同一套规则
- **不做兼容**：全量重置数据，删除历史迁移，仅保留初始化流程
- **复杂度控制**：只统一交互与必要模型；业务逻辑保持分离

## 统一范围（本次纳入）

1. 认证交互模型与路由语义：`/api/auth/*`（refresh/logout/sign-out/jwks）
2. Web / Device 的刷新与退出规则
3. Guard 统一（业务接口只认 `Authorization: Bearer <accessToken>`）
4. 认证相关数据模型（User/Account/Session/RefreshToken/Jwks/Subscription）
5. 共享工具（Origin/Platform/handler 适配）
6. 删除所有旧迁移，重建初始迁移
7. 业务侧认证入口（PreRegister/Admin 登录）的交互方式统一

## 统一原则（避免上下文丢失）

- **Access Token 永远仅内存**：不落 localStorage/sessionStorage
- **Refresh Token 永远 HttpOnly Cookie / 请求体**：前端不可读
- **JWT 无状态**：access 不入库，JWKS 用于离线验签
- **Refresh 必须轮换**：每次刷新都签发新 refresh，旧的立即失效
- **Web/Device 必须显式区分**：Origin 校验 vs `X-App-Platform`

## 本次改造行为准则（必须遵守）

- **不考虑历史兼容**：数据库重置后直接按新模型初始化
- **避免过度设计**：只实现当前必需流程，保持简单
- **模块化 + 单一职责**：每个模块/类只负责一个明确的职责
- **无用代码直接删除**：包含过时流程、旧路由、旧 token 逻辑
- **全链路落地**：涉及前端/后端/DB 的改动必须同步完成，不留半成品

## 不纳入（保持简单）

- 计费/配额/订阅业务规则本身
- 业务 API 的权限体系（除了鉴权方式）

# 现状差异（摘要）

## Anyhunt

- 已实现 `access JWT + refresh rotation + JWKS`
- Web refresh：HttpOnly Cookie + Origin 校验
- Device refresh：body refresh + `X-App-Platform`
- Better Auth session 采用 `cookieCache`（JWE），不落库

## Moryflow

- 已切换 `access JWT + refresh rotation + JWKS`
- Web/Device 统一使用 Origin / `X-App-Platform` 分流
- `user.tier` 已移除，订阅统一来源于 `Subscription.tier`（接口输出 `subscriptionTier`）

# 目标架构（统一交互）

## 核心规则

- **业务接口**：仅接受 `Authorization: Bearer <accessToken>`
- **Web refresh**：refresh 放 HttpOnly Cookie，强制 Origin 校验
- **Device refresh**：refresh 放请求体，强制 `X-App-Platform`
- **登出**：`/logout` 与 `/sign-out` 行为一致，撤销 refresh + session
- **JWKS**：`GET /api/auth/jwks` 提供验签公钥，服务端缓存按 `kid` 更新

## Token 策略（体验优先 + 安全）

- `accessToken`：6h（内存）
- `refreshToken`：90d（HttpOnly Cookie 或请求体）
- **触发 refresh 的时机**：
  - 页面/应用启动时 1 次
  - 收到 `401 token_expired` 时 1 次（原请求仅重试一次）

## Better Auth 配置基线（最佳实践）

- `BETTER_AUTH_SECRET` 必须 ≥ 32 字符
- 生产环境必须设置 `BETTER_AUTH_URL` 与 `TRUSTED_ORIGINS`
- 开启 `rateLimit`，优先使用 Redis `secondaryStorage`
- `useSecureCookies` 生产启用；跨子域时开启 `crossSubDomainCookies`
- `session.cookieCache` 使用 `jwe`；`storeSessionInDatabase=false`

## 统一路由语义

- `POST /api/auth/refresh` → 轮换 refresh + 下发 access
- `POST /api/auth/logout` → 撤销 refresh + session + 清理 cookie
- `POST /api/auth/sign-out` → 与 logout 等价（Better Auth 默认出口）
- `GET /api/auth/jwks` → JWKS

## 业务流程对齐（保持简化）

- PreRegister：如无强业务约束，迁移为标准 `sign-up/email` + `email-otp` 流程
- Admin 登录：移除独立入口，统一走标准登录 + `AdminGuard`

## 端侧交互细节（防遗忘）

### Web（浏览器）

1. 登录/注册成功后，调用 `POST /api/auth/refresh`
2. 服务端读取 **HttpOnly refresh Cookie**，签发 access
3. 前端把 access 放内存
4. 访问业务接口：`Authorization: Bearer <accessToken>`
5. 任意 `401 token_expired`：只刷新一次并重试原请求；刷新失败则清空本地态并回到登录

### Desktop/Mobile/CLI

1. 登录/注册成功后，调用 `POST /api/auth/refresh`（body 传 refresh）
2. 必须携带 `X-App-Platform`（ios/android/desktop/electron/cli）
3. 返回 `access + refresh`，refresh 存 Secure Storage
4. 启动时调用 `POST /api/auth/refresh` 获取 access（refresh 从安全存储读取）
5. `401 token_expired` 仅重试一次，失败则清空 refresh 并提示重新登录

## /api/auth/refresh 流程（服务端）

1. 判定 Web/Device：
   - Web：要求 `Origin` 在 allowlist
   - Device：要求 `X-App-Platform` + body refresh
2. refresh hash 查库，检查 revoked/expired
3. 签发新 refresh（轮换），旧 refresh 立刻失效
4. 签发 access JWT（带 `exp`）
5. 返回 access（Web 写 Cookie；Device 返回 refresh）

# 实施清单（避免遗漏）

## 后端（Moryflow/Anyhunt）

- 删除旧 PreRegister/Admin 登录入口；统一使用 `/api/auth/*`
- AuthGuard 只认 `Authorization: Bearer <accessToken>`
- 统一 `RefreshToken/JWKS` 模型与轮换策略
- 订阅/权限以 `SubscriptionTier` 为唯一来源（移除 `user.tier`）
- 删除历史迁移，生成新的 init 迁移（DB 已重置）
- 更新 Prisma client 与 seed（只保留新枚举）
- 更新目录 `CLAUDE.md`（遵循变更协议）

## 前端（Admin/Web）

- 登录/注册后调用 `/api/auth/refresh` 获取 access
- access 仅内存，refresh 由 Cookie 持久化
- `401` 触发一次 refresh + retry
- 无管理员权限时明确提示（AdminGuard 403）

## 前端（Desktop/Mobile/CLI）

- refresh 存安全存储（Electron safeStorage / SecureStore）
- access 仅内存；与主进程同步 access 供其他模块使用
- `X-App-Platform` 必须传递，body 携带 refresh
- 删除所有旧 token localStorage 存储与 pre-register 流程

## 执行要求（防止上下文丢失）

1. **先写文档再改代码**：方案文档更新到位后再开始实施
2. **全量替换调用点**：所有调用 `/auth`、旧 token、旧 refresh 的地方必须统一到 `/api/auth/*`
3. **删除无用模块**：pre-register/旧 bearer/旧 session 逻辑应彻底移除
4. **数据库重置清理**：删除历史 migrations，生成 init 并重新生成 Prisma client
5. **统一错误边界**：刷新失败统一清理本地态并返回登录
6. **必过门禁**：`pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 全部通过

# 当前进度（2026-01-25）

## 已完成

- Anyhunt：删除 `prisma/*/migrations` 历史迁移，按重置策略保留初始化流程
- Moryflow：Auth 统一为 access JWT + refresh rotation + JWKS
- Moryflow：`/api/auth/*` 路由统一，刷新/登出与 Better Auth handler 入口对齐
- Moryflow：PreRegister 与忘记密码入口移除（Web/PC/Mobile 同步）
- 端侧接入：Web/PC/Mobile 改为 access 内存 + refresh 安全存储/HttpOnly Cookie
- 订阅字段：`user.tier` 已移除，统一输出 `subscriptionTier`
- Anyhunt/Moryflow：init 迁移已生成并应用（DB 已重置）
- Moryflow Vectorize Worker：接入 JWKS 验签 access JWT（业务服务按 JWKS 校验）
- 测试门禁：`pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 已运行并通过
- 环境变量核对：两端 `.env` 已包含 Auth 必需项（`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`TRUSTED_ORIGINS`、`ALLOWED_ORIGINS`、`ADMIN_EMAILS`、`SERVER_URL`）；`BETTER_AUTH_URL`/`SERVER_URL` 已对齐 `https://server.anyhunt.app` 与 `https://app.moryflow.com`，`ALLOWED_ORIGINS`/`TRUSTED_ORIGINS` 已覆盖 `moryflow.com` 系列域名（无需新增 Auth env）
- 数据库重置：已按 init 迁移重置 Anyhunt main/vector 与 Moryflow 主库（基于各自 prisma config）
- 测试补齐：JWKS 端点验签用例已落地（Anyhunt 集成 / Moryflow E2E）

# 验证与门禁（必须）

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit`

> 失败必须修复后再继续；不允许跳过。

## /api/auth/logout / sign-out

- Web：要求 `Origin` 校验，通过后撤销 refresh + session
- Device：要求 `X-App-Platform` + body refresh，仅撤销 refresh
- 返回消息建议英文：`"Logout successful"`

## JWKS 使用（业务服务）

- 业务服务在启动时拉取 `GET /api/auth/jwks`
- 缓存公钥，按 `kid` 选择
- 验签失败时刷新 JWKS 再验一次

# 关键决策（必须记录）

1. **统一认证模型**：`access JWT + refresh rotation + JWKS`
2. **Web/Device 分流规则**：Origin 校验 vs `X-App-Platform`
3. **Access Token 不入库**：避免每次请求打 DB
4. **refresh 轮换不可取消**：防重放
5. **删除旧迁移**：新建 init 作为唯一基线

# 分阶段落地清单（含回滚思路）

## Phase 1：Schema 统一（无兼容）

- 删除所有旧迁移目录
- 统一 schema（User/Account/Session/RefreshToken/Jwks/Subscription）
- 生成 init 迁移
- **回滚**：删除新迁移 + 恢复旧 schema（仅在未上线前允许）

## Phase 2：Auth 交互统一

- Moryflow 引入 refresh/JWKS
- 移除 bearer 插件与 `set-auth-token`
- AuthGuard 统一为 JWT 校验
- **回滚**：恢复 bearer 插件 + session 逻辑（仅在未重置 DB 时允许）

## Phase 3：端侧接入

- Web 端统一 `refresh` 启动流程
- Device 端统一 `X-App-Platform` + body refresh
- **回滚**：保留旧接口（但本次不考虑兼容，回滚仅用于开发期）

## Phase 4：清理无用代码

- 删除旧 Auth 路由/工具/DTO
- 删除旧文档与不一致描述
- **回滚**：不支持（无兼容）

# 端侧 SDK/客户端实现建议

## Web（浏览器）

- 页面初始化调用一次 `POST /api/auth/refresh`
- access 放内存；`401 token_expired` 时刷新并重试一次
- 不存储 access 到 localStorage/sessionStorage

## Desktop/Mobile/CLI

- refresh 存 Secure Storage/Keychain
- 启动时调用 `POST /api/auth/refresh` 获取 access
- 请求头统一 `Authorization: Bearer <accessToken>`

## 端侧实现要点（防上下文丢失）

- 登录/注册成功后必须调用一次 `POST /api/auth/refresh`，拿到 access 后仅存内存
- 移动端遇到 `EMAIL_NOT_VERIFIED` 必须引导到验证码页，并在进入时自动触发一次 resend（仅 signin 模式）
- 所有客户端 `401 token_expired` 只允许刷新重试一次
- refresh 失效时必须清理本地 refresh + 用户缓存，避免“看起来已登录但请求全 401”
- 未实现流程直接删除：pre-register、忘记密码入口

# 数据库 Review（仅就用户系统/授权）

## 改造前问题（跨业务线）

1. **Moryflow Account 缺少唯一约束**：`providerId + accountId` 未唯一，存在重复绑定风险
2. **Moryflow 无 RefreshToken/Jwks**：无法实现 refresh/JWKS 统一
3. **Moryflow `user.tier` 与订阅重复**：双数据源，易漂移（已移除）
4. **Anyhunt Session 表存在但不使用**：可保留但需明确用途（Better Auth schema 需求）

## 统一后的模型约束（明确约束）

- `Account`：`@@unique([providerId, accountId])`
- `Subscription.userId`：唯一（单活订阅）
- `RefreshToken.tokenHash`：唯一
- `User.email`：唯一
- `Session.token`：唯一（即使不常用）

## 统一后的模型建议（最佳实践）

### Anyhunt

- 保留现有模型（User/Account/Session/RefreshToken/Jwks）
- 仅在 Auth 服务内部使用 Session（cookieCache），业务接口只用 access JWT

### Moryflow（重置后对齐）

- 新增：`RefreshToken`、`Jwks`
- `Account` 增加唯一约束：`@@unique([providerId, accountId])`
- 订阅结构对齐 Anyhunt：
  - 增加 `SubscriptionTier`（free/starter/basic/pro/license）
  - `Subscription.userId` 设为唯一（单活订阅）
  - `user.tier` 删除

### 共享字段建议

- `User.isAdmin` 继续保留
- `Session` 结构保持一致（仅 Auth 内部用）
- `Verification` 保留

# 删除迁移与初始化策略（必须）

1. **删除所有历史迁移文件**
   - `apps/anyhunt/server/prisma/main/migrations/*`
   - `apps/anyhunt/server/prisma/vector/migrations/*`
   - `apps/moryflow/server/prisma/migrations/*`
2. **删除数据库中的迁移历史表**（例如 `_prisma_migrations`）
3. **完成 schema 统一后生成新的 init 迁移**
   - 推荐：`prisma migrate dev --name init`
   - 只保留这一份 init 迁移（作为新基线）

# 错误语义（用户可见，英文）

- `401`：`"Invalid or expired access token"` / `"Invalid or expired refresh token"`
- `403`：`"Invalid origin"` / `"Missing or invalid X-App-Platform"`
- `429`：`"Too many requests"`

# 测试与回归（最小集合）

- AuthGuard：Bearer access token 有效/过期/缺失
- Refresh：Web Origin 拒绝/通过；Device 平台校验
- Logout/Sign-out：Web/Device 分支 + refresh 失效
- JWKS：验签成功/失败触发刷新

# 共享工具（可复用）

- 优先在业务内复用（`apps/anyhunt/server`, `apps/moryflow/server`）。
- 只有在**两端都出现重复实现**时，才抽到 `packages/auth-utils/`，避免过度设计。

建议候选：

- `origin.matchOrigin`（通配符子域）
- `platform.getDevicePlatform`（`X-App-Platform` 解析与 allowlist）
- `auth.handlerAdapter`（Better Auth handler Request/Response 透传）
- `refresh.tokenUtils`（hash/rotate）

# 实施步骤（建议顺序）

1. **统一 Auth 交互层**
   - Moryflow 引入 access/refresh/JWKS 与 refresh rotation
   - 移除 bearer 插件与 `set-auth-token` 交互
   - AuthGuard 改为 JWT 验证
2. **统一 Web/Device 规则**
   - Web：Cookie refresh + Origin 校验
   - Device：body refresh + `X-App-Platform`
3. **模型对齐**
   - Moryflow 新增 RefreshToken/Jwks
   - `Account` 唯一约束补齐
   - 订阅/tier 统一到 Subscription
4. **删除旧迁移并生成 init**
5. **文档与测试同步**
   - 更新 Auth 相关文档
   - 补齐 refresh/logout/sign-out 测试

# 验收标准

- 两条业务线认证接口语义一致
- 业务接口只接受 access JWT
- Web/Device 刷新规则一致
- DB schema 对齐且只有 init 迁移
- `pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全部通过
