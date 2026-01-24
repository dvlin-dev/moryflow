<!--
[INPUT]: 本目录下的 Markdown 文档与架构说明
[OUTPUT]: 统一的文档组织方式与写作约束（供人类与 AI 协作）
[POS]: docs/ 的写作约束与组织规范（索引入口在 docs/index.md）

[PROTOCOL]: 本文件变更时，需同步更新根 CLAUDE.md 的文档索引（若影响全局）。
-->

# docs/ 目录指南

> 最近更新：2026-01-26（Moryflow PC preload CJS 兼容修复）

> 本目录存放面向开发与协作的项目文档（非产品对外文档站点实现）。

> 说明：对外文档站点是**独立项目**（不与官网耦合）：
>
> - Anyhunt Dev Docs：`apps/anyhunt/docs` → `docs.anyhunt.app`
> - Moryflow Docs：`apps/moryflow/docs` → `docs.moryflow.com`

## 写作约束

- 开发者相关内容使用中文；用户可见文案（若出现）使用英文。
- 以“可执行”为目标：域名、路由、职责边界、流程与配置要能落地。
- Markdown 文档建议包含 YAML Frontmatter（`title/date/scope/status`），便于后续文档站或索引生成。
- Anyhunt Dev API 域名统一使用 `server.anyhunt.app`（不再使用 `anyhunt.app` 作为 API 域名）。
- 排障/实验类记录优先放在 `docs/research/`，并在 `docs/index.md` 增加索引项，便于持续跟踪与后续归档。
- Research 文档更新时，在 `docs/index.md` 标注更新日期，便于协作追踪。
- Research 文档如更新测试验证结果或告警状态，同步刷新索引备注（例如 warnings 清理情况）。
- 进度类 Research 文档完成代码核对后，需要在正文标注核对日期，并更新文档版本与更新日志。

## 目录结构

- `docs/index.md`：统一入口索引（新增/移动文档时首先更新这里）。
- `docs/code-review/`：全量 Code Review 的模块拆分、进度与结论索引（每个模块单独一份 review 文档）。
- `docs/architecture/`：系统级架构决策与不变量（"最终真相"）；含 `adr/` 决策记录与 `auth/` 拆分文档。
- `docs/guides/`：开发指南（如何做、最佳实践、可复用做法）。
- `docs/runbooks/`：运行手册（部署/排障/操作清单，照做即可）。
- `docs/products/`：产品线内的内部方案（Anyhunt Dev / Moryflow）。
- 归档文档已移除目录（如需归档再新建并补充索引）。
- `docs/skill/`：Codex Skills 相关说明（Prompt/技能元信息），用于本仓库内的协作与对齐。

## 最近更新

- Moryflow PC Code Review：修复 preload 在 sandbox 下的 ESM 兼容问题（2026-01-26）
- Moryflow PC Code Review：补齐 React 单测稳定性（i18n mock + React 版本对齐）（2026-01-26）
- Moryflow PC Code Review：修复完成（外链/导航安全、sandbox、英文文案、Hugeicons、hooks 单测、E2E 基线）（2026-01-25）
- Moryflow PC Code Review：`docs/code-review/moryflow-pc.md`（2026-01-24：review + 方案）
- Anyhunt Server API Key & Quota：修复完成（有效订阅 tier、扣减边界、退款/购买幂等、DTO 对齐）（2026-01-25）
- Anyhunt Server API Key & Quota Code Review：标记修复完成（2026-01-25）
- Anyhunt Server API Key & Quota Code Review：`docs/code-review/anyhunt-server-api-key-quota.md`（2026-01-25：review）
- Anyhunt Server Billing & Payment Code Review：`docs/code-review/anyhunt-server-billing-payment.md`（2026-01-25：修复完成）
- Auth 统一改造落地状态：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造执行记录：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth 统一改造文件清单：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造文件清单：问题全部修复/确认并标记完成（2026-01-25）
- Auth 统一改造 Review 问题与方案清单：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造调研结论：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造决策补充：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造：补充 Mobile refresh 网络异常修复与 `X-App-Platform` 传递范围结论：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造：补充 Expo 插件类型推断修复记录：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造：调整 anyhunt.app 为 C 端主战场并完成 www 对齐：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth 统一改造：补充 `test:e2e` 与 `pnpm test` 验证记录：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth JWKS 测试：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth 数据库重置记录：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth 环境变量核对：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth 环境变量域名对齐结论：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- 测试指南：补充 Console E2E 命令（2026-01-25）
- Auth 交互统一与数据库重置改造方案：标记完成并补充 JWKS 验签落地（2026-01-25）
- Anyhunt Server Auth & Session Code Review：`docs/code-review/anyhunt-server-auth.md`（2026-01-25：修复完成）
- Moryflow Publish/AI Proxy 修复完成（欠费门禁/断连取消/Publish 容错/SSE backpressure/参数透传）：`docs/code-review/moryflow-publish-vectorize-ai-proxy.md`（2026-01-23）
- Moryflow 发布站点约定：补充 `_meta.json` 解析/结构异常按 OFFLINE 处理：`docs/architecture/domains-and-deployment.md`（2026-01-23）
- Moryflow Server Auth/Quota/Payment Code Review：`docs/code-review/moryflow-server-auth-quota-payment.md`（2026-01-23：fix）
- Moryflow Vectorize 暂不处理（将由 Anyhunt Memox 替换）：`docs/code-review/index.md`（2026-01-23：status）
- Moryflow：更新 iOS（Expo+EAS）与 macOS（Electron/electron-builder）发布/签名 Runbooks：`docs/products/moryflow/runbooks/release/`（2026-01-22）
- Moryflow PC 自动更新（R2-only）Runbook：`docs/products/moryflow/runbooks/release/electron-auto-update-r2.md`（2026-01-22）
- 工程基线：删除 agents metadata 的无用字段（仅保留 name/version），避免 install 后 git tree 变脏：`docs/code-review/root-tooling.md`（2026-01-22）
- 工程基线 / Root Tooling 修复完成：`docs/code-review/root-tooling.md`（2026-01-23：fix）
- 工程基线 / Root Tooling Code Review：`docs/code-review/root-tooling.md`（2026-01-23：review）
- 清理历史归档文档并移除目录：`docs/index.md`（2026-01-23）
- 修正 Agents SDK 参考文档包名与文件命名：`docs/references/anyhunt-agents-sdk.md`（2026-01-23）
- 修正 Moryflow 同步方案的共享包引用：`docs/products/moryflow/research/sync-refactor-proposal.md`（2026-01-23）
- 清理缺失文档引用（message-list-ui-code-review）：`docs/index.md`（2026-01-22）
- 详细设计/方案文档修复：补齐 frontmatter、清理缺失索引、同步域名规划（2026-01-22）
- 详细设计/方案文档 Code Review：`docs/code-review/design-docs.md`（2026-01-22：review）
- deploy/infra 测试环境修复（healthcheck/健康轮询/容器名冲突）：`docs/code-review/deploy-infra.md`（2026-01-22：done）
- deploy/infra 测试环境 Code Review：`docs/code-review/deploy-infra.md`（2026-01-22：review）
- 清理 auth-client/旧拆包引用：`docs/runbooks/deploy/anyhunt-dokploy.md`、`docs/products/anyhunt-dev/migrations/fetchx-integration.md`（2026-01-23：runbook）
- 清理未使用的认证相关内容（备份哈希：`835853de3e01ba610fdf4d5c39644a4974395cb7`）
- 全量 Code Review 计划：按阶段重排模块清单并纳入详细设计审查：`docs/code-review/index.md`（2026-01-23：active）
- 全量 Code Review 计划：补充阶段顺序与执行步骤：`docs/code-review/index.md`（2026-01-23：active）
- 全量 Code Review 计划：调整执行顺序、补充核心前端清单与进度同步区：`docs/code-review/index.md`（2026-01-23：active）
- 全量 Code Review 计划：补充统一审查标准与前端性能规范：`docs/code-review/index.md`（2026-01-23：active）
- 全量 Code Review（模块拆分 + 优先级 + 进度索引）：`docs/code-review/index.md`（2026-01-21：active）
- 工程基线：同步 `pnpm-lock.yaml` 并验证 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`（2026-01-21：completed）
- 消息列表与输入框 UI 组件抽离方案（Moryflow/Anyhunt 统一）：`docs/architecture/ui-message-list-unification.md`（2026-01-21：completed，MessageList 已补齐）
- Console Agent Browser Chat：UIMessageChunk 流式分段（对齐 Moryflow/pc）：`docs/research/agent-browser-chat-streaming-uimessagechunk.md`（2026-01-21：draft）
- Anyhunt Server：Admin 动态配置 LLM Providers/Models（参考 Moryflow）：`docs/architecture/admin-llm-provider-config.md`（2026-01-20：draft）
- Anyhunt Server：LLM Admin 配置改造进度（Agent + Extract）：`docs/architecture/llm-admin-provider-rollout.md`（2026-01-20：draft）
- apps/anyhunt：大模型调用逻辑梳理（Agent / LLM / Embedding）：`docs/research/apps-anyhunt-llm-call-map.md`（2026-01-20：draft）
- Reader 顶部导航 + Explore Topics 专用页（已落地）：`docs/products/anyhunt-dev/features/explore-topics-revamp.md`（`/`→`/welcome`；`/explore` 两栏工作台；`/topic/*`、`/inbox/*` 状态驱动 URL；Welcome 支持后台配置）
- Admin：手动充值 Credits（已落地）：`docs/products/anyhunt-dev/features/admin-credits-and-entitlements.md`（可审计的 credits 充值；落 `QuotaTransaction(ADMIN_GRANT)` + `AdminAuditLog`）
- 免费用户每日赠送 100 Credits（方案）：`docs/products/anyhunt-dev/features/daily-free-credits.md`（对齐 Moryflow：daily bucket 用 Redis+TTL，消费优先级 daily→monthly→purchased）
- www Reader/Developer 双模块布局方案：`docs/products/anyhunt-dev/features/www-reader-and-developer-split.md`（Reader 内操作不跳页：登录/设置弹窗；Developer 端保持 Header/Footer）
- www Reader SRP 与 Props 收敛重构计划：`docs/products/anyhunt-dev/features/www-reader-srp-and-props-refactor.md`（分支视图用 ViewModel 收敛 Props，按域拆分 SRP 组件，保持现有懒加载与错误边界策略）
- Aiget → Anyhunt 全量品牌迁移（无历史兼容）：`docs/migrations/aiget-to-anyhunt.md`（域名/包名/环境变量/API Key 前缀/Prisma 迁移重置）
- Anyhunt Dokploy 多项目部署清单：`docs/runbooks/deploy/anyhunt-dokploy.md`（补充 `ADMIN_EMAILS` 管理员白名单与旧路径报错排查）
- Console Agent Browser Playground 设计方案（L2 Browser + L3 Agent）：`docs/research/console-agent-browser-playground-design.md`（2026-01-20：独立模块路径 `/agent-browser/*`）
- Agent：API Key 级别 LLM 策略 + 输出 Schema 入参收紧方案：`docs/research/agent-llm-policy-and-output-schema.md`（2026-01-20：draft）
- Console Fetchx 路由调整：`docs/products/anyhunt-dev/features/unified-auth-and-digest-architecture.md`（2026-01-20：更新为 `/fetchx/*`）
- Console API 版本化：`docs/research/console-agent-browser-playground-design.md`（2026-01-20：统一 `/api/v1/console/*`）
- Skill：`code-simplifier` 文档中文化：`docs/skill/code-simplifier.md`（2026-01-19）
