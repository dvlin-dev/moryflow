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

- Moryflow：`www.moryflow.com`（营销）+ `docs.moryflow.com`（文档）+ `app.moryflow.com`（应用+API）+ `moryflow.app`（发布站）
- Aiget Dev：
  - `aiget.dev`：官网（模块：Fetchx、Memox）
  - `server.aiget.dev`：统一 API（`/api/v1`）
  - `docs.aiget.dev`：文档站（独立项目）
  - `console.aiget.dev`：控制台前端（Web）
  - `admin.aiget.dev`：管理后台前端（Web）
- 两条业务线：不共享账号/Token/数据库；支持 Google/Apple 登录；只共享 `packages/*` 代码
- 网络：不引入 Tailscale；公网 HTTPS + API key/JWT + 限流
- 数据库：
  - 4c6g：`moryflow-postgres` + `moryflow-redis`
  - 8c16g：`aiget-postgres` + `aiget-vector-postgres` + `aiget-redis`（完全独立，不与 Moryflow 共享）

## 部署原则（已确认）

1. **部署方式固定**：Moryflow 使用单份 docker compose（4c6g），Aiget Dev 使用 Dokploy 多项目（8c16g）。
2. **对外只暴露 `IP:端口`**：4c6g/8c16g 不处理域名与证书。
3. **域名反代在 megaboxpro（1panel）**：由 1panel 统一 TLS 与反向代理到 `IP:端口`。
4. **DB/Redis 需要暴露端口**：便于你从外部直连调试（安全由你在 1panel/防火墙层面控制）。

## 端口分配（固定）

### 8c16g：Aiget（Dokploy 多项目）

- `3100`：`aiget-server`（API）
- `3103`：`aiget-www`（aiget.dev 官网）
- `3102`：`aiget-console`（console.aiget.dev）
- `3101`：`aiget-admin`（admin.aiget.dev）
- `3110`：`aiget-docs`（docs.aiget.dev）

### 4c6g：Moryflow（`deploy/moryflow/docker-compose.yml`）

- `3100`：`moryflow-server`（API）
- `3102`：`moryflow-www`（www.moryflow.com，占位页）
- `3103`：`moryflow-docs`（docs.moryflow.com）
- `3101`：`moryflow-admin`（后台）
- `3105`：`moryflow-app`（app.moryflow.com，占位页，未来 Web App）

## 改造计划（按里程碑）

### Milestone 0：文档与边界定稿（1 天内）

- [ ] 以 `docs/architecture/auth.md` 为唯一架构入口，确认 OAuth 方案为 Google/Apple 且仅限业务线内
- [ ] 统一 API 规范：
  - Moryflow：`https://app.moryflow.com/api/v1`
  - Aiget Dev：`https://server.aiget.dev/api/v1`
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

- [ ] 在 `server.aiget.dev` 落地 `POST /api/v1/auth/*`（OTP + password；console/admin 跨域调用）
- [ ] 支持 Google/Apple 登录（Web + Native）：
  - [ ] `POST /api/v1/auth/google/start`、`POST /api/v1/auth/google/token`
  - [ ] `POST /api/v1/auth/apple/start`、`POST /api/v1/auth/apple/token`
- [ ] 配置 cookie：`Domain=.aiget.dev`
- [ ] refresh CSRF：校验 `Origin` 白名单（`https://console.aiget.dev`、`https://admin.aiget.dev`）
- [ ] 控制台功能最小化：
  - [ ] 创建 tenant
  - [ ] 创建/禁用/轮换 API key
  - [ ] 调整 tenant 限流策略（qps/concurrency 等）

### Milestone 4：Memox 作为 Aiget Dev 模块对外（3-7 天）

- [ ] API 入口：`/api/v1/memox/*`（挂在 `server.aiget.dev`）
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
  - `https://server.aiget.dev/api/v1/memox/*`
  - `Authorization: Bearer <moryflow-tenant-apiKey>`
- [ ] moryflow 侧设置超时与降级（召回失败不阻塞主流程）
- [ ] namespace 约定（推荐）：
  - `namespace=workspace:{workspaceId}` 或 `namespace=notebook:{notebookId}`

## 部署文档（Checklist）

### 1) megaboxpro（1panel / Nginx）

目标：按 Host 转发到 4c6g/8c16g，不做复杂网关拆分。

- [ ] TLS 证书：
  - `www.moryflow.com`、`app.moryflow.com`、`aiget.dev`、`server.aiget.dev`、`console.aiget.dev`、`admin.aiget.dev`
- [ ] 反代规则（按 Host）：
  - `www.moryflow.com` → `http://<4c6g-ip>:3102`
  - `docs.moryflow.com` → `http://<4c6g-ip>:3103`
  - `app.moryflow.com` → `http://<4c6g-ip>:3105`（当前占位页）
  - `aiget.dev` → `http://<8c16g-ip>:3103`（官网）
  - `server.aiget.dev` → `http://<8c16g-ip>:3100`（API）
  - `docs.aiget.dev` → `http://<8c16g-ip>:3110`
  - `console.aiget.dev` → `http://<8c16g-ip>:3102`
  - `admin.aiget.dev` → `http://<8c16g-ip>:3101`

> Cloudflare 仅做 DNS（不开橙云），因此 origin 必须自己扛流量与防护；务必启用限流与鉴权。

### 2) 4c6g：Moryflow（docker compose）

- [ ] 部署容器：
  - `moryflow-server`（API）
  - `moryflow-www`（www 占位页）
  - `moryflow-docs`
  - `moryflow-admin`
  - `moryflow-app`（app 占位页）
  - `moryflow-postgres`
  - `moryflow-redis`
- [ ] 必备环境变量（示例命名）：
  - `PUBLIC_BASE_URL=https://app.moryflow.com`
  - `ALLOWED_ORIGINS=https://www.moryflow.com,https://admin.moryflow.com,https://app.moryflow.com`
  - `COOKIE_DOMAIN=.moryflow.com`
  - `AUTH_JWT_ISSUER=app.moryflow.com`
  - `AUTH_JWT_PRIVATE_KEY=...`
  - `POSTGRES_URL=...`
  - `REDIS_URL=...`
  - `MEMOX_BASE_URL=https://server.aiget.dev/api/v1/memox`
  - `MEMOX_API_KEY=...`（moryflow tenant 的 apiKey）

### 3) 8c16g：Aiget（Dokploy 多项目）

- [ ] 部署服务（每个项目一个 Dokploy 应用）：
  - `aiget-server`（API）
  - `aiget-www`
  - `aiget-docs`
  - `aiget-console`
  - `aiget-admin`
- [ ] 配置清单：参考 `docs/architecture/aiget-dokploy-deployment.md`
- [ ] 必备环境变量（按服务拆分）：
  - `aiget-server`：
    - `DATABASE_URL=...`
    - `VECTOR_DATABASE_URL=...`
    - `REDIS_URL=...`
    - `BETTER_AUTH_SECRET=...`
    - `BETTER_AUTH_URL=https://server.aiget.dev`
    - `ADMIN_PASSWORD=...`
    - `ALLOWED_ORIGINS=https://aiget.dev,https://console.aiget.dev,https://admin.aiget.dev`
    - `TRUSTED_ORIGINS=https://aiget.dev,https://console.aiget.dev,https://admin.aiget.dev`
    - `SERVER_URL=https://server.aiget.dev`
  - `aiget-www`：
    - `VITE_API_URL=https://server.aiget.dev`
    - `VITE_TURNSTILE_SITE_KEY=...`（可选）
  - `aiget-console` / `aiget-admin`：
    - `VITE_API_URL=https://server.aiget.dev`
    - `VITE_AUTH_URL=https://server.aiget.dev`

### 8c16g：Aiget 部署顺序（建议）

1. 启动基础设施：`aiget-postgres`、`aiget-vector-postgres`、`aiget-redis`
2. 部署 `aiget-server`（自动执行 Prisma 双库 `migrate deploy`）
3. 部署 `aiget-www`、`aiget-docs`、`aiget-console`、`aiget-admin`
4. 校验：`/health`、登录/刷新 token、控制台与后台核心流程

## 验收标准（上线前）

- [ ] `app.moryflow.com`（占位）可访问
- [ ] `console.aiget.dev` / `admin.aiget.dev` 注册/登录/refresh/logout 全流程通过（API 走 `server.aiget.dev/api/v1`）
- [ ] 控制台可创建 tenant + apiKey，并能调限流策略
- [ ] memox：
  - [ ] 写入走队列 + worker，向量写入成功
  - [ ] 召回按 `namespace + externalUserId` 正确隔离
- [ ] moryflow 调 memox：超时/失败不影响主流程
