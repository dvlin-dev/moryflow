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
  - Anyhunt Dev：`anyhunt.app`（官网）+ `server.anyhunt.app`（API `/api/v1`）+ `docs.anyhunt.app`（文档）+ `console.anyhunt.app` / `admin.anyhunt.app`（Web 前端）
- `admin-llm-provider-config.md`：Admin 动态配置 LLM Providers/Models（入库 baseUrl/apiKey，加密存储；Agent/Playground 运行时路由）。
- `llm-admin-provider-rollout.md`：LLM Admin 配置改造进度（Agent + Extract；含 DB 升级要点与部署清单）。
- `auth.md`：Auth 系统入口（支持 Google/Apple 登录、不做跨域互通），指向 `auth/` 拆分文档。
- `auth/`：Auth 拆分文档目录（域名与路由、服务与网络、认证与 Token、数据库、配额与 API Keys）。
- `adr/`：架构决策记录（ADR）。任何关键约束调整都应该新增 ADR，而不是在群聊里“口头改掉”。
- `ui-message-list-unification.md`：消息列表与输入框 UI 组件抽离方案（Moryflow/Anyhunt 统一，先对齐样式再统一抽象）。

> 说明：部署/操作类文档已迁移到 `docs/runbooks/`；开发指南类文档已迁移到 `docs/guides/`；旧计划文档归档于 `docs/_archived/`。

## 近期更新

- `domains-and-deployment.md`：补充发布站点仅允许 GET/HEAD 与状态页禁缓存约束。
- `domains-and-deployment.md`：补充 `_meta.json` 解析/结构异常按 OFFLINE 处理。
- `domains-and-deployment.md` 补充 `rss.anyhunt.app`（Digest RSS 入口）说明。
- `ui-message-list-unification.md` 已补齐 MessageList 组件并移除 metadata.moryflow 兼容逻辑。
- `auth/unified-auth-rebuild-plan.md`：同步当前改造进度与已完成清单。
