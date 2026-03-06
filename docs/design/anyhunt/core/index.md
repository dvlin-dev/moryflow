---
title: Anyhunt Core 索引
date: 2026-02-28
scope: docs/design/anyhunt/core
status: active
---

# Anyhunt Core

## 摘要

- `system-boundaries-and-identity.md`：业务边界、域名、鉴权与租户隔离。
- `model-runtime-and-thinking.md`：模型配置单一事实源、thinking 契约与稳定性约束。
- `domains-and-deployment.md`：双业务线域名职责与三机部署拓扑（详细版）。

## 详细规范

- `auth-and-tokens.md`：Token、刷新、Cookie 与原生端 refresh 约束。
- `frontend-engineering-baseline.md`：表单/渲染/图标/组件质量前端基线。
- `quota-and-api-keys.md`：tenant/apiKey/namespace 与动态限流策略。
- `api-channel-routing.md`：`app/public/apikey` 三通道路由边界与迁移规则。
- `request-and-state-unification.md`：Store + Methods + Functional API Client 全量收敛方案（已合并请求编排摘要规范）。
- `request-log-module.md`：统一请求日志模型、查询能力、保留策略与验收标准。
