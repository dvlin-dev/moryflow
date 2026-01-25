---
title: PR-60 Agent Browser 改动 Code Review
date: 2026-01-25
scope: apps/anyhunt/server, apps/anyhunt/console, docs
status: resolved
---

<!--
[INPUT]: PR-60 变更文件清单（Agent/Browser/Console Playground/Docs）
[OUTPUT]: 可执行的 review 结论 + 修复清单 + 进度同步
[POS]: 本次 PR 级别 Code Review 记录
-->

# PR-60 Agent Browser 改动 Code Review

## 结论

已按最佳实践完成修复与补测，建议合并；无剩余高风险问题。

## 修复落地清单

- 下载路径安全与清理：`storeDownload=false` 不落地；统一清理临时文件；超限拒绝；文件名 `sanitize`；新增下载大小限制配置。
- 上传动作安全收敛：ActionSchema 改为 Base64 payload；上传大小限制；文件名清理；拒绝服务器本地路径。
- Streaming 边界：WebSocket 绑定 host；token 单次使用；每 Session 最大连接数；支持 wss。
- Session 状态去冗余：删除 `context/page/pages/activePageIndex`，以 `windows[activeWindowIndex]` 为单一数据源。
- 截图格式收敛：仅支持 png/jpeg，mimeType 按格式返回。
- Console SRP：streaming 逻辑抽离为 hook，降低主面板复杂度。

## 测试补充

- `action.schema.spec.ts`：上传 payload 校验。
- `action.handler.spec.ts`：文件名清理、base64 payload、超限拒绝。
- `stream.service.spec.ts`：ws/wss scheme。
- `session.manager.spec.ts`：会话结构更新。

## 关联文档同步

- `docs/products/anyhunt-dev/features/agent-browser/architecture.md`
- `docs/products/anyhunt-dev/features/agent-browser/agent-interaction.md`

## 剩余改进

- 暂无（本次 review 发现项已全部落地）。
