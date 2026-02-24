---
title: Auth 统一改造涉及文件与模块清单
date: 2026-01-25
scope: apps/anyhunt/*, apps/moryflow/*, packages/*
status: done
---

<!--
[INPUT]: unified-auth-rebuild-plan.md + 最近两次提交
[OUTPUT]: 涉及模块与文件索引（含潜在漏改提示）
[POS]: Auth 统一改造的文件清单与覆盖范围说明
-->

# 目的

对齐本分支“Auth 交互统一 + 数据库重置”的实际落点，标记已涉及的模块与文件范围，并补充可能被遗漏但仍相关的模块。

> 最后核对：2026-01-25（本文件列出的问题已全部修复/确认）

# 已涉及模块（按产品）

## Anyhunt Server（server.anyhunt.app）

- Auth 核心：`apps/anyhunt/server/src/auth/*`
- 守卫与上下文：`apps/anyhunt/server/src/auth/auth.guard.ts`、`apps/anyhunt/server/src/types/*`
- Token 入口：`apps/anyhunt/server/src/auth/auth.tokens.controller.ts`
- Better Auth 适配：`apps/anyhunt/server/src/auth/auth.controller.ts`、`apps/anyhunt/server/src/auth/auth.handler.utils.ts`
- CORS/Origin：`apps/anyhunt/server/src/common/utils/origin.utils.ts`
- Prisma 重置：`apps/anyhunt/server/prisma/main/**`、`apps/anyhunt/server/prisma/vector/**`
- 环境变量示例：`apps/anyhunt/server/.env.example`
- 测试：`apps/anyhunt/server/src/auth/__tests__/*`、`apps/anyhunt/server/test/*`

## Anyhunt Admin（admin.anyhunt.app）

- 认证状态：`apps/anyhunt/admin/www/src/stores/auth.ts`
- 登录/路由保护：`apps/anyhunt/admin/www/src/pages/LoginPage.tsx`、`apps/anyhunt/admin/www/src/App.tsx`
- API 封装：`apps/anyhunt/admin/www/src/lib/api-base.ts`、`apps/anyhunt/admin/www/src/lib/api-client.ts`
- 权限依赖的业务页：`apps/anyhunt/admin/www/src/pages/*`
- E2E：`apps/anyhunt/admin/www/tests/*`

## Anyhunt Console（console.anyhunt.app）

- 认证状态：`apps/anyhunt/console/src/stores/auth.ts`
- 登录跳转：`apps/anyhunt/console/src/pages/LoginRedirect.tsx`
- API 封装：`apps/anyhunt/console/src/lib/api-base.ts`、`apps/anyhunt/console/src/lib/api-client.ts`
- 业务入口：`apps/anyhunt/console/src/App.tsx`
- E2E：`apps/anyhunt/console/tests/*`

## Anyhunt www（anyhunt.app）

- Better Auth Client：`apps/anyhunt/www/src/lib/auth-client.ts`
- Auth 上下文：`apps/anyhunt/www/src/lib/auth-context.tsx`
- 登录/注册/忘记密码：`apps/anyhunt/www/src/components/auth/*`
- Access Token 会话管理：`apps/anyhunt/www/src/lib/auth-session.ts`
- API Base：`apps/anyhunt/www/src/lib/api-base.ts`
- API 封装（Bearer + refresh）：`apps/anyhunt/www/src/lib/api-client.ts`
- Digest/Inbox/Reader UI：`apps/anyhunt/www/src/components/reader/*`
- Digest/Inbox 业务：`apps/anyhunt/www/src/features/digest/*`、`apps/anyhunt/www/src/features/inbox/*`
- 入口路由：`apps/anyhunt/www/src/routes/inbox/*`、`apps/anyhunt/www/src/routes/explore.tsx`、`apps/anyhunt/www/src/routes/welcome.tsx`
- 单测：`apps/anyhunt/www/src/lib/__tests__/auth-session.spec.ts`

## Moryflow Server（server.moryflow.com）

- Auth 核心：`apps/moryflow/server/src/auth/*`
- Token 入口：`apps/moryflow/server/src/auth/auth.tokens.controller.ts`
- 守卫与上下文：`apps/moryflow/server/src/auth/auth.guard.ts`、`apps/moryflow/server/src/types/*`
- Prisma 重置：`apps/moryflow/server/prisma/**`
- 环境变量示例：`apps/moryflow/server/.env.example`
- 业务侧接入：`apps/moryflow/server/src/*/*.controller.ts`（ai-proxy、site、sync、user 等）
- 测试：`apps/moryflow/server/src/auth/__tests__/*`、`apps/moryflow/server/test/*`

## Moryflow Admin（admin.moryflow.com）

- 认证状态：`apps/moryflow/admin/src/stores/auth.ts`
- 登录/路由保护：`apps/moryflow/admin/src/pages/*`
- 依赖 access token 的业务模块：`apps/moryflow/admin/src/features/*`

## Moryflow Mobile

- Auth Client：`apps/moryflow/mobile/lib/server/auth-client.ts`
- Platform Header：`apps/moryflow/mobile/lib/server/auth-platform.ts`
- Auth Session：`apps/moryflow/mobile/lib/server/auth-session.ts`
- Auth API：`apps/moryflow/mobile/lib/server/auth-api.ts`
- Auth Context：`apps/moryflow/mobile/lib/server/context.tsx`
- Auth UI：`apps/moryflow/mobile/components/auth/*`
- 单测：`apps/moryflow/mobile/lib/server/__tests__/auth-session.spec.ts`

## Moryflow PC（Electron）

- Auth Session：`apps/moryflow/pc/src/renderer/lib/server/auth-session.ts`
- Better Auth Client：`apps/moryflow/pc/src/renderer/lib/server/client.ts`
- Auth Context：`apps/moryflow/pc/src/renderer/lib/server/context.tsx`
- Auth UI：`apps/moryflow/pc/src/renderer/components/auth/*`

## Moryflow Vectorize Worker

- JWKS 验签：`apps/moryflow/vectorize/src/middleware/auth.ts`
- 环境变量：`apps/moryflow/vectorize/wrangler.jsonc`

## 共享包与类型

- Membership 类型：`packages/api/src/membership/types.ts`
- 通用 API Client：`packages/api/src/client/*`

## 文档与流程

- 方案与进度：`docs/architecture/auth/unified-auth-rebuild-plan.md`
- 测试指南：`docs/guides/testing.md`

# Review 问题与解决方案（最佳实践 + 不做兼容）

## 设备端 Origin 校验（Electron/RN）

- **问题**：设备请求携带 `X-App-Platform` 时仍会走 Origin 校验；Electron 打包后使用 `file://`，常见 `Origin: null`，导致 refresh 被拒绝。
- **结论**：Electron/RN 端可能携带 `Origin: null/file://`，当前逻辑会拒绝。
- **解决方案**：只要存在 `X-App-Platform`，**跳过 Origin 校验**（保持 device-only 路径）；不做历史兼容逻辑，直接按 device 规则执行。
- **涉及文件**：`apps/anyhunt/server/src/auth/auth.tokens.controller.ts`、`apps/moryflow/server/src/auth/auth.tokens.controller.ts`
- **状态**：已落地（X-App-Platform 跳过 Origin 校验 + 单测更新）

## Mobile 首次 refresh 依赖 Cookie

- **问题**：Mobile 登录后依赖 session cookie 才能换取 refresh；React Native/Expo 的 cookie 持久化不稳定，导致“登录成功但 refresh 失败”。
- **结论**：当前 Mobile 端没有 cookie 管理器或 Better Auth Expo client，**不应依赖 cookie**。
- **解决方案**：使用 `@better-auth/expo` 的 `expoClient` + SecureStore，确保 session/cookie 在移动端可靠持久化；或改为 sign-in 直接下发 refresh（两者选其一）。不做旧流程兼容，直接替换。
- **涉及文件**：`apps/moryflow/mobile/lib/server/auth-api.ts`、`apps/moryflow/mobile/lib/server/auth-session.ts`
- **状态**：已落地（expoClient + server expo plugin + cookie/refresh 管理更新）

## Mobile refresh 网络异常未捕获

- **问题**：`refreshAccessToken` 未捕获网络异常，Promise reject 会导致移动端初始化/登录流程直接抛错。
- **解决方案**：在 refresh 流程中统一 catch 并清理 session，返回 `false`（保持调用方逻辑一致）。
- **涉及文件**：`apps/moryflow/mobile/lib/server/auth-session.ts`
- **状态**：已修复

## 无用 Admin 登录 DTO

- **问题**：`adminLoginSchema` 已无入口，保留无意义且误导。
- **解决方案**：**删除** `adminLoginSchema` 与 `AdminLoginDto`，保持模块单一职责。
- **涉及文件**：`apps/anyhunt/server/src/admin/dto.ts`
- **状态**：已删除

## 测试产物提交

- **问题**：Playwright `test-results` 产物被提交，导致无意义 diff。
- **解决方案**：删除现有产物并加入 `.gitignore`（或统一测试输出目录不入库）。
- **涉及文件**：`apps/anyhunt/admin/www/test-results/.last-run.json`、`apps/anyhunt/console/test-results/.last-run.json`
- **状态**：已加入 `.gitignore` 忽略 `test-results`

## Better Auth Expo 插件类型推断

- **问题**：`createBetterAuth` 导出时类型推断引用 `@better-auth/expo` 的内部依赖，导致 `tsc` 报 `TS2742`。
- **解决方案**：显式定义 Auth 类型（包含 `signJWT/verifyJWT` 所需 API），避免隐式推断。
- **涉及文件**：`apps/moryflow/server/src/auth/better-auth.ts`
- **状态**：已修复（显式 `Auth` 类型）

## Origin 校验分支冗余

- **问题**：`assertTrustedOrigin` 的 `devicePlatform` 分支永远不触发，增加理解成本。
- **解决方案**：移除冗余参数与分支，Origin 校验仅由 Web 路径触发。
- **涉及文件**：`apps/anyhunt/server/src/auth/auth.tokens.controller.ts`、`apps/moryflow/server/src/auth/auth.tokens.controller.ts`
- **状态**：已修复

# 已确认（无剩余）

本轮调研已完成，未发现未覆盖的入口或兼容路径。

## 调研结论

### X-App-Platform 传递范围

- **结论**：仅移动端与桌面端显式传递 `X-App-Platform`；Web/Console/Admin 均未传递。
- **涉及文件**：`apps/moryflow/mobile/lib/server/auth-client.ts`、`apps/moryflow/mobile/lib/server/auth-session.ts`、`apps/moryflow/pc/src/renderer/lib/server/auth-session.ts`
- **处理建议**：保持现状；Web 仅走 Origin 校验路径。

### CLI/脚本入口

- **结论**：仓库内未发现 CLI/脚本调用 `/api/auth/refresh` 或传递 `X-App-Platform` 的实现。
- **处理建议**：无需改动；如未来新增 CLI，必须使用 device refresh 规则并显式设置 `X-App-Platform: cli`。

### 外部服务 JWKS 验签

- **结论**：当前仅发现 Moryflow Vectorize Worker 通过 `GET /api/auth/jwks` 验签 access JWT。
- **涉及文件**：`apps/moryflow/vectorize/src/middleware/auth.ts`
- **处理建议**：保持现状，无需新增兼容层。

### 业务侧 session 直读

- **结论**：未发现业务控制器使用 `CurrentSession` 或直接依赖 Better Auth session；仅 refresh fallback 会读取 session。
- **处理建议**：`CurrentSession` 已删除，业务侧保持仅使用 access JWT 作为鉴权入口。

# 进一步调研与决策（最佳实践，不做兼容）

## Anyhunt www 作为 C 端主战场

- **决策**：**保留 www 的 Digest/Inbox/Reader 能力**，并对齐统一 Auth（access token + refresh 轮换）。
- **原因**：anyhunt.app 是 C 端主入口，核心用户流程必须在官网完成；console 仅保留开发者平台功能。
- **调整范围**：`apps/anyhunt/www/src/features/digest/*`、`apps/anyhunt/www/src/features/inbox/*`、`apps/anyhunt/www/src/components/reader/*`、`apps/anyhunt/www/src/lib/api-client.ts`
- **状态**：已落地（恢复模块并对齐 Auth 流程）

## CurrentSession 装饰器

- **决策**：**删除** `CurrentSession` 装饰器（Anyhunt/Moryflow）。
- **原因**：无实际使用，保留会引导出 session 依赖，和“业务接口只认 access JWT”的规则冲突。
- **清理范围**：`apps/anyhunt/server/src/auth/decorators.ts`、`apps/moryflow/server/src/auth/decorators.ts`
- **状态**：已执行

## JWKS 验签服务范围

- **决策**：当前仅保留 Moryflow Vectorize Worker 的 JWKS 验签；其他服务不做兼容接入。
- **原因**：避免提前设计；新增服务时按统一规则接入 JWKS。
- **状态**：保持现状
