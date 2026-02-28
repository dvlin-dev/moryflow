---
title: Agent 与 Agent Browser 交互规范
date: 2026-01-25
scope: apps/anyhunt/server/src/agent, apps/anyhunt/server/src/browser
status: active
---

<!--
[INPUT]: agent/tools/browser-tools.ts + browser/ports + action schemas
[OUTPUT]: Agent 交互能力清单 + 推荐交互流程
[POS]: Anyhunt Dev 功能文档（Agent Browser）
-->

# Agent 与 Agent Browser 交互规范

## 交互边界

- Agent 仅通过 `BrowserAgentPort` 与工具集交互，**禁止**直接依赖 Playwright 类型。
- Session 由 Agent 侧上下文统一管理（`getSessionId()`），工具调用只关心 sessionId。

## 工具列表（当前可用）

| Tool                   | 说明                                             | 适用场景           |
| ---------------------- | ------------------------------------------------ | ------------------ |
| `browser_open`         | 打开 URL（含 SSRF 校验）                         | 进入目标页面       |
| `browser_snapshot`     | 获取可访问性快照与 `@ref`                        | 获取可交互元素引用 |
| `web_search`           | 搜索并返回快照                                   | 信息检索流程       |
| `browser_action`       | 执行任意动作（语义定位、下载、PDF、evaluate 等） | 高级操作           |
| `browser_action_batch` | 批量动作                                         | 降低往返/减少延迟  |

> 高级动作与参数以 `ActionSchema` 为准；批量动作以 `ActionBatchSchema` 为准。

## 推荐交互流程（最小闭环）

1. `browser_open` 打开目标 URL。
2. `browser_snapshot` 获取页面结构与 `@ref`。
3. 使用 `browser_action` / `browser_action_batch` 执行操作。
4. 操作后再次 `browser_snapshot` 获取最新页面状态。
5. 批量动作场景优先使用 `browser_action_batch`。

## 关键能力说明

- **语义定位器**：支持 role/text/label/placeholder/alt/title/testId（可减少 CSS 选择器依赖）。
- **错误建议**：`ActionResponse` 返回 `suggestion` 时，应优先按建议重试（如 wait/loadState）。
- **批量动作**：`stopOnError` 默认为 true；建议把强相关的连续动作合并，失败时减少回滚复杂度。
- **文件上传**：`upload` 动作仅接受 Base64 payload（禁止传服务器本地路径）。

## 限制与非目标

- Diagnostics/Streaming/Profile 等 **不对 Agent 直接暴露**，仅用于 Console 运维/调试。
- SSRF 与私网访问规则强制生效，Agent 不可绕过。

## 版本与兼容策略（当前）

- **不考虑历史兼容性**：旧的 prompt/工具名/参数形式不再保证可用，必须使用本文件的工具清单与参数定义。
- **单一数据源**：参数与响应以 `ActionSchema` / `ActionBatchSchema` 为唯一准则，禁止自定义字段透传。
- **效率优先**：强相关动作一律合并为 `browser_action_batch`，并优先使用语义定位器。
