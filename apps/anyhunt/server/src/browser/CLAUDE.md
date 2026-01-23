# Browser

> L2 Browser API + Agent ports（Playwright 封装层）

## Overview

Browser 模块负责 Playwright 浏览器池、会话管理、快照与动作执行，并通过 ports/facade 向 Agent 模块提供轻量接口，避免 Playwright 重类型进入 Agent 泛型推断。

## Responsibilities

- BrowserPool 管理（Chromium 实例池）
- 会话生命周期管理（SessionManager）
- CreateSession 上下文配置（viewport/userAgent/JS/HTTPS）
- 快照/动作执行（SnapshotService、ActionHandler）
- P2 扩展：CDP、网络拦截、会话持久化、增量快照
- Agent 端口：`BrowserAgentPortService`（禁止暴露 Playwright 类型）

## Constraints

- **Agent 侧只依赖 ports**：`BrowserAgentPort` 是唯一允许暴露给 agent 的接口
- **禁止透传 Playwright 类型** 到 agent/tools 或 agents-core 泛型
- **ApiKeyGuard 依赖**：Browser L2 API 使用 `ApiKeyGuard`，对应模块必须导入 `ApiKeyModule`，否则会导致 Nest 启动失败
- **SSRF 防护强制**：openUrl 必须通过 UrlValidator 校验；BrowserPool/NetworkInterceptor 负责拦截子请求
- **会话归属强校验**：所有 session 操作必须携带 `userId`，`SessionManager` 统一校验 owner
- **用户可见错误信息使用英文**
- **CreateSession 参数必须透传到 BrowserPool**，禁止硬编码上下文配置

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
| `persistence/`                  | 存储导入导出                          |

## Ports

```typescript
export interface BrowserAgentPort {
  createSession(...): Promise<BrowserAgentSession>;
  closeSession(sessionId: string): Promise<void>;
  openUrl(sessionId: string, input: OpenUrlInput): Promise<{ success: boolean; url: string; title: string | null }>;
  snapshot(sessionId: string, options?: Partial<SnapshotInput>): Promise<SnapshotResponse>;
  executeAction(sessionId: string, action: ActionInput): Promise<ActionResponse>;
  search(sessionId: string, query: string): Promise<BrowserAgentSearchResult>;
}
```

## Common Modification Scenarios

| Scenario            | Files to Modify                                      | Notes                                            |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| 新增 Agent 工具能力 | `ports/`, `handlers/`, `snapshot/`                   | 先在 ports 增加能力，再让 agent/tools 依赖 ports |
| 扩展动作类型        | `dto/action.schema.ts`, `handlers/action.handler.ts` | 需补齐 ActionInput/Response                      |
| 变更会话策略        | `session/`, `browser-pool.ts`                        | 避免影响 ports 语义                              |
