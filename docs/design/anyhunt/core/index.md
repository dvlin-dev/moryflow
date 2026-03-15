---
title: Anyhunt Core 索引
date: 2026-02-28
scope: docs/design/anyhunt/core
status: active
---

# Anyhunt Core

## 摘要

- `system-boundaries-and-identity.md`：业务边界、域名、鉴权、租户隔离，以及“Anyhunt 拥有公开协议主权、Moryflow Server 与外部客户共用同一套 Memox API；二期固定采用每环境一个服务 API Key，冻结 `user_id/project_id/external_id/display_path` 映射、rename 仅刷新 identity 的约束，并在当前 graph merge 仍按 `apiKeyId` 归并时保持 graph 关闭”的冻结原则。
- `model-runtime-and-thinking.md`：模型配置单一事实源、thinking 契约与稳定性约束。
- `domains-and-deployment.md`：双业务线域名职责与三机部署拓扑（详细版）。

## 详细规范

- `auth-and-tokens.md`：Token、刷新、Cookie 与原生端 refresh 约束。
- `frontend-engineering-baseline.md`：表单/渲染/组件质量前端基线（设计系统详见 `docs/reference/design-system.md`）。
- `quota-and-api-keys.md`：API Key hash-only、`apiKeyId` 隔离口径与动态限流策略，并冻结 Moryflow 二期的服务端 API Key 策略（每环境一个服务 key、双 key rotate、泄露处置、按 scope 删除而非 revoke 服务 key）。
- `api-channel-routing.md`：`app/public/apikey` 三通道路由边界与迁移规则。
- `request-and-state-unification.md`：Store + Methods + Functional API Client 全量收敛方案（已合并请求编排摘要规范）。
- `request-log-module.md`：统一请求日志模型、查询能力、保留策略与验收标准。
