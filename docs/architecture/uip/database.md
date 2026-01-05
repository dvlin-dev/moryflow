---
title: UIP - 数据库（共享 Postgres + Schema 隔离）
date: 2026-01-05
scope: postgres
status: active
---

<!--
[INPUT]: 统一用户系统与计费共享；多产品业务隔离
[OUTPUT]: Postgres schema 切分与数据边界规范
[POS]: 统一数据库策略（个人开发者可维护）
-->

# 数据库（共享 Postgres + Schema 隔离）

## 目标

- 统一用户与计费数据（真源）
- 产品业务数据按 schema 隔离
- 运维最小化（单集群）

## Schema 划分（固定）

- `identity`：用户与认证
  - `users`, `profiles`, `accounts`, `sessions`
- `billing`：计费与权益
  - `subscriptions`, `wallets`, `wallet_transactions`, `entitlements`, `plans`
- `{product}`：产品业务数据（例如 `moryflow.*`, `fetchx.*`）

## 访问边界（固定）

- UIP 服务拥有 `identity` 与 `billing` 的写权限
- 产品服务：
  - 读取：允许按 `userId` 查询必要的 identity/billing 视图（推荐通过 UIP API，而不是直连跨 schema）
  - 写入：禁止直接写 `identity/billing`（全部通过 UIP API）

