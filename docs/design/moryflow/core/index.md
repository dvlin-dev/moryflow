---
title: Moryflow Core 索引
date: 2026-03-08
scope: docs/design/moryflow/core
status: active
---

# Moryflow Core

## 摘要

- `system-boundaries-and-identity.md`：业务边界、域名、认证与发布站约束。
- `../../anyhunt/core/domains-and-deployment.md`：双业务线域名职责与三机部署拓扑（详细版）。
- `auth-sync-and-publish.md`：认证链路、云同步与站点发布核心约束。
- `ui-conversation-and-streaming.md`：对话流协议、Tool/Reasoning 可见性、轮次折叠与视口滚动语义。

## 详细规范

- `auth-and-tokens.md`：Token/refresh/Cookie 与平台约束。
- `auth-and-global-rate-limit-defense.md`：Auth 与全局限流防护方案。
- `frontend-engineering-baseline.md`：表单/渲染/图标/组件质量前端基线。
- `pc-permission-architecture.md`：PC 权限模型、审批协议与首次升级提醒的唯一事实源。
- `cloud-sync-architecture.md`：云同步协议、不变量、journal/recovery 与 outbox 边界。
- `pc-navigation-and-workspace-shell.md`：PC Sidebar、Modules、Home/Chat 与布局派生架构。
- `provider-integration-requirements.md`：Provider 清理与接入需求基线（背景/范围/验收）。
- `mcp-managed-runtime.md`：PC 端 MCP 受管安装/启动静默更新方案（默认内置 macOS Kit）。
- `agent-tasks-system.md`：轻量 session-scoped task 基线（单一 `task` 工具 + `ChatSessionSummary.taskState` 事实源）。
- `agent-runtime-control-plane-adr.md`：Compaction、Permission 与 Truncation 控制面 ADR。
- `harness-engineering-baseline.md`：Harness 分层、仓库契约、Agent 表面清单、回放/评审/园艺闭环与当前验证基线。
- `agents-tools-runtime-inventory-and-pruning.md`：`packages/agents-tools` 使用现状盘点与死 API 清理记录。
- `chat-stream-runtime-refactor.md`：PC 对话流 runtime 重构与当前基线。
- `ui-message-list-following-mode.md`：Following 模式与滚动交互规范。
- `thinking-unified-rebuild.md`：Thinking 统一重构（OpenCode 对齐）方案。
- `model-bank-rebuild.md`：Model Bank 单一事实源重构方案。
