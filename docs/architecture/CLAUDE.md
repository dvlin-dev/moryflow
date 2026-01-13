<!--
[INPUT]: 架构/部署相关文档（域名、路由、服务边界、数据模型、运维约束）
[OUTPUT]: 可执行的系统设计说明，供实现与部署对齐
[POS]: docs/architecture/ 的协作入口与索引

[PROTOCOL]: 本目录新增/更新“最终决策类”文档时，应同步更新 docs/CLAUDE.md 与根 CLAUDE.md 的文档索引（若影响全局）。
-->

# docs/architecture/ 指南

## 目标

- 把“已拍板的架构决策”固化为可执行规范，避免口头约定漂移。
- 以个人/小团队可维护为优先：复杂度足够低，但保留未来升级空间。

## 文档清单

- `domains-and-deployment.md`：域名职责 + 三机部署（megaboxpro/4c6g/8c16g）+ 反代路由的可执行方案（含 OAuth 登录）。
  - Moryflow：`www.moryflow.com`（营销）+ `docs.moryflow.com`（文档）+ `app.moryflow.com`（应用+API）+ `moryflow.app`（发布站）
  - Aiget Dev：`aiget.dev`（官网）+ `server.aiget.dev`（API `/api/v1`）+ `docs.aiget.dev`（文档）+ `console.aiget.dev` / `admin.aiget.dev`（Web 前端）
- `auth.md`：Auth 系统入口（支持 Google/Apple 登录、不做跨域互通），指向 `auth/` 拆分文档。
- `auth/`：Auth 拆分文档目录（域名与路由、服务与网络、认证与 Token、数据库、配额与 API Keys）。
- `adr/`：架构决策记录（ADR）。任何关键约束调整都应该新增 ADR，而不是在群聊里“口头改掉”。

> 说明：部署/操作类文档已迁移到 `docs/runbooks/`；开发指南类文档已迁移到 `docs/guides/`；旧计划文档归档于 `docs/_archived/`。
