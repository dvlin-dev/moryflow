---
title: Anyhunt Dev Agent Browser 架构
date: 2026-03-08
scope: apps/anyhunt/server + apps/anyhunt/console
status: active
---

<!--
[INPUT]: anyhunt server browser 模块、console playground 与 agent tools 现状
[OUTPUT]: Agent Browser 主架构事实源（模块边界 + API + Agent 合约）
[POS]: Anyhunt Features / Agent Browser

[PROTOCOL]: 仅在模块边界、会话模型、API 入口或 Agent 合约失真时更新；治理细节见 companion doc。
-->

# Anyhunt Dev Agent Browser 架构

## 1. 定位

1. 面向 Anyhunt Dev 的浏览器自动化能力集合。
2. 对外提供 L2 Browser API；对内为 Agent 提供 Browser 工具端口。
3. 统一覆盖会话管理、浏览器操作、诊断观测、资源治理与安全约束。

## 2. 冻结边界

1. 对外 API 基线：`/api/v1/browser/session/*`。
2. Agent 仅通过 `BrowserAgentPort` 与工具交互，禁止直接依赖 Playwright 类型。
3. Session 由 Agent 上下文统一管理；工具调用只关心 `sessionId`。
4. 风控、stealth、检测风险与 observability 统一查看 [agent-browser-governance.md](/Users/lin/.codex/worktrees/17b2/moryflow/docs/design/anyhunt/features/agent-browser-governance.md)。

## 3. 组件与职责

| 组件                | 位置                                                         | 职责                                             |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| BrowserPool         | `apps/anyhunt/server/src/browser/browser-pool.ts`            | Playwright 浏览器实例池、健康检查、资源回收      |
| SessionManager      | `apps/anyhunt/server/src/browser/session`                    | 会话 / 窗口 / 标签页生命周期、归属校验、过期清理 |
| SnapshotService     | `apps/anyhunt/server/src/browser/snapshot`                   | DOM 快照与 refs 映射、delta 生成                 |
| ActionHandler       | `apps/anyhunt/server/src/browser/handlers`                   | 动作执行、语义定位、错误建议                     |
| NetworkInterceptor  | `apps/anyhunt/server/src/browser/network`                    | 拦截规则、headers、HAR 录制                      |
| Diagnostics         | `apps/anyhunt/server/src/browser/diagnostics`                | console / pageerror / trace 管理                 |
| Streaming           | `apps/anyhunt/server/src/browser/streaming`                  | WebSocket screencast 与输入注入                  |
| Profile Persistence | `apps/anyhunt/server/src/browser/persistence`                | R2 Profile 持久化                                |
| CDP Connector       | `apps/anyhunt/server/src/browser/cdp`                        | 标准 CDP 连接（`wsEndpoint` / `port`）           |
| Console Playground  | `apps/anyhunt/console/src/features/agent-browser-playground` | 调试 UI 与运维 UI                                |
| Agent Tools         | `apps/anyhunt/server/src/agent/tools/browser-tools.ts`       | Agent 工具封装与 schema 约束                     |

## 4. Agent 合约

### 4.1 工具列表

| Tool                   | 说明                     | 适用场景           |
| ---------------------- | ------------------------ | ------------------ |
| `browser_open`         | 打开 URL（含 SSRF 校验） | 进入目标页面       |
| `browser_snapshot`     | 获取快照与 `@ref`        | 获取可交互元素引用 |
| `web_search`           | 搜索并返回快照           | 信息检索           |
| `browser_action`       | 执行单个动作             | 高级操作           |
| `browser_action_batch` | 批量动作                 | 降低往返与减少延迟 |

### 4.2 交互规则

1. 推荐最小闭环固定为：`browser_open -> browser_snapshot -> browser_action / batch -> browser_snapshot`。
2. 强相关动作优先使用 `browser_action_batch`。
3. 参数与响应以 `ActionSchema` / `ActionBatchSchema` 为唯一准则。
4. 文件上传只接受 Base64 payload，不接受服务器本地路径。
5. Diagnostics / Streaming / Profile 不对 Agent 直接暴露。

## 5. 端到端流程

1. 创建会话。
2. 打开页面。
3. 获取快照。
4. 执行动作。
5. 按需读取诊断 / 观测。
6. 关闭会话并回收资源。

## 6. Console 页面分区

1. `/agent-browser/overview`
2. `/agent-browser/browser`
3. `/agent-browser/agent`
4. `/agent-browser/network`
5. `/agent-browser/diagnostics`
6. `/agent-browser/storage`
7. `/agent-browser/profile`
8. `/agent-browser/streaming`
9. `/agent-browser/cdp`

## 7. 安全与资源约束

1. URL 必须通过 `UrlValidator` 校验，内网与元数据地址禁止访问。
2. 所有会话操作强制 `userId` 归属校验。
3. CDP 默认禁用，必须配置允许主机白名单。
4. Streaming Token 必须短期有效，并在会话关闭时强制回收。
5. 空闲浏览器、超时会话与临时 trace 文件都必须自动清理。

## 8. 当前验证基线

1. Browser schema、session、snapshot、action、streaming、profile、diagnostics 都需要单元回归。
2. 修改 Agent Browser API、session lifecycle、ActionSchema 或 BrowserAgentPort 时，按 L2 执行根级校验。
