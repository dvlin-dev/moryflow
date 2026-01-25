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
- `auth/unified-auth-rebuild-file-map.md`：Auth 统一改造涉及文件与模块清单（含潜在漏改提示）。
- `adr/`：架构决策记录（ADR）。任何关键约束调整都应该新增 ADR，而不是在群聊里“口头改掉”。
- `adr/adr-0002-agent-runtime-control-plane.md`：Agent Runtime 控制面（Compaction/Permission/Truncation）决策。
- `ui-message-list-unification.md`：消息列表与输入框 UI 组件抽离方案（Moryflow/Anyhunt 统一，先对齐样式再统一抽象）。
- `adr/adr-0002-agent-runtime-control-plane.md`：Agent Runtime 控制面（含 OpenCode 对标与落地路径）。

> 说明：部署/操作类文档已迁移到 `docs/runbooks/`；开发指南类文档已迁移到 `docs/guides/`；旧计划文档归档于 `docs/_archived/`。

## 近期更新

- `adr/adr-0002-agent-runtime-control-plane.md`：补充 compaction 摘要输入裁剪规则（2026-01-27）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 compaction 上下文窗口来源与发送前预处理（2026-01-27）。
- `adr/adr-0002-agent-runtime-control-plane.md`：P1-3 会话压缩落地完成（PC + Mobile）（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 Compaction“裁剪旧工具输出”示例（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：P0-2 权限系统落地完成（审批卡/JSONC/审计）（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：确认 P0-2 权限落地细节（审批卡位置、规则直接写 JSONC、Mobile 审计路径）（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：P0-1 工具输出截断落地进度更新（2026-01-25）。
- `adr/adr-0002-agent-runtime-control-plane.md`：系统提示词参数改为高级可选覆盖（默认使用模型默认值）（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充系统提示词/参数自定义（默认/自定义、参数范围、禁用时间占位符）（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：合并 OpenCode 对标与落地清单，删除独立对标文档（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充范围与实施原则，明确聊天消息内打开文件（2026-01-24）。
- `domains-and-deployment.md`：补充发布站点仅允许 GET/HEAD 与状态页禁缓存约束。
- `domains-and-deployment.md`：补充 `_meta.json` 解析/结构异常按 OFFLINE 处理。
- `domains-and-deployment.md` 补充 `rss.anyhunt.app`（Digest RSS 入口）说明。
- `ui-message-list-unification.md` 已补齐 MessageList 组件并移除 metadata.moryflow 兼容逻辑。
- `auth/unified-auth-rebuild-plan.md`：标记完成并补充业务服务 JWKS 验签落地。
- `auth/unified-auth-rebuild-plan.md`：补充 Auth 环境变量核对结论。
- `auth/unified-auth-rebuild-plan.md`：补充 Anyhunt/Moryflow 数据库重置执行记录。
- `auth/unified-auth-rebuild-plan.md`：补充 JWKS 验签测试落地记录。
- `auth/unified-auth-rebuild-plan.md`：补充 Auth env 域名对齐与无需新增变量结论。
- `auth/unified-auth-rebuild-file-map.md`：新增 Auth 改造文件清单与潜在漏改提示。
- `auth/unified-auth-rebuild-file-map.md`：补充 Review 问题与解决方案清单（不做兼容）。
- `auth/unified-auth-rebuild-file-map.md`：补充调研结论（www access JWT、CLI/JWKS/session 复核）。
- `auth/unified-auth-rebuild-file-map.md`：补充最佳实践决策（www 主战场、删除 CurrentSession、JWKS 接入范围）。
- `auth/unified-auth-rebuild-file-map.md`：标注已落地项（Origin 校验、Expo client、CurrentSession 删除）。
- `auth/unified-auth-rebuild-file-map.md`：补充 Expo 插件类型推断修复记录（显式 Auth 类型）。
- `auth/unified-auth-rebuild-plan.md`：调整 anyhunt.app 为 C 端主战场并完成 www 对齐事项。
- `auth/unified-auth-rebuild-plan.md`：补充执行结果与清理项记录。
- `auth/unified-auth-rebuild-plan.md`：补充 `test:e2e` 与 `pnpm test` 验证记录。
- `adr/adr-0002-agent-runtime-control-plane.md`：新增 Agent Runtime 控制面 ADR（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 read 域覆盖文件工具 + 完整输出系统打开 + 复用 confirmation 组件（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 Doom Loop `always` 仅会话内有效（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充截断展示入口要求（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充审计字段与落地位置（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充审计日志格式（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充全权限静默记录（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 Agent/全权限模式切换与审批最小化（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：配置层与规则持久化简化为用户级（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：修正策略基线文本与 Doom Loop 列表格式（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充配置格式、规则匹配与审计落地规范（2026-01-24）。
- `auth/unified-auth-rebuild-file-map.md`：补充 Mobile refresh 网络异常修复与 `X-App-Platform` 传递范围结论。
