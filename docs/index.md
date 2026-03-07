---
title: 文档索引（内部协作）
date: 2026-03-07
scope: monorepo
status: active
---

<!--
[INPUT]: 本仓库内部协作文档
[OUTPUT]: 精简、可执行、可维护的文档入口
[POS]: docs/ 总入口

[PROTOCOL]: 本文件变更需同步更新 `docs/CLAUDE.md`；若影响全局协作边界，需同步根 `CLAUDE.md`。
-->

# docs/（内部协作）索引

本目录采用“单目录设计库”模型：正文文档仅保留在 `docs/design/*`。
当前包含摘要与详细文档两层价值，不再只保留简版说明。

## 入口

- 重构执行计划：`docs/design-reorganization-plan.md`
- Design 总索引：`docs/design/index.md`
- Anyhunt Core：`docs/design/anyhunt/core/index.md`
- Anyhunt Features：`docs/design/anyhunt/features/index.md`
- Anyhunt Features（重点）：`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`（Memox 开放记忆与检索平台架构，也是 Memox Phase 2 唯一架构事实源：固定平台定位、二期冻结合同、当前仓库冻结实现事实、完成标准与剩余外部闸门）
- Anyhunt Runbooks：`docs/design/anyhunt/runbooks/index.md`
- Anyhunt Runbooks（重点）：`docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`（Memox Phase 2 唯一切流 runbook：固定 backfill / replay / drift check / cutover / rollback / 最终下线步骤、本地验证证据与剩余外部 gate）
- Anyhunt Runbooks（新增重点）：`docs/design/anyhunt/runbooks/memox-phase2-deep-code-review.md`（Memox Phase 2 合并前深度 code review 长期事实源：固定 review 分块、相关链路补读范围、真实 findings 与最终 merge readiness 判定）
- Moryflow Core：`docs/design/moryflow/core/index.md`
- Moryflow Core（更新）：`docs/design/moryflow/core/model-bank-rebuild.md`（新增 model-bank registry/thinking/参数合同接口快照，已按源码校准导入口径）
- Moryflow Core（更新）：`docs/design/moryflow/core/agent-runtime-control-plane-adr.md`（新增 agents-runtime/agents-tools 接口快照，修正过时路径引用）
- Moryflow Core（重点）：`docs/design/moryflow/core/pc-permission-unification-plan.md`（PC 权限模型重写方案）
- Moryflow Core（新增）：`docs/design/moryflow/core/permission-first-authorization-full-access-reminder.md`（首次授权单次升级提醒、权限即时切换与审批幂等协议收口方案）
- Moryflow Core（决策冻结，已完成）：`docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md`（全局权限开关 + Full Access 全开放，仅危险级 deny 拦截；Ask 仅记住同类 allow，deny 仅本次）
- Moryflow Core（新增）：`docs/design/moryflow/core/agents-tools-runtime-inventory-and-pruning-plan.md`（`agents-tools` 盘点与清理执行记录：已删除死 API，PC 装配命名对齐为 `createPcTools*`，并保留 Mobile 仍在用的文件/搜索工具）
- Moryflow Features：`docs/design/moryflow/features/index.md`
- Moryflow Features（新增）：`docs/design/moryflow/features/moryflow-agent-task-staged-code-review-plan.md`（Moryflow Agent task staged code review 总控：按 R1~R7 分块完成 shared packages、PC、Mobile、文档与最终全局复盘；当前已全部闭环并形成冻结复盘基线，completed）
- Moryflow Features（新增）：`docs/design/moryflow/features/moryflow-pc-menubar-quick-chat-plan.md`（Moryflow PC macOS 菜单栏常驻 + Quick Chat 居中浮层确认方案：移除未采用分支，固定右键四项菜单（无 TG 控制项）并保留消息 badge；Step 1~6 已执行并通过 `@moryflow/pc` typecheck + unit tests，completed）
- Moryflow Features（新增）：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`（Moryflow PC Telegram 接入与共享包抽离一体化方案，OpenClaw 对标，Bot API only；`sendMessageDraft` 流式消息适配、Telegram Proxy 显式配置 + `Test Proxy` 连通诊断、Chat 面板 `chat:message-event` 实时同步重构，以及 Agent 配置 C 端新手化 3 步任务流重构均已落地）
- Moryflow Features（新增）：`docs/design/moryflow/features/moryflow-pc-telegram-home-agent-entry-plan.md`（Home Tab 独立 Agent 模块：与 Skills 同级，点击后右侧直出 Telegram 页面；Settings 内 Telegram 分区已移除，已完成）
- Moryflow Features（新增）：`docs/design/moryflow/features/moryflow-pc-telegram-c-plus-conversation-routing-plan.md`（Telegram C+ 会话路由重构：根治“未找到对应的对话”，并引入 `/start` 幂等建连 + `/new` 强制新会话，已完成）
- Moryflow Features（新增）：`docs/design/moryflow/features/moryflow-agent-runtime-tool-simplification-plan.md`（Agent Runtime Tool 精简改造方案，Bash-First，含 vercel-labs/bash-tool 对照结论；三项根治收口已完成：审计路径安全、审计脱敏、subagent 单能力面）
- Moryflow Features（新增）：`docs/design/moryflow/features/moryflow-agent-task-lightweight-redesign-plan.md`（Agent task 工具轻量化重构方案冻结版：统一回到单一 `task`，事实源并入会话持久化层；删除 SQLite / DAG / audit event / detail view / 子代理强耦合；Task 1~6 已完成并通过 staged review，completed）
- Moryflow Features（新增）：`docs/design/moryflow/features/moryflow-agent-tool-inventory-accuracy-fix-plan.md`（Agent Prompt 工具清单准确性修复方案）
- Moryflow Features（新增）：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md`（PC + Server Google 登录接入方案：系统浏览器 OAuth + Token-first 交换码桥接；2026-03-04 已完成 `state_mismatch` 根因修复并补齐 `start/check` 启动预检，completed）
- Moryflow Features（新增）：`docs/design/moryflow/features/chat-tool-bash-card-redesign-plan.md`（Chat Tool 渲染重构方案：参考 Codex Bash 交互，统一两行 Header、固定输出滚动区、顶部模糊蒙版与右下角状态浮层，completed）
- Moryflow Features（新增）：`docs/design/moryflow/features/ai-round-auto-collapse-plan.md`（AI 轮次结束自动折叠：流式过程保持逐条可见，结束后仅展示“最后一条 assistant message 的最后一个结论 part”，同轮前置消息与前置 parts 自动折叠；2026-03-06 已将 round duration 起点收口为“首个 assistant 可见内容出现”）
- Moryflow Features（新增）：`docs/design/moryflow/features/chat-intent-driven-viewport-scroll-plan.md`（Chat 视口滚动语义重构：仅 `navigate-to-latest` 与 `stream-append-while-following` 允许移动视口，其余 inspection/layout 交互统一走 `preserve-anchor`；PC/Console/Admin 已完成接入与回归，completed）
- Moryflow Features（重点）：`docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md`（PC 选区 AI 入口收敛：下线 Improve，统一右侧 Chat 引用；补充胶囊样式统一闭环）
- Moryflow Features（新增）：`docs/design/moryflow/features/moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md`（Home/Chat Tab 布局评估与重构方案：判别联合导航状态 + 单一布局派生 + modules registry + keep-alive 泛化已完成）
- Moryflow Features（重点）：`docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md`（PC 内置 skills 扩展：基线打包 + 启动逐项在线检查 + 自动覆盖更新）
- Moryflow Features（更新）：`docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md`（Moryflow PC 云同步/协同最终审计与实施闭环：Step 0~6 已完成，协议已升级为 `server-authoritative action plan + receipt-only commit + apply journal + recovery`，并通过 `file lifecycle outbox` 与 Memox 搜索/写链解耦；legacy baseline 只保留显式 rollback backend，不再进入默认热路径）
- Moryflow Features（更新）：`docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md`（Moryflow PC 云同步/协同最终审计与实施闭环：Step 0~6 已完成，协议已升级为 `server-authoritative action plan + receipt-only commit + apply journal + recovery`，并通过 `file lifecycle outbox` 与 Memox 搜索/写链解耦；legacy baseline 只保留显式 rollback backend，不再进入默认热路径；根级 `lint/typecheck/test:unit` 与 sync internal metrics E2E 已通过，completed）
- Moryflow Runbooks（更新）：`docs/design/moryflow/runbooks/cloud-sync-operations.md`（云同步观测、恢复流程、内部 metrics 字段解释、上线闸门与 `SYNC_ACTION_SECRET` 运维约束）
- Moryflow Runbooks：`docs/design/moryflow/runbooks/index.md`

## 目录治理

- `docs/design` 之外不再保留正文目录。
- 删除文档前必须先回写有效事实。
- 禁止使用 `archive/` 作为文档保留机制。
- 同功能文档优先合并为单一事实源，避免并行维护。
- 允许在 `core/features/runbooks` 下保留有价值的详细历史结论文档（非冗余）。
- 涉及 Agent Prompt/产物生成的方案，必须明确“在用户 Vault 内优先选择合适目录落盘，禁止默认根目录直写”。
