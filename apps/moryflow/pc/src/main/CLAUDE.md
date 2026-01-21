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
- 窗口管理

## 约束

- 主进程是 Node.js 环境，可以访问系统 API
- 与渲染进程通过 IPC 通信
- 敏感操作（文件、网络）必须在主进程执行
- 长时间操作需考虑不阻塞主进程

## 成员清单

| 文件/目录               | 类型 | 说明             |
| ----------------------- | ---- | ---------------- |
| `index.ts`              | 入口 | 主进程入口       |
| `app/`                  | 目录 | 应用生命周期管理 |
| `agent-runtime/`        | 目录 | Agent 运行时     |
| `agent-settings/`       | 目录 | Agent 设置管理   |
| `chat/`                 | 目录 | 聊天服务         |
| `chat-session-store/`   | 目录 | 聊天会话存储     |
| `cloud-sync/`           | 目录 | 云同步服务       |
| `vault/`                | 目录 | 知识库服务       |
| `vault-watcher/`        | 目录 | 文件监听服务     |
| `ollama-service/`       | 目录 | 本地 Ollama 服务 |
| `vault.ts`              | 文件 | 知识库核心逻辑   |
| `tree-cache.ts`         | 文件 | 文件树缓存       |
| `preload-cache.ts`      | 文件 | 预加载缓存       |
| `preload-settings.ts`   | 文件 | 预加载设置       |
| `workspace-settings.ts` | 文件 | 工作区设置       |
| `membership-bridge.ts`  | 文件 | 会员状态桥接     |
| `app-maintenance.ts`    | 文件 | 应用维护         |
| `site-publish/`         | 目录 | 站点发布服务     |

## 核心模块说明

### agent-runtime/

Agent 运行时，执行 AI 对话、工具调用等操作。

### cloud-sync/

云同步服务，处理本地与云端的数据同步。参考 `docs/products/moryflow/features/cloud-sync/`。

### vault/

知识库服务，管理用户的笔记文件。

### vault-watcher/

文件监听服务，监听知识库目录变化并触发同步。

### ollama-service/

本地 Ollama 服务，支持离线运行本地模型。

### chat-session-store/

聊天会话持久化，使用本地存储保存对话历史（不做历史兼容）。

### site-publish/

站点发布服务，将 Markdown 文件构建为静态站点并发布到云端。参考 `docs/products/moryflow/features/site-publish/`。

## 常见修改场景

| 场景            | 涉及文件                     | 注意事项                                         |
| --------------- | ---------------------------- | ------------------------------------------------ |
| 修改 Agent 运行 | `agent-runtime/`             | 注意与 packages/agents-\* 的配合                 |
| 修改云同步      | `cloud-sync/`                | 参考 docs/products/moryflow/features/cloud-sync/ |
| 修改文件操作    | `vault/`, `vault-watcher/`   | 注意文件权限和错误处理                           |
| 修改 Ollama     | `ollama-service/`            | 注意进程管理                                     |
| 新增 IPC 通道   | 对应模块 + `src/shared/ipc/` | 双向定义类型                                     |

## 依赖关系

```
main/
├── 依赖 → packages/agents-*（Agent 框架）
├── 依赖 → packages/shared-api（API 客户端）
├── 通信 → preload（IPC 桥接）
├── 通信 → renderer（渲染进程）
└── 功能文档 → docs/products/moryflow/features/cloud-sync/
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
