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
- Desktop 凭据（membership token / Telegram secrets / agent-runtime secureStorage）统一使用 `store-factory.ts` + `electron-store` 本地文件持久化；主进程不再依赖 Keychain / `safeStorage`
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

| 文件/目录                     | 类型 | 说明                                                              |
| ----------------------------- | ---- | ----------------------------------------------------------------- |
| `index.ts`                    | 入口 | 主进程入口                                                        |
| `app/`                        | 目录 | Electron 壳层模块（IPC / 窗口 / runtime / 安全 / menubar / 更新） |
| `agent-runtime/`              | 目录 | Agent 运行时                                                      |
| `mcp-runtime/`                | 目录 | MCP stdio 受管安装/更新与可执行解析                               |
| `agent-settings/`             | 目录 | Agent 设置管理                                                    |
| `chat/`                       | 目录 | 聊天服务                                                          |
| `chat-session-store/`         | 目录 | 聊天会话存储                                                      |
| `skills/`                     | 目录 | Skills 注册中心（内置基线 + 在线同步）                            |
| `search-index/`               | 目录 | 全局搜索索引（Files + Threads，FTS）                              |
| `cloud-sync/`                 | 目录 | 云同步服务                                                        |
| `memory-indexing/`            | 目录 | Workspace Content 上传与 Memory 镜像                              |
| `device-config/`              | 目录 | Sync 设备级身份配置                                               |
| `workspace-meta/`             | 目录 | 本地工作区 marker 与稳定身份                                      |
| `workspace-profile/`          | 目录 | 当前账号对应的 workspace profile                                  |
| `workspace-doc-registry/`     | 目录 | Markdown 文档稳定身份注册表                                       |
| `vault/`                      | 目录 | 知识库服务                                                        |
| `vault-watcher/`              | 目录 | 文件监听服务                                                      |
| `ollama-service/`             | 目录 | 本地 Ollama 服务                                                  |
| `vault.ts`                    | 文件 | 知识库核心逻辑                                                    |
| `tree-cache.ts`               | 文件 | 文件树缓存                                                        |
| `workspace-settings.ts`       | 文件 | 工作区设置                                                        |
| `workspace-settings.utils.ts` | 文件 | 工作区 MRU 规则工具                                               |
| `membership-api-url.ts`       | 文件 | 主进程 membership API base 统一解析入口                           |
| `membership-bridge.ts`        | 文件 | 会员状态桥接                                                      |
| `membership-token-store.ts`   | 文件 | access/refresh token 本地凭据存储                                 |
| `store-factory.ts`            | 文件 | Desktop 本地 store 工厂                                           |
| `app-maintenance.ts`          | 文件 | 应用维护                                                          |
| `site-publish/`               | 目录 | 站点发布服务                                                      |

## 核心模块说明

### app/

Electron 主进程壳层能力目录，按平台能力而非零散文件平铺组织：

- `ipc/`
  - 主进程 IPC 注册入口与按域 registrar；`register-handlers.ts` 只做依赖装配与注册分发。
  - `runtime/`、`workspace/` 负责继续拆分各自域内 channel 注册；`memory-domain/` 承载 Memory 具体实现。
- `windows/`
  - 主窗口、Quick Chat、窗口生命周期策略、深链窗口策略与共享导航守卫。
- `runtime/`
  - 应用运行时 store、Launch at Login、membership runtime、fs 事件桥接等。
- `security/`
  - 外链策略、membership device auth headers 等主进程安全边界。
- `menubar/`
  - 菜单栏控制器、未读 badge 与 revision tracker。
- `updates/`
  - 桌面端更新服务与更新设置持久化。
- `preload/`
  - preload 构建入口解析。
- `packaging/`
  - 桌面打包/发布契约测试。

稳定约束：

- `app/ipc/register-handlers.ts` 不承载具体业务实现；域内 payload 解析与 service adapter 应下沉到对应 registrar/module。
- `app/ipc/runtime-register.ts`、`app/ipc/workspace-register.ts` 只允许做聚合，不再堆放具体 handler 实现。
- Memory IPC 实现必须直接维护在 `app/ipc/memory-domain/`，禁止再新增兼容 barrel。
- 窗口导航安全边界统一由 `windows/shared/external-navigation-guards.ts` 绑定，禁止在各窗口内重复实现。
- 运行时持久化按子域拆分：窗口偏好在 `runtime/preferences-store.ts`，Quick Chat 会话在 `windows/quick-chat/quick-chat-store.ts`，更新设置在 `updates/update-settings-store.ts`。

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

### membership-api-url.ts / membership-bridge.ts

- `membership-api-url.ts` 是 main 进程访问 Moryflow membership 后端的统一 base URL 事实源。
- 必须优先尊重桌面端配置的 `VITE_MEMBERSHIP_API_URL`；禁止在不同主进程模块里各自硬编码 `server.moryflow.com`，否则会出现登录、refresh、user info、tracing 打到不同环境的分裂问题。
- main 进程的 membership token-first auth（sign-in/email、verify-email、complete sign-up、google exchange、refresh/logout）只能发送 `X-App-Platform: desktop` 这类设备上下文头，禁止自行合成 `Origin/Referer`，否则会把设备请求错误拖入 server/browser 的 trusted-origin 逻辑。

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
