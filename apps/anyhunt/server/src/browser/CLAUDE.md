# Browser

> L2 Browser API + Agent ports（Playwright 封装层）

## Overview

Browser 模块负责 Playwright 浏览器池、会话管理、快照与动作执行，并通过 ports/facade 向 Agent 模块提供轻量接口，避免 Playwright 重类型进入 Agent 泛型推断。

## 最近更新

- 合规治理复审加固：`openUrl` 先校验会话归属再申请 host 配额；风险成功事件 `class='none'`；限流/节奏内存状态新增 TTL+容量清理；风险摘要无导航数据时成功率返回 `0` 且 TopN 仅统计风险事件
- 合规自动化风险治理（Step 0~7）落地：新增策略匹配、host 级速率/并发预算、动作节奏、导航分类重试、统一遥测与 `/session/:id/risk` 诊断接口
- Streaming token/stream 过期与会话清理，空闲时释放 CDP session
- Trace 结束后清理本地文件，不返回内部路径
- Tabs/Windows 索引参数使用 400 返回（ParseIntPipe + SessionOperationNotAllowedError）
- diagnostics/streaming/persistence/dto 导出补齐 Header/PROTOCOL 规范
- download/upload 安全收敛：上传仅允许 Base64 payload，下载限制大小并清理临时文件
- ActionHandler 补测：文件名清理/Base64 payload/超限拒绝；下载异常路径统一清理
- upload Base64 长度校验前置；Streaming token 单次使用与最大连接数补测

## Responsibilities

- BrowserPool 管理（Chromium 实例池）
- 会话生命周期管理（SessionManager）
- CreateSession 上下文配置（viewport/userAgent/JS/HTTPS/device/locale/timezone）
- 快照/动作执行（SnapshotService、ActionHandler）
- 语义定位/批量动作（role/text/label/placeholder/alt/title/testId + ActionBatch）
- P2 扩展：CDP、网络拦截、会话持久化、Profile、诊断、Streaming、增量快照
- 合规治理：policy（站点准入）+ runtime（动作节奏/导航重试）+ observability（风险遥测）
- Agent 端口：`BrowserAgentPortService`（禁止暴露 Playwright 类型）

## Constraints

- **Agent 侧只依赖 ports**：`BrowserAgentPort` 是唯一允许暴露给 agent 的接口
- **禁止透传 Playwright 类型** 到 agent/tools 或 agents-core 泛型
- **ApiKeyGuard 依赖**：Browser L2 API 使用 `ApiKeyGuard`，对应模块必须导入 `ApiKeyModule`，否则会导致 Nest 启动失败
- **SSRF 防护强制**：openUrl 必须通过 UrlValidator 校验；BrowserPool/NetworkInterceptor 负责拦截子请求
- **CDP 连接白名单**：必须配置 `BROWSER_CDP_ALLOWED_HOSTS` 才能启用 CDP；`port` 连接默认关闭，仅允许白名单内主机
- **CDP 私网策略**：默认禁止私网/本地主机，除非显式开启 `BROWSER_CDP_ALLOW_PRIVATE_HOSTS`
- **会话归属强校验**：所有 session 操作必须携带 `userId`，`SessionManager` 统一校验 owner
- **用户可见错误信息使用英文**
- **CreateSession 参数必须透传到 BrowserPool**，禁止硬编码上下文配置
- **网络拦截基于 Context**：新增窗口需注册 Context，确保拦截规则覆盖所有页面
- **Streaming 需显式配置**：`BROWSER_STREAM_PORT` 未设置时禁用流式预览
- **Streaming 安全**：必须绑定 `BROWSER_STREAM_HOST`；`BROWSER_STREAM_MAX_CLIENTS` 限制并发连接；`BROWSER_STREAM_SECURE` 控制 ws/wss
- **Profile 持久化依赖 R2 配置**：未配置 R2 时禁用 Profile 保存/加载
- **上传限制**：`upload` 动作仅接受 Base64 payload，禁止服务器本地路径
- **下载限制**：受 `BROWSER_DOWNLOAD_MAX_MB` 约束，超限直接失败并清理临时文件
- **合规边界**：仅允许“合规自动化 + 风险治理”，禁止伪装真人与绕过验证码/反爬机制

## File Structure

| File/Dir                        | Description                           |
| ------------------------------- | ------------------------------------- |
| `browser-pool.ts`               | Playwright 浏览器池                   |
| `browser-session.service.ts`    | L2 API 核心聚合服务                   |
| `browser-session.controller.ts` | L2 API HTTP 入口                      |
| `session/`                      | SessionManager + BrowserSession 结构  |
| `snapshot/`                     | 页面快照与 refs 管理                  |
| `handlers/`                     | 动作执行（click/fill/scroll/wait 等） |
| `ports/`                        | Agent 端口（BrowserAgentPort）        |
| `cdp/`                          | CDP 连接                              |
| `network/`                      | 网络拦截                              |
| `policy/`                       | 站点策略 + host 级速率/并发预算       |
| `runtime/`                      | 动作节奏与导航重试分类                |
| `observability/`                | 风险遥测契约与聚合摘要                |
| `diagnostics/`                  | console/pageerror/trace               |
| `streaming/`                    | WebSocket screencast + 输入注入       |
| `persistence/`                  | storage/profile 持久化                |

## Ports

```typescript
export interface BrowserAgentPort {
  createSession(...): Promise<BrowserAgentSession>;
  closeSession(sessionId: string): Promise<void>;
  openUrl(sessionId: string, input: OpenUrlInput): Promise<{ success: boolean; url: string; title: string | null }>;
  snapshot(sessionId: string, options?: Partial<SnapshotInput>): Promise<SnapshotResponse>;
  executeAction(sessionId: string, action: ActionInput): Promise<ActionResponse>;
  executeActionBatch(sessionId: string, input: ActionBatchInput): Promise<ActionBatchResponse>;
  search(sessionId: string, query: string): Promise<BrowserAgentSearchResult>;
}
```

## Common Modification Scenarios

| Scenario            | Files to Modify                                      | Notes                                            |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| 新增 Agent 工具能力 | `ports/`, `handlers/`, `snapshot/`                   | 先在 ports 增加能力，再让 agent/tools 依赖 ports |
| 扩展动作类型        | `dto/action.schema.ts`, `handlers/action.handler.ts` | 需补齐 ActionInput/Response                      |
| 变更会话策略        | `session/`, `browser-pool.ts`                        | 避免影响 ports 语义                              |
