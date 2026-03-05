---
title: Moryflow Core 索引
date: 2026-03-03
scope: docs/design/moryflow/core
status: active
---

# Moryflow Core

## 摘要

- `system-boundaries-and-identity.md`：业务边界、域名、认证与发布站约束。
- `../../anyhunt/core/domains-and-deployment.md`：双业务线域名职责与三机部署拓扑（详细版）。
- `auth-sync-and-publish.md`：认证链路、云同步与站点发布核心约束。
- `ui-conversation-and-streaming.md`：对话流协议、消息滚动、thinking 与模型运行时约束。

## 详细规范

- `auth-and-tokens.md`：Token/refresh/Cookie 与平台约束。
- `auth-and-global-rate-limit-defense.md`：Auth 与全局限流防护方案。
- `frontend-engineering-baseline.md`：表单/渲染/图标/组件质量前端基线。
- `pc-permission-unification-plan.md`：PC 权限模型重写方案（ask/full_access + External Paths 授权清单）。
- `provider-integration-requirements.md`：Provider 清理与接入需求基线（背景/范围/验收）。
- `mcp-managed-runtime.md`：PC 端 MCP 受管安装/启动静默更新方案（默认内置 macOS Kit）。
- `agent-tasks-system.md`：Tasks 系统（替代 Plan）完整方案。
- `agent-runtime-control-plane-adr.md`：Compaction/Permission/Truncation 控制面 ADR（含 2026-03-03 Runtime/Tools 接口快照校准）。
- `chat-stream-runtime-refactor.md`：PC 对话流 runtime 重构与 follow-up 结论。
- `ui-message-list-following-mode.md`：Following 模式与滚动交互规范。
- `thinking-unified-rebuild.md`：Thinking 统一重构（OpenCode 对齐）方案。
- `model-bank-rebuild.md`：Model Bank 单一事实源重构方案（含 2026-03-03 registry/thinking/参数合同接口快照）。
- `permission-first-authorization-full-access-reminder.md`：默认 `ask` 下首次授权升级提示、会话内权限即时生效与审批幂等协议（`approved/already_processed`）收口方案。
- `pc-global-full-access-unrestricted-plan.md`：PC 权限最终方案（已完成）：全局模式开关、`full_access` 全开放（仅危险级 deny 拦截）、Ask 仅记住同类 allow（deny 仅本次），含实施进度与验证记录。
