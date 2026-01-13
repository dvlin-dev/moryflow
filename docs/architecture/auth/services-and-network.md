---
title: Auth - 服务与网络（公网 + 反代）
date: 2026-01-05
scope: dokploy, nginx
status: active
---

<!--
[INPUT]: 不同云、多台机器部署；服务间走公网 HTTPS 调用
[OUTPUT]: 服务边界与公网调用（megaboxpro 反代）规范
[POS]: 两套 Auth 与对外能力的网络与安全约束
-->

# 服务与网络（公网 + 反代）

## 服务边界

- **Moryflow Auth**：只服务 `app.moryflow.com`（不与 Aiget Dev 互通）。
- **Aiget Dev Auth**：只服务 `server.aiget.dev`（平台内模块共享登录态；console/admin 为独立 Web 前端）。
- **Aiget Dev API（Memox/Agentsbox）**：统一在 `server.aiget.dev/api/v1/*` 下暴露，对外通过 API key 鉴权。
- **入口反代（megaboxpro/1panel）**：对外收敛域名入口，按 Host 转发到 4c6g/8c16g。

## 网络与安全（不引入 Tailscale）

你已确认不引入 Tailscale；服务间调用统一走公网 HTTPS。

最低安全约束：

- 任何对外 API（尤其 Memox/Agentsbox）必须鉴权：
  - 用户登录态：`Authorization: Bearer <accessToken>`
  - 开发者调用：`Authorization: Bearer <apiKey>`
- 默认限流必须启用（动态可调，按 `tenantId`）。
- 管理接口只允许从 `console.aiget.dev` / `admin.aiget.dev` 侧访问（后端强制校验权限）。

## 机器拓扑（当前默认）

- megaboxpro（入口反代，1panel/Nginx）：
  - `www.moryflow.com`、`app.moryflow.com` → 4c6g
  - `aiget.dev`、`server.aiget.dev`、`console.aiget.dev`、`admin.aiget.dev` → 8c16g
- 4c6g（Moryflow 线）：
  - moryflow app/api + moryflow-postgres + moryflow-redis
- 8c16g（Aiget Dev + 重服务）：
  - console app/api + aiget-postgres + aiget-redis
  - aiget-vector-postgres（pgvector，独立实例）
  - agentsbox/memox workers（重任务）

## Moryflow 调 Memox（公网同一套 API）

Moryflow 后端调用 Memox 时不走“内部专线”，直接调用 Aiget Dev 的公网 API：

- Base URL：`https://server.aiget.dev/api/v1/memox`
- 鉴权：`Authorization: Bearer <apiKey>`
- 隔离：`tenantId` 从 apiKey 推导；按 `namespace + externalUserId` 划分数据域

Moryflow 侧必须：

- 设置合理超时（例如 2-5s）
- 失败时降级（例如召回为空，不阻塞主流程）
