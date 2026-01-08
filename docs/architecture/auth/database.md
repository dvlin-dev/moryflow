---
title: Auth - 数据库（两条业务线隔离）
date: 2026-01-05
scope: postgres, redis
status: active
---

<!--
[INPUT]: 两条业务线独立用户体系与数据库；多产品业务隔离；Memox 向量库独立
[OUTPUT]: Postgres schema 切分与数据边界规范
[POS]: 数据库策略（个人开发者可维护）
-->

# 数据库（两条业务线隔离）

## 目标

- 两条业务线数据硬隔离（最小化互相影响与误操作风险）
- 每条线内部可用 schema 隔离（提升清晰度）
- Memox 向量库独立实例（避免数据量膨胀拖垮主库）

## 物理拆分（固定）

### 4c6g：Moryflow

- `moryflow-postgres`
- `moryflow-redis`

### 8c16g：Aiget Dev

- `aigetdev-postgres`：console/auth/agentsbox/memox 元数据（非向量）
- `aigetdev-redis`：队列/限流/缓存
- `memox-vector-postgres`：向量与索引（pgvector，独立实例）

## Aiget Dev 数据模型（最小可用）

Auth/控制台（示例）：

- `auth.users`
- `auth.sessions`
- `auth.refresh_tokens`

API Key 与租户：

- `tenants`
- `api_keys`（只存 hash；明文仅创建时显示一次）
- `api_key_policies`（动态限流/配额策略，按 `tenantId`）

Memox（元数据，落在 `aigetdev-postgres`）：

- `memox.documents`（或 `memox.memories`）
  - `tenantId`（从 apiKey 推导）
  - `namespace`（默认 `default`）
  - `externalUserId`
  - `metadata`（jsonb）

Memox（向量，落在 `memox-vector-postgres`）：

- `memox.embeddings`
  - `tenantId + namespace + externalUserId` 必须可筛选
  - embedding 向量列使用 pgvector，并按需要建立 ANN 索引
