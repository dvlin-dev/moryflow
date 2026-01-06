---
title: 改造计划与部署文档（目标架构落地）
date: 2026-01-06
scope: megaboxpro, 4c6g, 8c16g
status: active
---

<!--
[INPUT]: 现状为单仓库多应用；三台机器（megaboxpro 入口反代、4c6g 主业务、8c16g 重服务）；支持 Google/Apple 登录；两条业务线永不互通
[OUTPUT]: 按步骤推进的改造计划 + 三机部署 checklist（含反代路由与环境变量）
[POS]: 从“文档定案”到“可上线运行”的执行手册

[PROTOCOL]: 本文件变更时，需同步更新 `docs/architecture/CLAUDE.md` 与 `docs/architecture/domains-and-deployment.md`（若影响部署与路由约束）。
-->

# 改造计划与部署文档

## 目标架构（摘要）

- Moryflow：`www.moryflow.com`（营销）+ `app.moryflow.com`（应用+API）+ `moryflow.app`（发布站）
- Aiget Dev：`console.aiget.dev`（控制台+API；模块：Agentsbox、Memox）
- 两条业务线：不共享账号/Token/数据库；支持 Google/Apple 登录；只共享 `packages/*` 代码
- 网络：不引入 Tailscale；公网 HTTPS + API key/JWT + 限流
- 数据库：
  - 4c6g：`moryflow-postgres` + `moryflow-redis`
  - 8c16g：`aigetdev-postgres` + `aigetdev-redis` + `memox-vector-postgres(pgvector)`

## 改造计划（按里程碑）

### Milestone 0：文档与边界定稿（1 天内）

- [ ] 以 `docs/architecture/auth.md` 为唯一架构入口，确认 OAuth 方案为 Google/Apple 且仅限业务线内
- [ ] 统一 API 规范：
  - Moryflow：`https://app.moryflow.com/api/v1`
  - Aiget Dev：`https://console.aiget.dev/api/v1`
- [ ] 统一 API key 规范：`Authorization: Bearer <apiKey>`
- [ ] Memox 数据模型定案：`tenantId + namespace + externalUserId + metadata`

### Milestone 1：共享后端基础设施抽包（1-3 天）

目标：只做“代码复用”，不引入跨域互通与共享数据库。

- [ ] 把可复用的纯代码抽到 `packages/*`（建议优先级）
  - `packages/auth-core`：密码 hash、token 签发/校验、cookie 配置（域名作为配置注入）
  - `packages/http-errors`：统一错误码与异常结构（用户可见信息英文）
  - `packages/rate-limit`：按 `tenantId`/`userId` 的限流策略与存储适配（Redis）
  - `packages/api-keys`：apiKey 生成/哈希/校验/轮换/禁用
- [ ] 两条业务线分别消费这些 packages，但各自注入不同配置与 DB 连接

### Milestone 2：Moryflow Auth 落地（2-4 天）

- [ ] 在 `app.moryflow.com` 落地 `POST /api/v1/auth/*`（OTP + password）
- [ ] 支持 Google/Apple 登录（Web + Native）：
  - [ ] `POST /api/v1/auth/google/start`、`POST /api/v1/auth/google/token`
  - [ ] `POST /api/v1/auth/apple/start`、`POST /api/v1/auth/apple/token`
- [ ] 配置 cookie：`Domain=.moryflow.com`；refresh rotation 开启
- [ ] `GET /api/v1/auth/jwks` 提供 JWKS，业务服务离线验签
- [ ] refresh CSRF：校验 `Origin=https://app.moryflow.com`

### Milestone 3：Aiget Dev Auth + Console 落地（2-4 天）

- [ ] 在 `console.aiget.dev` 落地 `POST /api/v1/auth/*`（OTP + password）
- [ ] 支持 Google/Apple 登录（Web + Native）：
  - [ ] `POST /api/v1/auth/google/start`、`POST /api/v1/auth/google/token`
  - [ ] `POST /api/v1/auth/apple/start`、`POST /api/v1/auth/apple/token`
- [ ] 配置 cookie：`Domain=.aiget.dev`
- [ ] refresh CSRF：校验 `Origin=https://console.aiget.dev`
- [ ] 控制台功能最小化：
  - [ ] 创建 tenant
  - [ ] 创建/禁用/轮换 API key
  - [ ] 调整 tenant 限流策略（qps/concurrency 等）

### Milestone 4：Memox 作为 Aiget Dev 模块对外（3-7 天）

- [ ] API 入口：`/api/v1/memox/*`（挂在 `console.aiget.dev`）
- [ ] 鉴权：仅 API key（`Authorization: Bearer <apiKey>`）
- [ ] tenant 推导：从 apiKey 推导 `tenantId`，请求体不允许传 `tenantId`
- [ ] 存储拆分：
  - 元数据（documents/memories）→ `aigetdev-postgres`
  - embeddings/vector index → `memox-vector-postgres`
- [ ] 写入异步化：
  - API 接收写入 → 入队（`aigetdev-redis`）→ worker 计算 embedding/写向量库
- [ ] 查询同步化 + 限制：
  - 强制要求 `namespace + externalUserId`
  - 限制 `topK` 与内容大小（策略可调）

### Milestone 5：Moryflow 调用 Memox（1-2 天）

- [ ] Moryflow 后端通过公网调用：
  - `https://console.aiget.dev/api/v1/memox/*`
  - `Authorization: Bearer <moryflow-tenant-apiKey>`
- [ ] moryflow 侧设置超时与降级（召回失败不阻塞主流程）
- [ ] namespace 约定（推荐）：
  - `namespace=workspace:{workspaceId}` 或 `namespace=notebook:{notebookId}`

## 部署文档（Checklist）

### 1) megaboxpro（1panel / Nginx）

目标：按 Host 转发到 4c6g/8c16g，不做复杂网关拆分。

- [ ] TLS 证书：
  - `www.moryflow.com`、`app.moryflow.com`、`console.aiget.dev`
- [ ] 反代规则（按 Host）：
  - `www.moryflow.com` → `http://<4c6g-ip>:<moryflow-www-port>`
  - `app.moryflow.com` → `http://<4c6g-ip>:<moryflow-app-port>`
  - `console.aiget.dev` → `http://<8c16g-ip>:<aiget-console-port>`

> Cloudflare 仅做 DNS（不开橙云），因此 origin 必须自己扛流量与防护；务必启用限流与鉴权。

### 2) 4c6g（Dokploy）：Moryflow

- [ ] 部署容器：
  - `moryflow-app`（包含 web + api）
  - `moryflow-postgres`
  - `moryflow-redis`
- [ ] 必备环境变量（示例命名）：
  - `PUBLIC_BASE_URL=https://app.moryflow.com`
  - `COOKIE_DOMAIN=.moryflow.com`
  - `AUTH_JWT_ISSUER=app.moryflow.com`
  - `AUTH_JWT_PRIVATE_KEY=...`
  - `POSTGRES_URL=...`
  - `REDIS_URL=...`
  - `MEMOX_BASE_URL=https://console.aiget.dev/api/v1/memox`
  - `MEMOX_API_KEY=...`（moryflow tenant 的 apiKey）

### 3) 8c16g（Dokploy）：Aiget Dev + Memox

- [ ] 部署容器：
  - `aiget-console`（web + api）
  - `aigetdev-postgres`
  - `aigetdev-redis`
  - `memox-vector-postgres`（pgvector）
  - `memox-worker`
  - `agentsbox-worker`（如有）
- [ ] 必备环境变量（示例命名）：
  - `PUBLIC_BASE_URL=https://console.aiget.dev`
  - `COOKIE_DOMAIN=.aiget.dev`
  - `AUTH_JWT_ISSUER=console.aiget.dev`
  - `AUTH_JWT_PRIVATE_KEY=...`
  - `POSTGRES_URL=...`
  - `REDIS_URL=...`
  - `MEMOX_VECTOR_POSTGRES_URL=...`

## 验收标准（上线前）

- [ ] `app.moryflow.com` 注册/登录/refresh/logout 全流程通过
- [ ] `console.aiget.dev` 注册/登录/refresh/logout 全流程通过
- [ ] `console.aiget.dev` 可创建 tenant + apiKey，并能调限流策略
- [ ] memox：
  - [ ] 写入走队列 + worker，向量写入成功
  - [ ] 召回按 `namespace + externalUserId` 正确隔离
- [ ] moryflow 调 memox：超时/失败不影响主流程
