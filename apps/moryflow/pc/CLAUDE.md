# PC App

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Moryflow 桌面端应用，基于 Electron + React 构建。

## 职责

- 提供桌面端用户界面
- 本地笔记编辑与管理
- AI 对话交互（支持本地 Ollama）
- 本地文件系统访问
- 云同步客户端

## 约束

- 主进程与渲染进程严格分离，通过 IPC 通信
- 渲染进程使用 TailwindCSS
- 主进程处理文件系统、网络、Agent 运行时等重操作
- 敏感操作（文件访问、网络请求）必须在主进程执行
- 全局样式引入 `@aiget/ui/styles`，Electron 专属样式保留在 `src/renderer/global.css`
- `electron.vite.config.ts` 需为 `@aiget/ui/styles` 设置别名，避免解析到 `packages/ui/src`

## 技术栈

| 技术        | 用途        |
| ----------- | ----------- |
| Electron    | 桌面框架    |
| React       | 渲染进程 UI |
| TailwindCSS | 样式系统    |
| Vite        | 构建工具    |

## 成员清单

| 文件/目录                      | 类型 | 说明                    |
| ------------------------------ | ---- | ----------------------- |
| `src/main/`                    | 目录 | 主进程代码              |
| `src/main/index.ts`            | 入口 | 主进程入口              |
| `src/main/agent-runtime/`      | 目录 | Agent 运行时            |
| `src/main/agent-settings/`     | 目录 | Agent 设置管理          |
| `src/main/chat/`               | 目录 | 聊天服务                |
| `src/main/chat-session-store/` | 目录 | 聊天会话存储            |
| `src/main/cloud-sync/`         | 目录 | 云同步服务              |
| `src/main/vault/`              | 目录 | 知识库服务              |
| `src/main/vault-watcher/`      | 目录 | 文件监听服务            |
| `src/main/ollama-service/`     | 目录 | 本地 Ollama 服务        |
| `src/renderer/`                | 目录 | 渲染进程代码            |
| `src/renderer/App.tsx`         | 入口 | 渲染进程入口            |
| `src/renderer/components/`     | 目录 | UI 组件                 |
| `src/renderer/workspace/`      | 目录 | 工作区布局              |
| `src/renderer/hooks/`          | 目录 | 自定义 Hooks            |
| `src/renderer/lib/`            | 目录 | 工具库                  |
| `src/preload/`                 | 目录 | 预加载脚本（IPC 桥接）  |
| `src/shared/`                  | 目录 | 主进程/渲染进程共享代码 |
| `src/shared/ipc/`              | 目录 | IPC 通道定义            |

## 常见修改场景

| 场景           | 涉及文件                          | 注意事项                                         |
| -------------- | --------------------------------- | ------------------------------------------------ |
| 新增 UI 组件   | `src/renderer/components/`        | 使用 TailwindCSS + shadcn                        |
| 修改工作区布局 | `src/renderer/workspace/`         | 参考现有 render 函数模式                         |
| 新增 IPC 通道  | `src/shared/ipc/`, `src/preload/` | 双向定义，类型安全                               |
| 修改聊天功能   | `src/main/chat/`, `src/renderer/` | 注意 IPC 通信                                    |
| 修改文件操作   | `src/main/vault/`                 | 在主进程执行                                     |
| 修改云同步     | `src/main/cloud-sync/`            | 参考 docs/products/moryflow/features/cloud-sync/ |

## 依赖关系

```
apps/moryflow/pc/
├── 依赖 → packages/shared-api（API 客户端）
├── 依赖 → packages/agents-*（Agent 框架）
└── 功能文档 → docs/products/moryflow/features/cloud-sync/
```

## 架构说明

```
┌─────────────────────────────────────────────────────┐
│                    Renderer Process                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Workspace  │  │  Components │  │    Hooks    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────┬───────────────────────────┘
                          │ IPC
┌─────────────────────────┴───────────────────────────┐
│                     Preload Script                   │
└─────────────────────────┬───────────────────────────┘
                          │ IPC
┌─────────────────────────┴───────────────────────────┐
│                     Main Process                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │    Chat     │  │    Vault    │  │  CloudSync  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                   │
│  │AgentRuntime │  │   Ollama    │                   │
│  └─────────────┘  └─────────────┘                   │
└─────────────────────────────────────────────────────┘
```
