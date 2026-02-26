---
title: 文档索引（内部协作）
date: 2026-02-26
scope: monorepo
status: active
---

<!--
[INPUT]: 本仓库的内部协作文档（非对外 docs 站点内容）
[OUTPUT]: 统一入口索引 + “哪里写什么”的规则
[POS]: 根 docs/ 的入口；新增/移动文档时首先更新这里

[PROTOCOL]: 本文件变更需同步更新 `docs/CLAUDE.md`；若涉及全局约束/域名/架构入口，需同步更新根 `CLAUDE.md`。
-->

# docs/（内部协作）索引

本目录用于沉淀“可执行的工程真相”（架构决策、运行手册、开发指南、迁移方案）。对外文档站点是独立项目：

- Anyhunt Dev Docs：`apps/anyhunt/docs`
- Moryflow Docs：`apps/moryflow/docs`

## Architecture（系统级决策 / 不变量）

- 域名与部署架构（两条业务线）：`docs/architecture/domains-and-deployment.md`
- Auth 系统入口（两条业务线不互通）：`docs/architecture/auth.md`
- Auth 拆分文档：`docs/architecture/auth/`
- Auth 交互统一与数据库重置方案：`docs/architecture/auth/unified-auth-rebuild-plan.md`
- Auth 统一改造文件清单：`docs/architecture/auth/unified-auth-rebuild-file-map.md`
- 统一 Token Auth V2 改造方案（跨 Anyhunt + Moryflow，active）：`docs/architecture/auth/unified-token-auth-v2-plan.md`（2026-02-24：follow-up 已补充 1h 预刷新策略、线上 DB migrate deploy 记录与 Console/Admin/Moryflow Admin 网络失败回退策略）
- Auth 与全量请求统一改造计划（Zustand + Methods + Functional API Client，completed）：`docs/architecture/auth/auth-zustand-method-refactor-plan.md`（2026-02-24：完成 Step 1~13；客户端 + 服务端出站 HTTP + WebSocket 全链路统一；旧客户端范式清理完成；受影响包 typecheck/test 回归完成，`moryflow-mobile check:type` 保留既有基线问题记录）
- Moryflow Server 分层限流方案（Auth + 全局，Redis 存储，active）：`docs/architecture/auth/auth-and-global-rate-limit-defense-plan.md`（2026-02-25：Auth `60s/20` + 全局 `60s/300` 已落地，补齐 Better Auth `/**` 规则与 Redis Lua 原子限流实现对齐；Step 1~5 完成，Step 6 灰度待执行）
- Auth access token 本地存储方案（Zustand + Persist）：`docs/architecture/auth/access-token-storage-plan.md`
- API Client 统一封装方案（Anyhunt + Moryflow）：`docs/architecture/api-client-unification.md`
- Moryflow License 全量删除影响评估与执行清单（confirmed）：`docs/moryflow-license-removal-impact.md`（2026-02-25：零兼容、零迁移、一次性全删）
- Anyhunt Console 公共 API 化与 API Key 明文存储方案：`docs/architecture/anyhunt-console-public-api-key-plan.md`
- Anyhunt 统一日志系统方案（用户行为 + 错误排查 + IP 监控）：`docs/architecture/anyhunt-request-log-module-plan.md`
- Anyhunt app/public/apikey 通道路由规范（implemented）：`docs/architecture/anyhunt-api-channel-routing.md`
- Admin 动态配置 LLM Providers/Models（参考 Moryflow）：`docs/architecture/admin-llm-provider-config.md`
- Anyhunt LLM Provider 对齐进度（AI SDK / Anthropic / Google）：`docs/architecture/anyhunt-llm-provider-alignment.md`
- 消息列表与输入框 UI 组件抽离方案（Moryflow/Anyhunt 统一）：`docs/architecture/ui-message-list-unification.md`
- Moryflow PC 消息列表交互复用改造方案（Following 模式）：`docs/architecture/ui-message-list-turn-anchor-adoption.md`（更新：2026-02-08：Following 模式定稿；runStart 一次 smooth + `160ms` 入场动效；移除 `packages/ui/src/ai/assistant-ui` 目录）
- Moryflow Agent Tasks 系统方案（替代 Plan）：`docs/architecture/agent-tasks-system.md`
- Agent Skills（面向 C 端的“技能库”）接入方案：`docs/architecture/agent-skills.md`（更新：2026-02-11：增量方案已落地，固定推荐 3 项（Skill Creator / Find Skills / Article Illustrator）、预安装 2 项、`New skill` 复用 `Try Skill Creator`、`Try` 立即新建会话并生效）
- ADR（架构决策记录）：`docs/architecture/adr/`
- ADR-0002 Agent Runtime 控制面（Compaction/Permission/Truncation）：`docs/architecture/adr/adr-0002-agent-runtime-control-plane.md`

## Guides（开发指南 / 可复用做法）

- 本地开发环境：`docs/guides/dev-setup.md`
- 测试指南：`docs/guides/testing.md`
- Auth：流程与接口约定：`docs/guides/auth/auth-flows-and-endpoints.md`
- 前端表单：Zod + RHF 兼容：`docs/guides/frontend/forms-zod-rhf.md`
- 图标库回退方案（Hugeicons → Lucide）：`docs/guides/frontend/icon-library-migration-lucide.md`
- 前端富文本渲染：Streamdown（Markdown + 流式 Token 动画）：`docs/guides/frontend/streamdown.md`
- 前端组件设计质量索引（拆分与收敛准则）：`docs/guides/frontend/component-design-quality-index.md`（2026-02-25：补充“状态片段化 + `renderContentByState` + 禁止链式三元”）
- 开源拆分：Git Subtree 双向同步：`docs/guides/open-source-package-subtree.md`

## Runbooks（运维手册 / 照做即可）

- Anyhunt Dev（8c16g / Dokploy）：`docs/runbooks/deploy/anyhunt-dokploy.md`
- megaboxpro（1panel）反代路由：`docs/runbooks/deploy/megaboxpro-1panel-reverse-proxy.md`
- Moryflow（4c6g / docker compose）：`docs/runbooks/deploy/moryflow-compose.md`
- Moryflow PC Auth 连接关闭排障：`docs/runbooks/troubleshooting/moryflow-pc-auth-refresh-connection-closed.md`（2026-02-25：补充 `/api/v1` 全量统一进度（Auth + 业务 + webhook）；新增 transport `raw/stream` 语义修复、server-http-client fetch 绑定修复与全仓 L2 校验记录）

## Migrations（迁移方案 / 一次性执行）

- Aiget → Anyhunt 全量品牌迁移（无历史兼容）：`docs/migrations/aiget-to-anyhunt.md`

## Products（产品线内的内部方案）

- Anyhunt Dev
  - 入口：`docs/products/anyhunt-dev/index.md`
  - Anyhunt WWW 移动端底部导航方案（implemented）：`docs/products/anyhunt-dev/anyhunt-www-mobile-bottom-nav.md`
  - Reader 顶部导航 + Explore Topics 专用页（提案）：`docs/products/anyhunt-dev/features/explore-topics-revamp.md`
  - Admin：手动充值 Credits（已落地）：`docs/products/anyhunt-dev/features/admin-credits-and-entitlements.md`
  - Agent Browser 架构：`docs/products/anyhunt-dev/features/agent-browser/architecture.md`
  - Agent 与 Browser 交互规范：`docs/products/anyhunt-dev/features/agent-browser/agent-interaction.md`
  - Agent Browser 合规自动化与检测风险治理方案（已落地 Step 0~7；2026-02-25 已修订"禁止伪装"约束）：`docs/products/anyhunt-dev/features/agent-browser/compliance-automation-and-detection-risk-plan.md`
  - Agent Browser Stealth 能力引入与改造方案（proposal）：`docs/products/anyhunt-dev/features/agent-browser/stealth-fork-gap-and-adoption-plan.md`
  - 免费用户每日赠送 100 Credits（方案）：`docs/products/anyhunt-dev/features/daily-free-credits.md`
  - www Reader/Developer 双模块布局方案：`docs/products/anyhunt-dev/features/www-reader-and-developer-split.md`
  - www Reader SRP 与 Props 收敛重构计划：`docs/products/anyhunt-dev/features/www-reader-srp-and-props-refactor.md`
- Moryflow：`docs/products/moryflow/`
  - 入口：`docs/products/moryflow/index.md`
  - 发布/签名 Runbooks：`docs/products/moryflow/runbooks/release/`
  - Moryflow PC 自动更新（R2-only）：`docs/products/moryflow/runbooks/release/electron-auto-update-r2.md`
  - 云同步（统一方案与现状）：`docs/products/moryflow/features/cloud-sync/unified-implementation.md`
  - PC 左侧 Sidebar 导航方案（Implicit Agent + Modules）：`docs/products/moryflow/features/app-modes/agent-sites-nav-hierarchy.md`（2026-02-10：implemented）
  - PC App Modes 方案（Legacy: Chat / Workspace / Sites；superseded）：`docs/products/moryflow/features/app-modes/chat-and-workspace-modes.md`
  - PC 输入框重构方案（执行级 + Notion 交互规范）：`docs/products/moryflow/features/chat-input/pc-prompt-input-refactor.md`
  - PC 输入框改造方案（+ 菜单 / @ 引用 / 主按钮统一）：`docs/products/moryflow/features/chat-input/pc-prompt-input-plus-menu.md`（更新：2026-01-28：二级面板对齐到对应项）
  - PC 悬浮任务面板改造方案：`docs/products/moryflow/features/chat-pane/task-hover-panel-redesign.md`（更新：2026-02-02：悬停箭头/详情示意/行态说明）

## Code Review（全量评审计划与进度）

- 全量 Code Review（模块拆分 + 阶段顺序 + 统一审查标准 + 执行步骤清单 + 进度同步）：`docs/code-review/index.md`（更新：2026-02-26，Anyhunt Console 完成首个项目闭环：模块 D D-6 全量完成 + 模块 E 完成 + 项目复盘完成）
- 前端组件优化专项执行计划（按项目/按模块）：`docs/code-review/frontend-component-optimization-rollout.md`（更新：2026-02-26，active；Anyhunt Console 已完成 1/2/3 全流程闭环；已新增“对话启动前必读规范入口”；`anyhunt/docs` 与 `moryflow/docs` 已标记忽略）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（更新：2026-02-26，done：模块 A/B/C/D/E 与项目复盘全部完成）
- Moryflow Site Template Code Review：`docs/code-review/moryflow-site-template.md`（更新：2026-02-26，in_progress：模块 A/B/C 已完成，待项目复盘）
- Moryflow Cloud Sync Code Review：`docs/code-review/moryflow-cloud-sync.md`（更新：2026-01-25：review）
- 工程基线 / Root Tooling Code Review：`docs/code-review/root-tooling.md`（更新：2026-01-23，修复完成）
- Moryflow Server Auth/Quota/Payment Code Review：`docs/code-review/moryflow-server-auth-quota-payment.md`（更新：2026-01-23，修复完成）
- Anyhunt Server Auth & Session Code Review：`docs/code-review/anyhunt-server-auth.md`（更新：2026-02-02，路径对齐）
- Anyhunt Server API Key & Quota Code Review：`docs/code-review/anyhunt-server-api-key-quota.md`（更新：2026-01-25，修复完成）
- Anyhunt Server Billing & Payment Code Review：`docs/code-review/anyhunt-server-billing-payment.md`（更新：2026-01-25，修复完成）
- Anyhunt Server SSRF & Network Isolation Code Review：`docs/code-review/anyhunt-server-ssrf-sandbox.md`（更新：2026-01-26，修复完成）
- Anyhunt Server Queue/异步一致性 Code Review：`docs/code-review/anyhunt-server-queue.md`（更新：2026-01-24，修复完成）
- Anyhunt Server Prisma/迁移/多数据库边界 Code Review：`docs/code-review/anyhunt-server-prisma.md`（更新：2026-01-26，review 完成）
- Anyhunt Server Scraper/Crawler/Extract/Map Code Review：`docs/code-review/anyhunt-server-fetchx-core.md`（更新：2026-01-26，修复完成）
- Anyhunt Server Browser Code Review：`docs/code-review/anyhunt-server-browser.md`（更新：2026-01-26，修复完成）
- Anyhunt Server Agent/LLM/Embedding Code Review：`docs/code-review/anyhunt-server-agent-llm.md`（更新：2026-01-26，修复完成；EmbeddingService 保留确认）
- Anyhunt Server Memox Core 对标 Mem0 改造计划：`docs/code-review/anyhunt-server-memox-core.md`（更新：2026-01-24；实施进度同步；Filters DSL；R2 导出；Token 认证一致；Graph/Relation 公共 API 删除；entities 语义替换）
- Moryflow Publish/AI Proxy Code Review：`docs/code-review/moryflow-publish-vectorize-ai-proxy.md`（更新：2026-01-23，修复完成）
- Moryflow PC Code Review：`docs/code-review/moryflow-pc.md`（更新：2026-01-26，修复完成 + preload CJS）
- Moryflow Admin/WWW/Site Template Code Review：`docs/code-review/moryflow-web-surface.md`（更新：2026-01-24，修复完成）
- packages/ui Code Review：`docs/code-review/packages-ui.md`（更新：2026-01-24，修复完成）
- packages/embed & packages/i18n Code Review：`docs/code-review/packages-embed-i18n.md`（更新：2026-01-24，修复完成）
- packages/types + packages/api + packages/config Code Review：`docs/code-review/packages-types-api-config.md`（更新：2026-01-26，修复完成）
- packages/agents\* Code Review：`docs/code-review/packages-agents.md`（更新：2026-01-24，修复完成）
- tooling/\* Code Review：`docs/code-review/tooling-config.md`（更新：2026-01-24，修复完成）
- deploy/infra 测试环境 Code Review：`docs/code-review/deploy-infra.md`（更新：2026-01-22，修复完成）
- 详细设计/方案文档 Code Review：`docs/code-review/design-docs.md`（更新：2026-01-25，修复完成）
- Moryflow Vectorize 将由 Anyhunt Memox 替换：已标记暂不处理（详见 `docs/code-review/index.md`）

## Archived（归档）

- 归档目录已移除（如需重新归档再创建）。

## Research（调研 / 功能需求）

- 调研（已废弃方案，不再采用）：Moryflow PC TurnAnchor 滚动问题跟踪与记录：`docs/research/moryflow-pc-turn-anchor-scroll-tracking.md`（最后更新：2026-02-05）
- 方案：API Key 级别 LLM 策略 + 输出 Schema 入参收紧：`docs/research/agent-llm-policy-and-output-schema.md`（更新：2026-01-20）
- 梳理：apps/anyhunt 大模型调用逻辑（Agent / LLM / Embedding）：`docs/research/apps-anyhunt-llm-call-map.md`（更新：2026-01-26）
- 调研：OpenAI Agents SDK RN 兼容性（仅 Core 兼容）：`docs/research/openai-agents-react-native-compatibility.md`（更新：2026-01-26，补充 alias 与 shim 实装）
- 调研：AI SDK 版本统一（现状 + 最新版本 + 兼容性）：`docs/research/ai-sdk-version-audit.md`（更新：2026-01-26）
- 调研：OpenAI Agents JS 升级评估与重构建议（`0.4.3 -> 0.5.1`）：`docs/research/openai-agents-js-upgrade-impact-2026-02.md`（更新：2026-02-24，P0-1~P0-24 已回写；新增 Gemini function schema 兼容层（`enum` 缺失 `type` 递归补齐）、PC ABI 双态修复（pretest Node ABI / posttest Electron ABI）；`pnpm lint && pnpm typecheck && pnpm test:unit` 全通过）

## Skills（内部协作 / Prompt 规范）

- Code Simplifier：`docs/skill/code-simplifier.md`
