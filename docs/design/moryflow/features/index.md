---
title: Moryflow Features 索引
date: 2026-03-05
scope: docs/design/moryflow/features
status: active
---

# Moryflow Features

## 摘要

- `chat-input-and-chat-pane.md`：输入框重构与任务面板交互规范（合并版）。

## 详细方案

- `moryflow-pc-menubar-quick-chat-plan.md`：Moryflow PC macOS 菜单栏常驻 + Quick Chat 居中浮层确认方案（仅保留确认版单方案：左键快速对话、右键四项菜单、收到消息 badge、窗口关闭默认隐藏；Step 1~6 已执行并通过 `@moryflow/pc` typecheck + unit tests，completed）。
- `moryflow-pc-telegram-integration-architecture.md`：Moryflow PC Telegram 接入与共享包抽离一体化方案（OpenClaw 对标，Bot API only；已完成 `sendMessageDraft` 绑定修复、`/start`/`/new` command menu 注册、TG->Chat 面板同步回写、workspace 绝对路径防漂移、TG 预览流式“非阻塞合并发送”性能收口，以及 Chat 面板 `chat:message-event` 实时同步重构，completed）。
- `moryflow-pc-telegram-c-plus-conversation-routing-plan.md`：Telegram C+ 会话路由重构方案与执行记录（根治“未找到对应的对话”，引入 `/start` 幂等建连与 `/new` 强制新会话，completed）。
- `moryflow-pc-telegram-home-agent-entry-plan.md`：Moryflow PC Home Tab 独立 Agent 模块方案（`Agent` 与 Skills 同级，点击后右侧直出 Telegram 页面；Settings 内 Telegram 分区已移除，completed）。
- `moryflow-pc-server-google-sign-in-plan.md`：Moryflow PC + Server Google 登录接入方案（系统浏览器 + OAuth 回调桥接 + Token-first 交换；2026-03-04 已完成 `state_mismatch` 根因修复，并补齐 `start/check` 启动预检以实现 fail-fast，completed）。
- `pc-skills-builtin-online-sync-plan.md`：Moryflow PC 内置 skills 扩展与在线同步方案（本地基线 + 启动逐项在线检查 + 自动覆盖更新，draft）。
- `moryflow-agent-runtime-tool-simplification-plan.md`：Moryflow Agent Runtime Tool 精简改造方案（Bash-First，含 vercel-labs/bash-tool 代码级对照与 Adopt/Drop 决策；三项根治收口已完成：审计路径安全、审计脱敏、subagent 单能力面，completed）。
- `moryflow-agent-tool-inventory-accuracy-fix-plan.md`：Agent Prompt 工具清单准确性修复（改为运行时注入口径，补齐跨端差异与回归测试，completed）。
- `editor-selection-chat-reference-unification-plan.md`：Moryflow PC 选中文本 AI 入口收敛方案（下线 Improve + 统一右侧 Chat 引用；已补充 2026-03-03 胶囊样式统一闭环与回归验证，draft）。
- `moryflow-pc-general-agent-prompt-new-baseline-plan.md`：Moryflow PC 通用 Agent Prompt 新基线方案（个性化指令；移除 Prompt/参数外露，融合 Manus 结构与 soul 风格约束，draft）。
- `chat-tool-reasoning-consumer-ui-plan.md`：Chat 消息流 Tool/Reasoning C 端化统一方案（Moryflow + Anyhunt，单版本，含多端调研统计、执行计划与 PR review 问题闭环记录，覆盖 Mobile 开合语义与 Admin i18n 补漏）。
- `openrouter-top20-paid-models-plan.md`：Moryflow PC OpenRouter 周榜付费前 20 模型深度调研与根因级整改计划（2026-03-01，含能力矩阵与实施验收）。
- `app-modes-agent-sites-nav-hierarchy.md`：Sidebar 导航分层与状态语义（已合并导航摘要）。
- `sidebar-home-chat-top-layout-rebuild-plan.md`：PC 侧边栏 Home/Chat 顶部切换重构方案（已实施，含执行记录）。
- `moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md`：Home/Chat Tab 布局评估与重构建议（状态模型判别联合 + 单一布局派生 + modules registry + keep-alive 泛化已落地，completed）。
- `global-search-files-threads-fulltext-plan.md`：PC 全局搜索重构（Files + Threads 全文检索，draft）。
- `cloud-sync-unified-implementation.md`：云同步现状、流程与冲突策略（已合并功能摘要）。
- `site-publish-tech.md`：发布链路与模板系统设计（合并版）。
- `speech-to-text-tech.md`：语音转写技术方案。
- `credits-system-tech.md`：积分系统技术方案。
- `mobile-design-system-proposal.md`：移动端设计系统方案。
