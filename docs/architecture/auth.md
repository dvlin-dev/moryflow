---
title: Auth 系统 - 文档入口
date: 2026-02-24
scope: moryflow.com, anyhunt.app, server.anyhunt.app
status: active
---

<!--
[INPUT]: 两条业务线（Moryflow / Anyhunt Dev）；支持 Google/Apple 登录；不共享账号/Token/数据库；三机部署
[OUTPUT]: Auth 相关文档入口与“已定稿”的关键约束
[POS]: Auth 的总入口文档，所有实现与讨论应以此为准

[PROTOCOL]: 本文件变更时，需同步更新 docs/architecture/CLAUDE.md 与根 CLAUDE.md 的文档索引。
-->

# Auth 系统

本仓库不再使用 “UIP（统一身份平台，跨产品统一账号/计费）” 作为默认目标；当前架构明确为 **两条互不互通的业务线**：

1. **Moryflow（主产品）**：`www.moryflow.com`（营销）+ `server.moryflow.com`（应用 + API）
2. **Anyhunt Dev（开发者平台）**：`anyhunt.app`（官网；模块：Fetchx、Memox）+ `server.anyhunt.app`（API）+ `console.anyhunt.app` / `admin.anyhunt.app`（Web 前端）

两条业务线：

- **不共享账号/Token/数据库**（永不互通；OAuth 仅限业务线内）
- **只共享代码**（抽到 `packages/*` 复用后端基础设施）

## 已定稿的关键约束（不要再发散）

- 域名：
  - Moryflow：`www.moryflow.com`（营销）+ `server.moryflow.com`（应用 + API）+ `moryflow.app`（发布站）
  - Anyhunt Dev：`anyhunt.app`（官网）+ `server.anyhunt.app`（API；不做旧子域名兼容）
- API：
  - Moryflow：`https://server.moryflow.com/api/v1/...`
  - Anyhunt Dev：`https://server.anyhunt.app/api/v1/...`（console/admin 为独立 Web，需要 CORS/CSRF 白名单）
- Token（两套 Auth，各自独立）：
  - `accessTokenTtl=6h`，`refreshTokenTtl=90d`，`refreshRotation=on`
  - 统一 Token-first（V2）：登录/验证码验证成功直接返回 `accessToken + refreshToken`
  - refresh 网络失败时保留未过期 access token（不强制登出）；仅在 refresh `401/403` 时清会话
  - Web：`access+refresh` 持久化到 localStorage（已接受 XSS 风险并以 CSP/净化/审计补偿）
  - Native（PC/Mobile）：refresh token 存安全存储（keytar / SecureStore），refresh 仅走 body `refreshToken`
- OAuth：**支持 Google/Apple 登录**（每条业务线独立配置与回调）
- 内网（Tailscale）：**不引入**；服务间走公网 HTTPS + 鉴权（详见部署文档）
- Anyhunt Dev API Key：`Authorization: Bearer <apiKey>`（用于调用 Memox/Agentsbox API）
- Memox 多租户数据模型（最小可用）：
  - `tenantId`：从 API key 推导（客户端不可传）
  - `namespace`：调用方分区键（默认 `default`）
  - `externalUserId`：调用方的用户标识（例如 moryflow userId）
  - `metadata`：自定义 JSON 字段（存储用；筛选仅支持白名单字段）
- 数据库：
  - Moryflow：独立 Postgres/Redis（部署在 4c6g）
  - Anyhunt Dev：独立 Postgres/Redis（部署在 8c16g）
  - Memox 向量库：独立 Postgres（pgvector，部署在 8c16g）

## 文档拆分

- 域名与部署（反代/三机拓扑）：`docs/architecture/domains-and-deployment.md`
- Auth 详细文档：
  - 域名与路由：`docs/architecture/auth/domains-and-routing.md`
  - 服务与网络：`docs/architecture/auth/services-and-network.md`
  - 认证与 Token：`docs/architecture/auth/auth-and-tokens.md`
  - 数据库：`docs/architecture/auth/database.md`
  - 配额与 API Keys：`docs/architecture/auth/quota-and-api-keys.md`
  - 统一 Token Auth V2 改造方案（跨 Anyhunt + Moryflow，active）：`docs/architecture/auth/unified-token-auth-v2-plan.md`
  - Auth 与全量请求统一改造计划（Zustand + Methods + Functional API Client，completed）：`docs/architecture/auth/auth-zustand-method-refactor-plan.md`（2026-02-24：Step 1~13 全部完成；客户端 + 服务端出站 HTTP + WebSocket 统一落地；旧客户端范式清理与受影响包回归验证已完成，`moryflow-mobile check:type` 仅保留既有基线问题）
- ADR（顶层前提）：`docs/architecture/adr/adr-0001-two-business-lines.md`
- 部署 runbooks：
  - megaboxpro 反代：`docs/runbooks/deploy/megaboxpro-1panel-reverse-proxy.md`
  - Anyhunt Dokploy：`docs/runbooks/deploy/anyhunt-dokploy.md`
  - Moryflow compose：`docs/runbooks/deploy/moryflow-compose.md`
