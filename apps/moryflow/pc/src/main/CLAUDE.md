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
- 外链打开必须经 `external-links` allowlist 校验，额外域名通过 `MORYFLOW_EXTERNAL_HOST_ALLOWLIST` 注入
- 主窗口必须拦截 `will-navigate`/`will-redirect`，仅允许内部资源导航
- E2E 测试（`MORYFLOW_E2E=true`）禁止自动打开 DevTools
- E2E 测试可通过 `MORYFLOW_E2E_USER_DATA` 指定独立 userData 目录
- E2E 测试可通过 `MORYFLOW_E2E_RESET=true` 清理 Vault store（仅测试用）
- Vault store 与 pc-settings 在 E2E 下使用 `MORYFLOW_E2E_USER_DATA/stores`
- preload 构建需输出 CJS（sandbox 下 ESM preload 会报错）

## 成员清单

| 文件/目录                   | 类型 | 说明                   |
| --------------------------- | ---- | ---------------------- |
| `index.ts`                  | 入口 | 主进程入口             |
| `app/`                      | 目录 | 应用生命周期管理       |
| `agent-runtime/`            | 目录 | Agent 运行时           |
| `agent-settings/`           | 目录 | Agent 设置管理         |
| `chat/`                     | 目录 | 聊天服务               |
| `chat-session-store/`       | 目录 | 聊天会话存储           |
| `cloud-sync/`               | 目录 | 云同步服务             |
| `vault/`                    | 目录 | 知识库服务             |
| `vault-watcher/`            | 目录 | 文件监听服务           |
| `ollama-service/`           | 目录 | 本地 Ollama 服务       |
| `vault.ts`                  | 文件 | 知识库核心逻辑         |
| `tree-cache.ts`             | 文件 | 文件树缓存             |
| `preload-cache.ts`          | 文件 | 预加载缓存             |
| `preload-settings.ts`       | 文件 | 预加载设置             |
| `workspace-settings.ts`     | 文件 | 工作区设置             |
| `membership-bridge.ts`      | 文件 | 会员状态桥接           |
| `membership-token-store.ts` | 文件 | refresh token 安全存储 |
| `app-maintenance.ts`        | 文件 | 应用维护               |
| `site-publish/`             | 目录 | 站点发布服务           |

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
| 修改 Agent 运行 | `agent-runtime/`             | 注意与 packages/agents-\* + @openai/agents-core  |
| 修改云同步      | `cloud-sync/`                | 参考 docs/products/moryflow/features/cloud-sync/ |
| 修改文件操作    | `vault/`, `vault-watcher/`   | 注意文件权限和错误处理                           |
| 修改 Ollama     | `ollama-service/`            | 注意进程管理                                     |
| 新增 IPC 通道   | 对应模块 + `src/shared/ipc/` | 双向定义类型                                     |

## 近期变更

- Agent Runtime 支持 system prompt/模型参数注入，参数改为可选覆盖并默认使用模型默认值
- Agent Runtime/Agent 设置改用 `@anyhunt/agents-runtime/prompt` 读取 system prompt
- Agent Runtime 切换为 `@openai/agents-core`，统一 Runner/Tool/类型入口
- Agent Runtime 使用会话历史拼装输入，流完成后追加输出（移除 SDK Session 依赖）
- 新增 `server-tracing-processor.ts`，兼容新版 tracing 上报结构
- Tracing 上报增加安全序列化，避免循环引用导致丢失
- 新增 `membership-token-store.ts`，在主进程加密保存 refresh token
- Auth IPC 通道补充 refresh token 读写，配合 renderer 端 `auth-session`
- 新增外链 allowlist 与导航拦截，统一由主进程校验后打开外部链接
- E2E 模式关闭自动 DevTools，避免干扰 Playwright 运行
- 移除 `enableRemoteModule` 配置，保持 Electron 类型兼容
- E2E 支持指定 userData 路径，避免本地数据污染测试
- E2E 支持重置 Vault store，确保首次启动进入 onboarding
- E2E 下 vault-store/pc-settings 指向隔离目录，避免读取本机历史数据
- preload 产物改为 CJS，`resolvePreloadPath` 优先加载 `dist/preload/index.js`
- external-links 使用路径 relative 校验，补齐 allowlist/导航单测

## 依赖关系

```
main/
├── 依赖 → packages/agents-* + @openai/agents-core（Agent 框架）
├── 依赖 → packages/api（API 客户端）
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
