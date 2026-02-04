<!--
[INPUT]: 本目录下的 Markdown 文档与架构说明
[OUTPUT]: 统一的文档组织方式与写作约束（供人类与 AI 协作）
[POS]: docs/ 的写作约束与组织规范（索引入口在 docs/index.md）

[PROTOCOL]: 本文件变更时，需同步更新根 CLAUDE.md 的文档索引（若影响全局）。
-->

# docs/ 目录指南

> 最近更新：2026-02-04（TurnAnchor 滚动调研新增“无法向上滚动”问题记录）

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

- 调研：Moryflow PC TurnAnchor 滚动问题跟踪与方案：`docs/research/moryflow-pc-turn-anchor-scroll-tracking.md`（2026-02-04：active，新增“无法向上滚动”问题记录）
- Moryflow PC 消息列表交互复用改造方案：补充对齐 assistant-ui 的二次改造计划、强制改造原则、逐文件删除清单与执行顺序（`docs/architecture/ui-message-list-turn-anchor-adoption.md`，2026-02-03：proposal update）
- Anyhunt WWW 移动端底部导航方案（移动端优先 + 3 Tab（Inbox 优先） + 移动端不展示 Welcome + Notion 风格）：`docs/products/anyhunt-dev/anyhunt-www-mobile-bottom-nav.md`（2026-01-28：implemented）
- Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）：`docs/architecture/ui-message-list-turn-anchor-adoption.md`（2026-02-02：implemented，交互固定为 top 且去参数化）
- Anyhunt app/public/apikey 通道路由规范与迁移清单（含模块进度）：`docs/architecture/anyhunt-api-channel-routing.md`（2026-02-02：implemented）
- Moryflow PC 悬浮任务面板改造方案：补充悬停箭头/行态/详情展开示意（`docs/products/moryflow/features/chat-pane/task-hover-panel-redesign.md`，2026-02-02：proposal update）
- Moryflow PC 输入框改造方案（+ 菜单 / @ 引用 / 主按钮统一）：`docs/products/moryflow/features/chat-input/pc-prompt-input-plus-menu.md`（2026-01-28：proposal update，二级面板对齐到对应项）
- 图标库回退方案（Hugeicons → Lucide）：`docs/guides/frontend/icon-library-migration-lucide.md`（2026-01-27：implemented）
- Moryflow PC 输入框重构方案（执行级 + Notion 交互规范）：`docs/products/moryflow/features/chat-input/pc-prompt-input-refactor.md`（2026-01-27：proposal update）
- ADR-0002：补充外部化/Hook 示例（JSONC/Agent/Tool）（2026-01-30）
- ADR-0002：P2-7/P2-8 外部化与 Hook 落地完成（2026-01-29）
- ADR-0002：P1-5 模式切换落地完成（PC + Mobile）（2026-01-28）
- ADR-0002：示例文案统一为“待办”表述（2026-01-27）
- ADR-0002：P1-4 Doom Loop 落地完成（PC + Mobile）（2026-01-27）
- ADR-0002：补充 compaction 摘要输入裁剪规则（2026-01-27）
- ADR-0002：P1-3 会话压缩落地完成（PC + Mobile）（2026-01-26）
- ADR-0002：补充 Compaction“裁剪旧工具输出”示例（2026-01-26）
- ADR-0002：P0-2 权限系统落地完成（审批卡/JSONC/审计）（2026-01-26）
- ADR-0002：确认 P0-2 权限落地细节（审批卡位置、规则直接写 JSONC、Mobile 审计路径）（2026-01-26）
- Auth API Key 文档：更新明文存储与前端脱敏展示约束（2026-01-27）
- Moryflow Agent Tasks 系统方案（IPC + PC/Mobile UI + 执行清单完成 + 单元测试覆盖 + 子代理同步测试）：`docs/architecture/agent-tasks-system.md`（2026-01-25：completed）
- Anyhunt LLM Provider 对齐进度（AI SDK / Anthropic / Google）：`docs/architecture/anyhunt-llm-provider-alignment.md`（2026-01-27：done）
- Anyhunt Console 公共 API 化与 API Key 明文存储方案：改为公网 API + 明文 key 返回，前端脱敏（2026-02-01：active）
- Moryflow Agent Tasks 系统方案：修正 Mobile SQLite 打开方式（2026-01-25）
- API Client 统一封装方案（Anyhunt + Moryflow）：`docs/architecture/api-client-unification.md`（2026-01-26：draft）
- API Client 方案补充 React Query（Web/PC/移动端）与复用策略：`docs/architecture/api-client-unification.md`（2026-01-26）
- API Client 方案统一响应为 raw JSON + RFC7807（含一次性执行计划）：`docs/architecture/api-client-unification.md`（2026-01-26）
- API Client 方案删除 envelope 过渡适配，明确不做历史兼容：`docs/architecture/api-client-unification.md`（2026-01-26）
- API Client 方案清理 envelope 相关内容：`docs/architecture/api-client-unification.md`（2026-01-26）
- API Client 方案补充 requestId 约定与校验错误示例：`docs/architecture/api-client-unification.md`（2026-01-26）
- API Client 方案补充 errors 数组原因与前端展示建议：`docs/architecture/api-client-unification.md`（2026-01-26）
- Moryflow Agent Tasks 系统方案（IPC + PC/Mobile UI + 执行清单完成 + 单元测试覆盖 + 子代理同步测试）：`docs/architecture/agent-tasks-system.md`（2026-01-25：completed）
- Moryflow Agent Tasks 系统方案：修正 Mobile SQLite 打开方式（2026-01-25）
- Auth access token 本地存储方案（Zustand + Persist）：`docs/architecture/auth/access-token-storage-plan.md`（2026-01-25：draft）
- Auth access token 设备端方案补充（PC/移动端安全存储 + Device refresh）：`docs/architecture/auth/access-token-storage-plan.md`（2026-01-25）
- Moryflow PC/Mobile Access Token 持久化升级方案：`docs/architecture/auth/moryflow-pc-mobile-access-token-upgrade.md`（2026-01-25：draft）
- Moryflow PC/Mobile Access Token 升级方案明确决策与执行清单：`docs/architecture/auth/moryflow-pc-mobile-access-token-upgrade.md`（2026-01-25）
- Moryflow Cloud Sync Code Review：`docs/code-review/moryflow-cloud-sync.md`（2026-01-25：review）
- Moryflow 云同步文档收敛为单一方案（统一技术方案/绑定/实施现状）：`docs/products/moryflow/features/cloud-sync/unified-implementation.md`（2026-01-25）
- ADR-0002：P0-1 工具输出截断落地进度更新（2026-01-25）
- ADR-0002：系统提示词参数改为高级可选覆盖（默认使用模型默认值）（2026-01-26）
- ADR-0002：补充系统提示词/参数自定义（默认/自定义、参数范围、禁用时间占位符）（2026-01-26）
- ADR-0002：合并 OpenCode 对标与落地清单，删除独立对标文档（2026-01-26）
- ADR-0002：补充范围与实施原则，明确聊天消息内打开文件（2026-01-24）
- ADR-0002：补充 read 域覆盖文件工具 + 完整输出系统打开 + 复用 confirmation 组件（2026-01-24）
- ADR-0002：补充 Doom Loop `always` 仅会话内有效（2026-01-24）
- Agent Browser 文档收敛（架构 + Agent 交互）：`docs/products/anyhunt-dev/features/agent-browser/architecture.md`（2026-01-25，Agent 交互按最新策略重写）
- PR-60 Agent Browser 改动 Code Review：`docs/code-review/anyhunt-server-agent-browser-pr60.md`（2026-01-25：修复完成）
- Anyhunt Server Agent/LLM/Embedding Code Review：`docs/code-review/anyhunt-server-agent-llm.md`（2026-01-26：修复完成；EmbeddingService 保留确认）
- Anyhunt Server Browser Code Review：`docs/code-review/anyhunt-server-browser.md`（2026-01-26：修复完成）
- Anyhunt Server Prisma/迁移/多数据库边界 Code Review：`docs/code-review/anyhunt-server-prisma.md`（2026-01-26：review 完成）
- Anyhunt Server Scraper/Crawler/Extract/Map Code Review：`docs/code-review/anyhunt-server-fetchx-core.md`（2026-01-26：修复完成）
- Anyhunt Server SSRF & Network Isolation Code Review：`docs/code-review/anyhunt-server-ssrf-sandbox.md`（2026-01-26：修复完成）
- 全量 Code Review 计划：packages/agents\* 范围调整（迁移至 `@openai/agents-core`）`docs/code-review/index.md`（2026-01-25）
- 全量 Code Review 计划：进度同步区记录 packages-types-api-config（2026-01-26）
- packages/types + packages/api + packages/config Code Review：`docs/code-review/packages-types-api-config.md`（2026-01-26：修复完成）
- Moryflow PC Code Review：修复 preload 在 sandbox 下的 ESM 兼容问题（2026-01-26）
- Moryflow PC Code Review：补齐 React 单测稳定性（i18n mock + React 版本对齐）（2026-01-26）
- Moryflow PC Code Review：修复完成（外链/导航安全、sandbox、英文文案、Lucide、hooks 单测、E2E 基线）（2026-01-25）
- ADR：Agent Runtime 控制面（Compaction/Permission/Truncation）：`docs/architecture/adr/adr-0002-agent-runtime-control-plane.md`（2026-01-24）
- ADR-0002：补充截断展示入口要求（2026-01-24）
- ADR-0002：补充 Agent/全权限模式切换与审批最小化（2026-01-24）
- ADR-0002：配置层与规则持久化简化为用户级（2026-01-24）
- ADR-0002：补充全权限静默记录（2026-01-24）
- ADR-0002：补充审计字段与落地位置（2026-01-24）
- ADR-0002：补充审计日志格式（2026-01-24）
- ADR-0002：修正策略基线文本与 Doom Loop 列表格式（2026-01-24）
- ADR-0002：补充配置格式、规则匹配与审计落地规范（2026-01-24）
- Anyhunt Server Memox Core：对标 Mem0 改造计划更新（实施进度同步 + Filters DSL + R2 导出 + Token 认证一致）（2026-01-24）
- Auth 域名与路由：Memox API 路径对齐（2026-01-24）
- Anyhunt Server Memox Core Code Review：`docs/code-review/anyhunt-server-memox-core.md`（2026-01-24：review 完成）
- Anyhunt Server Queue/异步一致性 Code Review：`docs/code-review/anyhunt-server-queue.md`（2026-01-24：修复完成）
- tooling/\* Code Review：`docs/code-review/tooling-config.md`（2026-01-24：修复完成）
- packages/agents\* Code Review：`docs/code-review/packages-agents.md`（2026-01-24：修复完成）
- OpenAI Agents SDK RN 兼容性调研（仅 Core 兼容）：`docs/research/openai-agents-react-native-compatibility.md`（2026-01-24：补充 moryflow/mobile 配置）
- AI SDK 版本统一调研（现状 + 最新版本 + 兼容性）：`docs/research/ai-sdk-version-audit.md`（2026-01-24：draft）
- 全量 Code Review 计划：进度同步区记录 packages-embed-i18n（2026-01-24）
- packages/embed & packages/i18n Code Review：`docs/code-review/packages-embed-i18n.md`（2026-01-24：修复完成）
- packages/ui Code Review：`docs/code-review/packages-ui.md`（2026-01-24：修复完成）
- Moryflow Admin/WWW/Site Template Code Review：`docs/code-review/moryflow-web-surface.md`（2026-01-24：修复完成）
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
- OpenAI Agents 迁移与 RN shim 方案：`docs/research/openai-agents-react-native-compatibility.md`（2026-01-26）
- AI SDK 版本统一记录：`docs/research/ai-sdk-version-audit.md`（2026-01-26）
- 移除本地 Agents SDK 参考文档，改用官方文档（2026-01-26）
- 修正 Moryflow 同步方案的共享包引用：`docs/products/moryflow/research/sync-refactor-proposal.md`（2026-01-23）
- 清理缺失文档引用（message-list-ui-code-review）：`docs/index.md`（2026-01-22）
- 详细设计/方案文档修复：补齐 frontmatter、清理缺失索引、同步域名规划（2026-01-22）
- 详细设计/方案文档 Code Review：`docs/code-review/design-docs.md`（2026-01-25：review）
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
- Agent Browser 交互规范（Agent Tools + 交互流程）：`docs/products/anyhunt-dev/features/agent-browser/agent-interaction.md`（2026-01-25）
- Anyhunt Server：Admin 动态配置 LLM Providers/Models（参考 Moryflow）：`docs/architecture/admin-llm-provider-config.md`（2026-01-20：draft）
- Anyhunt Server：LLM Admin 配置改造进度（Agent + Extract）：`docs/architecture/llm-admin-provider-rollout.md`（2026-01-20：draft）
- apps/anyhunt：大模型调用逻辑梳理（Agent / LLM / Embedding）：`docs/research/apps-anyhunt-llm-call-map.md`（2026-01-26：draft）
- Reader 顶部导航 + Explore Topics 专用页（已落地）：`docs/products/anyhunt-dev/features/explore-topics-revamp.md`（`/`→`/welcome`；`/explore` 两栏工作台；`/topic/*`、`/inbox/*` 状态驱动 URL；Welcome 支持后台配置）
- Admin：手动充值 Credits（已落地）：`docs/products/anyhunt-dev/features/admin-credits-and-entitlements.md`（可审计的 credits 充值；落 `QuotaTransaction(ADMIN_GRANT)` + `AdminAuditLog`）
- 免费用户每日赠送 100 Credits（方案）：`docs/products/anyhunt-dev/features/daily-free-credits.md`（对齐 Moryflow：daily bucket 用 Redis+TTL，消费优先级 daily→monthly→purchased）
- www Reader/Developer 双模块布局方案：`docs/products/anyhunt-dev/features/www-reader-and-developer-split.md`（Reader 内操作不跳页：登录/设置弹窗；Developer 端保持 Header/Footer）
- www Reader SRP 与 Props 收敛重构计划：`docs/products/anyhunt-dev/features/www-reader-srp-and-props-refactor.md`（分支视图用 ViewModel 收敛 Props，按域拆分 SRP 组件，保持现有懒加载与错误边界策略）
- Aiget → Anyhunt 全量品牌迁移（无历史兼容）：`docs/migrations/aiget-to-anyhunt.md`（域名/包名/环境变量/API Key 前缀/Prisma 迁移重置）
- Anyhunt Dokploy 多项目部署清单：`docs/runbooks/deploy/anyhunt-dokploy.md`（补充 `ADMIN_EMAILS` 管理员白名单与旧路径报错排查）
- Console Agent Browser Playground：统一文档入口（`docs/products/anyhunt-dev/features/agent-browser/`）
- Agent：API Key 级别 LLM 策略 + 输出 Schema 入参收紧方案：`docs/research/agent-llm-policy-and-output-schema.md`（2026-01-20：draft）
- Console Fetchx 路由调整：`docs/products/anyhunt-dev/features/unified-auth-and-digest-architecture.md`（2026-01-20：更新为 `/fetchx/*`）
- Skill：`code-simplifier` 文档中文化：`docs/skill/code-simplifier.md`（2026-01-19）
