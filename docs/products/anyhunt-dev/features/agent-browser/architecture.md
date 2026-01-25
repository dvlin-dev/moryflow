---
title: Anyhunt Dev Agent Browser 架构
date: 2026-01-25
scope: apps/anyhunt/server, apps/anyhunt/console
status: active
---

<!--
[INPUT]: anyhunt server browser 模块 + console playground + agent tools 现状
[OUTPUT]: 统一架构说明 + 能力清单 + 接口/配置索引
[POS]: Anyhunt Dev 功能文档（Agent Browser）
-->

# Anyhunt Dev Agent Browser 架构

## 定位

- 面向 Anyhunt Dev 的浏览器自动化能力集合：对外提供 L2 Browser API；对内为 Agent 提供工具与端口。
- 统一覆盖“会话管理 + 浏览器操作 + 诊断/观测 + 资源治理 + 安全约束”。

## 组件与职责

| 组件                | 位置                                                         | 职责                                         |
| ------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| BrowserPool         | `apps/anyhunt/server/src/browser/browser-pool.ts`            | Playwright 浏览器实例池、健康检查、资源回收  |
| SessionManager      | `apps/anyhunt/server/src/browser/session`                    | 会话/窗口/标签页生命周期、归属校验、过期清理 |
| SnapshotService     | `apps/anyhunt/server/src/browser/snapshot`                   | DOM 快照与 refs 映射、delta 生成             |
| ActionHandler       | `apps/anyhunt/server/src/browser/handlers`                   | 动作执行、语义定位、错误建议                 |
| NetworkInterceptor  | `apps/anyhunt/server/src/browser/network`                    | 拦截规则、headers、HAR 录制                  |
| Diagnostics         | `apps/anyhunt/server/src/browser/diagnostics`                | console/pageerror/trace 管理                 |
| Streaming           | `apps/anyhunt/server/src/browser/streaming`                  | WebSocket screencast + 输入注入              |
| Profile Persistence | `apps/anyhunt/server/src/browser/persistence`                | R2 Profile 持久化（cookies/localStorage 等） |
| CDP Connector       | `apps/anyhunt/server/src/browser/cdp`                        | 远程 CDP 连接（Browserbase/Browser Use）     |
| Console Playground  | `apps/anyhunt/console/src/features/agent-browser-playground` | 管理 UI + 调试 UI                            |
| Agent Tools         | `apps/anyhunt/server/src/agent/tools/browser-tools.ts`       | Agent 工具封装与 schema 约束                 |

## 端到端流程（简版）

1. **创建会话**：L2 API 创建 Browser Session（或 Agent 侧创建 session）。
2. **打开页面**：`openUrl` 通过 SSRF 校验后访问目标 URL。
3. **获取快照**：`snapshot` 返回 DOM 结构与 `@ref` 引用。
4. **执行动作**：`action` 或 `actionBatch` 执行交互，失败返回建议。
5. **诊断/观测**：按需获取 console/error/trace/HAR。
6. **关闭会话**：释放页面、上下文、流式连接与诊断状态。

## 能力清单（当前已落地）

- 会话：创建/关闭、状态查询、窗口/标签页管理。
- 快照：全量快照 + delta 模式。
- 动作：click/fill/type/press/scroll/wait/drag/upload/evaluate/pdf/download/highlight/getCount/getBoundingBox 等。
- 批量动作：`actionBatch` + `stopOnError`。
- 网络：拦截规则、全局/按 origin headers、请求历史、HAR 录制。
- 诊断：console/pageerror/trace（trace 可导出 base64）。
- Streaming：WebSocket screencast + mouse/keyboard/touch 注入。
- Profile：R2 持久化登录态（跨会话复用）。
- Provider：Browserbase / Browser Use 远程 CDP 连接。

## API 入口

- L2 Browser API：`/api/v1/browser/*`
- Console Playground 代理：`/api/v1/console/playground/browser/*`

## Console 页面分区（/agent-browser）

- `/agent-browser/overview`：闭环引导与入口
- `/agent-browser/browser`：Session + Snapshot/Action/Screenshot
- `/agent-browser/agent`：Agent 交互与流式对话
- `/agent-browser/network`：Intercept/Headers/History
- `/agent-browser/diagnostics`：Console/Errors/Trace/HAR
- `/agent-browser/storage`：Storage Export/Import/Clear
- `/agent-browser/profile`：Profile 保存/加载
- `/agent-browser/streaming`：Streaming 预览与输入注入
- `/agent-browser/cdp`：CDP 连接

## 安全与治理

- **SSRF 防护**：URL 必须通过 `UrlValidator` 校验；内网/元数据地址禁止访问。
- **会话归属**：所有会话操作强制 `userId` 校验。
- **CDP 白名单**：默认禁用 CDP；必须配置 `BROWSER_CDP_ALLOWED_HOSTS`。
- **Streaming Token**：临时 token + 过期清理；会话关闭时强制回收。
- **资源回收**：超时会话与空闲浏览器自动清理；trace 文件不落地泄露。

## 配置项（节选）

- Browser Pool：`BROWSER_POOL_SIZE`、`MAX_PAGES_PER_BROWSER`、`BROWSER_IDLE_TIMEOUT`
- CDP：`BROWSER_CDP_ALLOWED_HOSTS`、`BROWSER_CDP_ALLOW_PORT`、`BROWSER_CDP_ALLOW_PRIVATE_HOSTS`
- Streaming：`BROWSER_STREAM_PORT`、`BROWSER_STREAM_HOST`
- Provider：`BROWSERBASE_API_KEY`、`BROWSERBASE_PROJECT_ID`、`BROWSER_USE_API_KEY`
- Profile（R2）：`R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET_NAME`

## 测试与验证

- 单测覆盖：browser schema/streaming/profile/diagnostics 等核心逻辑
- 统一门禁：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`
