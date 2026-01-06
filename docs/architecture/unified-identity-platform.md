---
title: 统一身份平台（UIP）- 文档入口
date: 2026-01-05
scope: aiget.dev
status: active
---

<!--
[INPUT]: Monorepo 多产品；统一用户系统与计费；子域名架构；跨云部署
[OUTPUT]: UIP 相关文档入口与“已定稿”的关键约束
[POS]: UIP 的总入口文档，所有实现与讨论应以此为准

[PROTOCOL]: 本文件变更时，需同步更新 docs/architecture/CLAUDE.md 与根 CLAUDE.md 的文档索引。
-->

# 统一身份平台（UIP）

UIP（Unified Identity Platform）是 Aiget 平台的“统一用户系统 + 统一计费层”：

- 用户：`User/Profile/Account/Session` 共享一套数据
- 计费：`Subscription/Wallet/Entitlement/Payment` 共享一套数据
- 产品：每个产品仍是独立品牌、独立部署、独立应用子域名

本仓库已确定采用 **主域名 + 子域名（`*.aiget.dev`）** 架构；跨云服务间调用使用 **Tailscale** 私网。

## 已定稿的关键约束（不要再发散）

- 域名：
  - 营销/文档：`moryflow.com`（点击登录跳转到应用域名）
  - 主应用：`moryflow.aiget.dev`
  - 发布站：`moryflow.app`（Cloudflare Worker + R2，按 `*.moryflow.app` 映射）
- API：同域名同 origin（避免 CORS）：
  - `https://{product}.aiget.dev/api/v1/...`（各服务 `app.setGlobalPrefix('api')`）
- Token：
  - `accessTokenTtl=6h`
  - `refreshTokenTtl=90d`
  - `refreshRotation=on`
  - Web：refreshToken 存 `HttpOnly Cookie (Domain=.aiget.dev)`；accessToken 存内存
  - Electron/RN：refreshToken 存 Secure Storage；accessToken 存内存
- 订阅等级：`FREE/STARTER/PRO/MAX`（无企业版；如需仅做前端展示与私聊，不落真实订阅）
- 数据库：共享 Postgres，schema 隔离（identity/billing/各产品 schema）
- 支付：Creem；Webhook 走 `https://{product}.aiget.dev/api/v1/webhooks/payments` → 网关 → UIP（网关到 UIP 走 Tailscale）
- 账号合并：以 `email` 为唯一用户键；Google OAuth 登录若 email 已存在则绑定到同一 user

## 文档拆分

- 总架构（域名/网关/Token/Tailscale）：`docs/architecture/subdomain-uip-architecture.md`
- UIP 拆分文档入口：`docs/architecture/uip/index.md`
  - 域名与路由：`docs/architecture/uip/domains-and-routing.md`
  - 服务与网络：`docs/architecture/uip/services-and-network.md`
  - 认证与 Token：`docs/architecture/uip/auth-and-tokens.md`
  - 数据库：`docs/architecture/uip/database.md`
  - 订阅/钱包/权益：`docs/architecture/uip/subscriptions-wallet-entitlements.md`
  - 支付（Creem）：`docs/architecture/uip/payments-creem.md`
