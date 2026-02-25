---
title: Anyhunt Server Auth & Session Code Review
date: 2026-01-25
scope: apps/anyhunt/server (auth/user/common guards/admin-auth)
status: done
---

<!--
[INPUT]: apps/anyhunt/server/src/auth, user, common/guards, main.ts, prisma/main/schema.prisma
[OUTPUT]: 风险清单 + 修复建议 + 进度记录
[POS]: Phase 2 / P0 模块审查记录（Anyhunt Server：Auth & Session）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Server Auth & Session Code Review

## 范围

- Auth：`apps/anyhunt/server/src/auth/`
- User：`apps/anyhunt/server/src/user/`
- Guards：`apps/anyhunt/server/src/common/guards/`
- 入口配置：`apps/anyhunt/server/src/main.ts`
- 数据模型：`apps/anyhunt/server/prisma/main/schema.prisma`（User/Session/Account/Verification）

主要入口：

- `/api/v1/auth/*`（Better Auth handler，`version: '1'`）
- `/api/v1/app/user/*`

## 结论摘要

- 高风险问题（P0）：2 个（已修复）
- 中风险问题（P1）：9 个（已修复）
- 低风险/规范问题（P2）：5 个（已修复）

## 发现（按严重程度排序）

- [P0] Web CSRF 防护被全局关闭 → 已恢复 CSRF/Origin 校验，并对 refresh/logout/sign-out 强制 Origin 校验（`auth.tokens.controller.ts` + `better-auth.ts`）。
- [P0] Token 模型与文档约束冲突 → 已实现 access/refresh/JWKS（`auth.tokens.service.ts` + `better-auth.ts`），AuthGuard 改为 JWT 校验。

- [P1] Auth handler 不保留原始 body → 改为优先透传 `rawBody`（`auth.controller.ts`）。
- [P1] Cookie 安全属性缺失 → 生产环境启用 `useSecureCookies` + 跨子域 Cookie（`better-auth.ts`）。
- [P1] 用户初始化缺少事务 → 使用 `$transaction` + 失败回滚用户（`better-auth.ts`）。
- [P1] 生产环境配置回落 → 强制 `BETTER_AUTH_URL`/`TRUSTED_ORIGINS`（`auth.config.ts` + `main.ts`）。
- [P1] 认证入口缺少限流 → 启用 Better Auth `rateLimit`（`better-auth.ts`）。
- [P1] AccessToken 未显式校验 exp → 强制要求 `exp` 且过期直接拒绝（`auth.tokens.service.ts`）。
- [P1] Refresh token 轮换存在并发重放窗口 → 改为条件更新 + 失败即作废新 token（`auth.tokens.service.ts`）。
- [P1] 管理员登录绕开 Better Auth → 删除独立 admin 登录接口，统一走 AuthGuard + RequireAdmin。
- [P1] CORS 无 Origin 放行 → 增加无 Origin + Cookie 的显式阻断与 `X-App-Platform` 例外（`main.ts`）。
- [P1] AuthController 先注册导致 refresh/logout 可能被 catch-all 覆盖 → 调整 Controller 顺序并显式接管 sign-out（`auth.module.ts` + `auth.tokens.controller.ts`）。
- [P1] Better Auth sign-out 未回收 refresh token → sign-out 同步 revoke refresh + session（`auth.tokens.controller.ts`）。

- [P2] Session token 明文存储 → Session 改为 CookieCache（JWE）并关闭 DB 存储（`better-auth.ts`）。
- [P2] Plugin 引用方式非最佳实践 → 改为 `better-auth/plugins/*` 直导。
- [P2] Auth 路由文档未同步 → 全量文档收敛到 `/api/v1/auth/*`。
- [P2] 模块文档漂移 → 重写 `auth/CLAUDE.md`、`admin/CLAUDE.md` 等相关文档。
- [P2] rateLimit 未使用 secondary storage → 绑定 Redis secondaryStorage（`better-auth.ts`）。

## 测试审计

- 已有：
  - `apps/anyhunt/server/src/auth/__tests__/auth.service.spec.ts`
  - `apps/anyhunt/server/src/auth/__tests__/auth.guard.spec.ts`
  - `apps/anyhunt/server/src/auth/__tests__/auth.tokens.service.spec.ts`
  - `apps/anyhunt/server/src/auth/__tests__/auth.tokens.controller.spec.ts`
  - `apps/anyhunt/server/src/user/__tests__/user.service.spec.ts`
- 缺失：
  - AdminGuard 行为测试（管理员校验）
  - AuthController handler 路由/Origin 处理
  - refresh/登录/注册/OTP 的集成测试（含 CSRF/Origin）
  - Admin 登录与 session 生命周期测试

## 修复计划与进度

- 建议修复（按优先级）：
  1. 统一 Token 模型：按文档实现 access/refresh/JWKS，或彻底收敛为 Better Auth session 并同步文档与守卫策略。
  2. 恢复 Web CSRF/Origin 校验；移动端用 `X-App-Platform` 或明确的 allowlist 走 device auth。
  3. 修正 Auth handler body：按 Content-Type 透传 raw body（form/json），避免 OAuth 回调与验签异常。
  4. 配置 Cookie 安全策略：生产环境启用 `useSecureCookies`，跨子域场景启用 `crossSubDomainCookies`（`.anyhunt.app`）。
  5. 用户初始化改为事务，失败回滚并返回明确错误；避免“半初始化”用户。
  6. 生产环境强制要求 `TRUSTED_ORIGINS` 与 `BETTER_AUTH_URL`，并作为 CORS/CSRF 的统一来源。
  7. 对登录/注册/OTP/Admin 登录启用 Better Auth `rateLimit` + 业务限流策略。
  8. 管理员登录收敛至 Better Auth（移除独立 admin 登录接口），统一哈希算法与 session 策略。
  9. Session token 改为 hash 存储或二次校验；补齐 AuthGuard/AdminGuard 与 AuthController 测试。
  10. 更新 `apps/anyhunt/server/src/auth/CLAUDE.md` 对齐实际 guard 与流程。
- 状态：done（已完成修复）
