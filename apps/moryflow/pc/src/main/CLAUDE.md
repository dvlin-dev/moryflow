# Main Process

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

PC 端 Electron 应用的主进程，负责系统级操作、文件访问、网络请求等。

## 职责

- 文件系统操作（读写、监听）
- Agent 运行时执行
- 云同步服务
- Ollama 本地模型服务
- 聊天会话持久化
- session metadata 驱动的 taskState 持久化与广播
- 窗口管理

## 约束

- 主进程是 Node.js 环境，可以访问系统 API
- 与渲染进程通过 IPC 通信
- 敏感操作（文件、网络）必须在主进程执行
- 长时间操作需考虑不阻塞主进程
- Desktop 凭据（membership token / Telegram secrets / agent-runtime secureStorage）统一使用 `storage/desktop-store.ts` + `electron-store` 本地文件持久化；主进程不再依赖 Keychain / `safeStorage`
- 外链打开统一经 `external-links` 协议校验：允许 `https`、允许 localhost 回环地址的 `http`（含 `localhost` 无协议前缀写法）
- 主窗口必须拦截 `will-navigate`/`will-redirect`，仅允许内部资源导航
- E2E 测试（`MORYFLOW_E2E=true`）禁止自动打开 DevTools
- E2E 测试可通过 `MORYFLOW_E2E_USER_DATA` 指定独立 userData 目录
- E2E 测试可通过 `MORYFLOW_E2E_RESET=true` 清理 Vault store（仅测试用）
- Vault store 与 pc-settings 在 E2E 下使用 `MORYFLOW_E2E_USER_DATA/stores`
- 线上验收类 E2E（配置了 `MORYFLOW_E2E_USER_DATA`）必须绕过 Electron 单实例锁；否则真实已登录桌面端会直接拦住生产验证 harness
- 云同步线上验收 harness 固定使用 `MORYFLOW_E2E_USER_DATA + MORYFLOW_VALIDATION_WORKSPACE`，并通过 `desktopAPI.cloudSync.*` 完成“触发链 + 采样链 + 结果链”三段式对账
- preload 构建需输出 CJS（sandbox 下 ESM preload 会报错）

## 成员清单

| 文件/目录                 | 类型 | 说明                                   |
| ------------------------- | ---- | -------------------------------------- |
| `index.ts`                | 入口 | 主进程入口                             |
| `app/`                    | 目录 | 应用生命周期、bootstrap 与 IPC 组合层  |
| `agent-runtime/`          | 目录 | Agent 运行时                           |
| `mcp-runtime/`            | 目录 | MCP stdio 受管安装/更新与可执行解析    |
| `agent-settings/`         | 目录 | Agent 设置管理                         |
| `chat/`                   | 目录 | 聊天服务                               |
| `chat-session-store/`     | 目录 | 聊天会话存储                           |
| `skills/`                 | 目录 | Skills 注册中心（内置基线 + 在线同步） |
| `membership/`             | 目录 | membership 状态、token、OAuth 与 auth  |
| `search-index/`           | 目录 | 全局搜索索引（Files + Threads，FTS）   |
| `cloud-sync/`             | 目录 | 云同步服务                             |
| `memory-indexing/`        | 目录 | Workspace Content 上传与 Memory 镜像   |
| `device-config/`          | 目录 | Sync 设备级身份配置                    |
| `workspace-meta/`         | 目录 | 本地工作区 marker 与稳定身份           |
| `workspace-profile/`      | 目录 | 当前账号对应的 workspace profile       |
| `workspace-doc-registry/` | 目录 | Markdown 文档稳定身份注册表            |
| `workspace/`              | 目录 | 工作区持久化设置与 MRU 规则            |
| `vault/`                  | 目录 | 知识库服务                             |
| `vault-watcher/`          | 目录 | 文件监听服务                           |
| `ollama-service/`         | 目录 | 本地 Ollama 服务                       |
| `storage/`                | 目录 | Desktop 本地 store 工厂                |
| `maintenance/`            | 目录 | 应用维护与本地状态重置                 |
| `site-publish/`           | 目录 | 站点发布服务                           |

## 核心模块说明

### app/bootstrap/

- `protocol-lifecycle.ts` 负责 Deep Link 协议注册、单实例锁与 `open-url` 事件路由。
- `main-window-runtime.ts` 负责主窗口状态机，`index.ts` 不再直接持有 `mainWindow/pending/dispose` 等细节。
- `membership-reconcile.ts` 负责 membership 登录态变化后的串行协调，避免主入口内联 Promise 链。
- `lifecycle.ts` 负责 `whenReady` 启动序列与 `before-quit` 关闭序列，`index.ts` 仅做依赖装配。

### agent-runtime/

Agent 运行时，执行 AI 对话、工具调用等操作。

### cloud-sync/

云同步服务，处理本地与云端的数据同步。参考：

- `docs/design/moryflow/core/workspace-profile-and-memory-architecture.md`
- `docs/design/moryflow/core/cloud-sync-architecture.md`

稳定约束：

- `Cloud Sync` 固定是 `Workspace Profile` 下的可选 transport；`Memory` 可在未开启 Sync 时独立工作。
- 同步状态固定依赖 `workspace marker + workspace profile + workspace doc registry + sync mirror state`；禁止不同账号共享一套 journal/mirror/binding 状态。
- `cloudSyncEngine.reinit()` 不能只依赖内存态里的 `vaultPath`；在登录回流、绑定完成或 stop/reset 之后，必须能够回退到当前 active vault 并重新初始化同步引擎，否则会出现“重试同步可点但引擎空转、usage 长期为 0”的假死状态。

### memory-indexing/ / workspace-profile/ / workspace-doc-registry/

- `workspace-meta/` 负责工作区 marker 文件与 `clientWorkspaceId`。
- `workspace-profile/` 负责 `(userId, clientWorkspaceId)` -> `workspaceId / memoryProjectId / syncVaultId?`。
- `workspace-doc-registry/` 负责给 Markdown 文件分配稳定 `documentId`。
- `memory-indexing/` 负责把当前工作区内容写入 `Workspace Content API`；未开 Sync 时走 `inline_text`，开了 Sync 且已有对象快照时走 `sync_object_ref`。

### vault/

知识库服务，管理用户的笔记文件。

### vault-watcher/

文件监听服务，监听知识库目录变化并触发同步。

### ollama-service/

本地 Ollama 服务，支持离线运行本地模型。

### membership/

- `membership/api-url.ts` 是 main 进程访问 Moryflow membership 后端的统一 base URL 事实源。
- 必须优先尊重桌面端配置的 `VITE_MEMBERSHIP_API_URL`；禁止在不同主进程模块里各自硬编码 `server.moryflow.com`，否则会出现登录、refresh、user info、tracing 打到不同环境的分裂问题。
- main 进程的 membership token-first auth（sign-in/email、verify-email、complete sign-up、google exchange、refresh/logout）只能发送 `X-App-Platform: desktop` 这类设备上下文头，禁止自行合成 `Origin/Referer`，否则会把设备请求错误拖入 server/browser 的 trusted-origin 逻辑。

### workspace/

- `workspace/settings/` 承载 expanded paths、document session、recent files、sidebar mode 四类工作区持久化子域。
- 保持 `workspace` store 名称与原有 key 不变，禁止在重构后引入新的持久化 schema。

### chat-session-store/

聊天会话持久化，使用本地存储保存对话历史（不做历史兼容）。

### search-index/

全局搜索索引服务，基于 SQLite contentless FTS5 双轨检索：

- `search_fts_exact`：unicode61 精确全文索引（Files/Threads）。
- `search_fts_fuzzy`：N-gram token 流模糊索引（跨语言子串命中）。
- 查询层统一执行 exact + fuzzy 并行检索、doc 去重合并排序，并提供 `snippetCache`、回源预算与并发控制。

### site-publish/

站点发布服务，将 Markdown 文件构建为静态站点并发布到云端。参考 `docs/design/moryflow/features/site-publish-tech.md`。

## 常见修改场景

| 场景               | 涉及文件                                | 注意事项                                                                     |
| ------------------ | --------------------------------------- | ---------------------------------------------------------------------------- |
| 修改 Agent 运行    | `agent-runtime/`                        | 注意与 packages/agents-\* + @openai/agents-core                              |
| 修改云同步         | `cloud-sync/`                           | 参考 docs/design/moryflow/features/cloud-sync-unified-implementation.md      |
| 修改文件操作       | `vault/`, `vault-watcher/`              | 注意文件权限和错误处理                                                       |
| 修改 Ollama        | `ollama-service/`                       | 注意进程管理                                                                 |
| 新增 IPC 通道      | 对应模块 + `src/shared/ipc/`            | 双向定义类型                                                                 |
| 修改 task 状态链路 | `chat-session-store/`, `agent-runtime/` | 只允许通过 `taskStateService` + session metadata 读写，不再新增独立 task IPC |

## 依赖关系

```
main/
├── 依赖 → packages/agents-* + @openai/agents-core（Agent 框架）
├── 依赖 → packages/api（API 客户端）
├── 通信 → preload（IPC 桥接）
├── 通信 → renderer（渲染进程）
└── 功能文档 → docs/design/moryflow/features/
```

## IPC 通信模式

```
┌────────────────────────────────────────┐
│              Main Process              │
│  ┌─────────────┐  ┌─────────────┐     │
│  │   Service   │  │   Handler   │     │
│  └──────┬──────┘  └──────┬──────┘     │
│         │                │            │
│    ipcMain.handle() / ipcMain.on()    │
└─────────────────────┬──────────────────┘
                      │ IPC
┌─────────────────────┴──────────────────┐
│              Preload Script            │
│      (contextBridge.exposeInMainWorld) │
└─────────────────────┬──────────────────┘
                      │ IPC
┌─────────────────────┴──────────────────┐
│              Renderer Process          │
│           window.api.xxx()             │
└────────────────────────────────────────┘
```
