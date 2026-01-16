---
title: 用户系统改造计划（两套 Auth + Auth Client）
date: 2026-01-06
scope: moryflow.com, anyhunt.app
status: archived
archived_date: 2026-01-12
---

<!--
[INPUT]: 两条业务线隔离（Moryflow / Anyhunt Dev）；支持 Google/Apple 登录；只共享 packages/*；零兼容改造
[OUTPUT]: 用户系统改造计划（目标、目录、模块职责、步骤、删除清单、测试验收）
[POS]: 归档：用户系统改造计划（阶段性执行记录）

[PROTOCOL]: 本文件为归档记录；仅在需要追溯历史时更新，并同步更新 `docs/index.md`（若索引发生变化）。
-->

# 用户系统改造计划（两套 Auth + Auth Client）

## 目标（必须达成）

1. **两套 Auth 永不互通**：账号/Token/数据库完全隔离；仅共享 `packages/*` 代码。
2. **通用可复用**：Auth 规则一致（路由/TTL/CSRF/JWKS），配置由业务线注入。
3. **零兼容**：删除无用代码/文档/接口，不保留旧方案。
4. **模块化 + 单一职责**：每个包/模块只负责一个清晰职责。
5. **快速交付**：任意新项目可在 1 天内完成可用的用户系统接入与部署。
6. **可开源**：文档、配置、示例齐全，外部项目能独立部署与复用。

## 非目标（明确不做）

- 不做跨域登录、不做跨业务线账号合并。
- 不建设“统一身份平台”，不共享账号/Token/数据库。

## 改造后目录（目标结构）

```
packages/
├── auth-server/        # 服务端 Auth 基座（可复用、可配置）
├── auth-client/        # 通用 Auth 客户端（按业务线注入 baseURL）
├── identity-db/        # Auth 数据模型（同 schema，不同实例）
└── types/              # 通用类型（不代表账号/数据互通）

apps/
├── moryflow/
│   └── server/src/modules/auth/
└── console/
    └── server/src/modules/auth/

templates/
└── auth-service/       # 独立 Auth 服务模板（用于新项目快速复用）
```

> 实际落点以现有应用结构为准，但**必须保持两条业务线各自独立部署**。

## 模块职责（单一职责）

### packages/auth-server

- 提供 Auth 基础能力：JWT、email OTP、refresh rotation、Facade controller。
- 支持 OAuth/OIDC（Google/Apple），不提供跨业务线共享逻辑。
- 业务线通过配置注入：`baseURL`、`COOKIE_DOMAIN`、`AUTH_JWT_ISSUER` 等。

### packages/auth-client（由 packages/auth 重命名）

- 面向 Web/PC/移动端的通用客户端 SDK。
- 暴露 `createAuthClient({ baseUrl, clientType })`，不内置域名/统一配置。
- 只封装通用流程：register/login/verify/refresh/logout/me + Google/Apple 登录。

### packages/identity-db

- 提供同一份 schema 与 Prisma Client。
- **每条业务线独立数据库与密钥**（不同实例，不共享数据）。

### packages/types

- 提供通用类型，不引入“统一身份/统一钱包”的语义。

### templates/auth-service（新增）

- 提供可直接部署的 Auth 服务模板（独立项目也可用）。
- 仅依赖 `auth-server` 与 `identity-db`，无业务耦合。
- 通过环境变量注入域名、Cookie、OAuth、邮件发送等配置。

## 关键设计约束（固定）

- Auth 路由一致：`/api/v1/auth/*`（两条业务线同路径，不同域名）。
- OAuth 仅支持 Google/Apple（每条业务线独立 clientId/回调域名）。
- Token 规则：`access=6h`、`refresh=90d`、rotation=on。
- Web：refresh 存 `HttpOnly Cookie`；access 仅内存。
- CSRF：refresh 必须校验 `Origin`（`app.moryflow.com` / `console.anyhunt.app` / `admin.anyhunt.app`）。
- JWKS：业务服务通过 `/api/v1/auth/jwks` 离线验签。
- Anyhunt Dev 对外能力使用 API key（`Authorization: Bearer <apiKey>`）。

## 交付与复用形态（必须落地）

1. **内嵌模式（业务线内）**：在现有应用内注册 Auth 模块，复用 `auth-server`。
2. **独立服务模式**：使用 `templates/auth-service` 独立部署，通过反代挂载到同域名 `/api/v1/auth`。
3. **客户端 SDK**：`/auth-client` 作为统一接入层，业务侧只配置 `baseUrl/clientType`。

## 快速接入清单（必须具备）

- 最小化环境变量文档（Auth 服务 + OAuth + 邮件）；
- Docker Compose 示例（Postgres + Redis + Auth Service）；
- 统一回调域名与 cookie domain 配置说明；
- 前端接入示例（Web + Native）；
- OpenAPI/接口说明（可通过 Swagger 或文档列出）。

## 基础能力清单（MVP 必备）

- 注册/登录/刷新/登出/Me
- Email OTP 验证
- Google/Apple 登录（start + token）
- Session revoke（登出失效）
- JWKS 提供与离线验签约定

## 开源准备（可选但建议预留）

- 独立 README + 快速开始
- `.env.example` 与 Docker Compose 示例
- API 文档导出与变更记录
- 安全与部署注意事项说明

## 改造范围（必须覆盖）

- Auth Server：完善 Google/Apple OAuth 入口、DTO/Service 与示例配置。
- Auth Client：重命名 `/auth` → `/auth-client`，注入化配置。
- Auth Client：连接注册/登录/刷新/登出/Me + Google/Apple 登录流程。
- Identity DB：文档与注释对齐“业务线独立”。
- 业务线接入：Moryflow 与 Anyhunt Dev 各自配置 Auth（域名、Cookie、密钥、DB）。
- 文档同步：所有“统一身份/共享账号”表述清理。
- Auth 服务模板：提供可独立部署的模板与最小配置文档。

## 删除清单（零兼容）

- 删除旧目录 `packages/auth`（仅保留 `packages/auth-client`）。
- 删除文档里关于“统一身份/共享账号/跨域互通”的旧内容。

## 改造步骤（里程碑）

### Milestone 0：文档对齐

- 更新用户系统文档与索引（本文件 + overview）。
- 清理“统一身份/共享账号”相关表述。

### Milestone 1：Auth Client 重构

- `packages/auth` → `packages/auth-client`（包名为 `/auth-client`）。
- 提供 `createAuthClient({ baseUrl, clientType })`。
- 移除硬编码域名与旧配置。

### Milestone 2：Auth Server 收敛

- 落地 Google/Apple OAuth 路由、DTO 与服务逻辑。
- 明确回调域名与 clientId/密钥注入方式（按业务线独立配置）。
- 配置参数全部通过调用方注入。
- 增强能力（可选）：
  - 忘记密码/重置密码
  - 邮箱变更验证
  - 账号注销/禁用
  - Session 列表与一键下线
  - 登录失败限流与风控策略

### Milestone 3：业务线落地

- Moryflow：配置 `baseURL`、`COOKIE_DOMAIN=.moryflow.com`、独立 DB。
- Anyhunt Dev：配置 `baseURL`、`COOKIE_DOMAIN=.anyhunt.app`、独立 DB。
- 确保 JWT issuer/audience 与 JWKS 按业务线隔离。

### Milestone 4：Auth 服务模板与快速接入

- 新增 `templates/auth-service`（独立服务）。
- 输出最小环境变量清单与 Docker Compose 示例。
- 输出前端接入示例（Web + Native）。

### Milestone 5：API Key 与 Memox 基座

- Anyhunt Dev API key 生成/轮换/禁用。
- tenantId 从 apiKey 推导；禁止客户端传入。

### Milestone 6：测试与验收

- 单元测试补齐：核心 Auth 逻辑与 API key 生成/校验。
- E2E 覆盖：注册/登录/refresh/logout + Google/Apple 登录全流程。
- 通过：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`。

### Milestone 7：开源准备（可选）

- 输出 README/快速开始/示例配置
- 标准化 API 文档与版本说明

## 验收标准

- 两条业务线的注册/登录/refresh/logout 各自独立通过。
- 业务线之间 Token/Session/Cookie 互不可用。
- Google/Apple 登录在两条业务线内各自可用。
- Auth Client 可复用于任一业务线（仅变更 baseURL/config）。
- 任意新项目可按模板在 1 天内完成部署与接入。
- 开源版本具备最小可用文档与示例配置。

## 风险与注意

- OAuth 需要正确配置 Google/Apple 回调与密钥，务必按业务线隔离。
- 删除旧代码前必须确保无引用（全仓库搜索确认）。
