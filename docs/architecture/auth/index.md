---
title: Auth 拆分文档 - 入口
date: 2026-01-06
scope: moryflow.com, aiget.dev
status: active
---

<!--
[INPUT]: 两套 Auth（Moryflow / Aiget Dev）与 Aiget Dev API key 能力
[OUTPUT]: 拆分文档索引（不使用目录 CLAUDE.md，避免小目录冗余）
[POS]: `docs/architecture/auth/` 入口

[PROTOCOL]: 本索引变更需同步更新 `docs/architecture/auth.md`。
-->

# Auth 拆分文档

- 域名与路由：`docs/architecture/auth/domains-and-routing.md`
- 服务与网络（公网 + megaboxpro 反代）：`docs/architecture/auth/services-and-network.md`
- 认证与 Token（不做 OAuth）：`docs/architecture/auth/auth-and-tokens.md`
- 数据库：`docs/architecture/auth/database.md`
- 配额与 API Keys（Aiget Dev）：`docs/architecture/auth/quota-and-api-keys.md`
