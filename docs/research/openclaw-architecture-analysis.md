# OpenClaw 架构分析

本文档对 [OpenClaw](https://github.com/openclaw/openclaw) 项目进行深入的架构分析，OpenClaw 是一个运行在本地设备上的个人 AI 助手，支持多种消息渠道和平台。

## 项目概述

OpenClaw 是一个本地优先的个人 AI 助手，核心特点包括：

- 支持多种消息渠道（WhatsApp、Telegram、Slack、Discord、Google Chat、Signal、iMessage、Microsoft Teams、Matrix、Zalo、WebChat 等）
- 提供 macOS、iOS、Android 原生应用
- 支持语音唤醒和对话模式
- 提供浏览器控制和 Canvas 可视化工作区
- 支持多种 AI 模型提供商（Anthropic、OpenAI 等）

## 整体架构

```
消息渠道 (WhatsApp / Telegram / Slack / Discord / Signal / iMessage / ...)
               │
               ▼
┌───────────────────────────────────┐
│            Gateway                │
│         (控制平面)                 │
│      ws://127.0.0.1:18789         │
└──────────────┬────────────────────┘
               │
               ├─ Pi Agent (RPC 模式)
               ├─ CLI (openclaw ...)
               ├─ WebChat UI
               ├─ macOS 应用
               └─ iOS / Android 节点
```

OpenClaw 采用典型的控制平面架构，Gateway 作为核心枢纽，负责协调所有组件之间的通信。

## 目录结构

```
openclaw/
├── src/                    # 核心源代码
│   ├── gateway/           # Gateway 服务器实现
│   ├── agents/            # AI Agent 运行时
│   ├── cli/               # CLI 命令实现
│   ├── channels/          # 消息渠道抽象层
│   ├── browser/           # 浏览器控制
│   ├── canvas-host/       # Canvas 可视化工作区
│   ├── config/            # 配置管理
│   ├── cron/              # 定时任务
│   ├── memory/            # 记忆系统
│   ├── auto-reply/        # 自动回复逻辑
│   ├── routing/           # 消息路由
│   ├── sessions/          # 会话管理
│   ├── wizard/            # 引导向导
│   ├── plugin-sdk/        # 插件 SDK
│   └── ...
├── apps/                   # 原生应用
│   ├── macos/             # macOS 菜单栏应用 (Swift)
│   ├── ios/               # iOS 应用 (Swift)
│   ├── android/           # Android 应用 (Kotlin)
│   └── shared/            # 共享代码 (OpenClawKit)
├── extensions/             # 扩展插件
│   ├── whatsapp/          # WhatsApp 渠道
│   ├── telegram/          # Telegram 渠道
│   ├── discord/           # Discord 渠道
│   ├── slack/             # Slack 渠道
│   ├── matrix/            # Matrix 渠道
│   ├── msteams/           # Microsoft Teams 渠道
│   └── ...
├── ui/                     # Web UI (Control UI)
├── docs/                   # 文档
├── skills/                 # 内置技能
└── packages/               # 子包
```

## 核心组件详解

### 1. Gateway (网关服务器)

Gateway 是 OpenClaw 的核心控制平面，位于 `src/gateway/` 目录。

主要职责：

- WebSocket 服务器，监听端口 18789
- 管理所有客户端连接（CLI、移动应用、Web UI）
- 协调消息渠道的启动和停止
- 处理 Agent 事件和消息路由
- 提供 HTTP API（包括 OpenAI 兼容的 `/v1/chat/completions` 端点）
- 管理 Cron 定时任务
- 提供 Control UI 静态资源服务

核心文件：

- `server.impl.ts`: Gateway 服务器主实现
- `server-channels.ts`: 渠道管理器
- `server-chat.ts`: 聊天消息处理
- `server-cron.ts`: Cron 服务
- `server-methods.ts`: Gateway RPC 方法

```typescript
// Gateway 启动流程简化示意
export async function startGatewayServer(port = 18789, opts: GatewayServerOptions = {}) {
  // 1. 加载配置
  const configSnapshot = await readConfigFileSnapshot();

  // 2. 初始化插件系统
  const { pluginRegistry, gatewayMethods } = loadGatewayPlugins({ cfg, ... });

  // 3. 创建运行时状态
  const runtimeState = await createGatewayRuntimeState({ ... });

  // 4. 启动渠道管理器
  const channelManager = createChannelManager({ ... });

  // 5. 启动服务发现 (Bonjour/mDNS)
  const discovery = await startGatewayDiscovery({ ... });

  // 6. 启动 Cron 服务
  const cronState = buildGatewayCronService({ ... });

  // 7. 附加 WebSocket 处理器
  attachGatewayWsHandlers({ ... });

  return { close };
}
```

### 2. Agent 运行时

Agent 运行时位于 `src/agents/` 目录，负责与 AI 模型交互。

核心组件：

- `pi-embedded-runner/`: 嵌入式 Pi Agent 运行器
- `pi-tools.ts`: Agent 工具定义
- `system-prompt.ts`: 系统提示词构建
- `model-auth.ts`: 模型认证管理
- `skills/`: 技能系统

Agent 工具系统：

```typescript
// 核心工具列表
const coreTools = [
  'read', // 读取文件
  'write', // 写入文件
  'edit', // 编辑文件
  'apply_patch', // 应用补丁
  'grep', // 搜索文件内容
  'find', // 查找文件
  'ls', // 列出目录
  'exec', // 执行 Shell 命令
  'process', // 管理后台进程
  'web_search', // 网页搜索
  'web_fetch', // 获取网页内容
  'browser', // 浏览器控制
  'canvas', // Canvas 操作
  'nodes', // 节点管理
  'cron', // 定时任务
  'message', // 发送消息
  'sessions_*', // 会话管理
];
```

Agent 运行流程：

1. 接收用户消息
2. 构建系统提示词（包含工具定义、技能、上下文）
3. 调用 AI 模型 API
4. 处理模型响应（文本、工具调用）
5. 执行工具调用并返回结果
6. 循环直到完成或超时

### 3. 消息渠道系统

消息渠道系统采用插件化架构，位于 `src/channels/` 和 `extensions/`。

渠道插件接口：

```typescript
interface ChannelPlugin {
  id: ChannelId;
  meta: ChannelMeta;

  // 适配器
  setupAdapter?: ChannelSetupAdapter;
  authAdapter?: ChannelAuthAdapter;
  messagingAdapter?: ChannelMessagingAdapter;
  outboundAdapter?: ChannelOutboundAdapter;
  statusAdapter?: ChannelStatusAdapter;
  // ...
}
```

内置渠道：

- WhatsApp (Baileys)
- Telegram (grammY)
- Slack (Bolt)
- Discord (discord.js)
- Signal (signal-cli)
- iMessage (legacy)
- Google Chat

扩展渠道：

- BlueBubbles (iMessage 推荐)
- Microsoft Teams
- Matrix
- Zalo
- LINE
- Feishu (飞书)

### 4. 浏览器控制

浏览器控制模块位于 `src/browser/`，使用 Playwright 实现。

功能：

- 管理专用 Chrome/Chromium 实例
- CDP (Chrome DevTools Protocol) 控制
- 页面快照和截图
- 表单填写和点击操作
- Cookie 和存储管理
- 多标签页支持

核心文件：

- `chrome.ts`: Chrome 进程管理
- `cdp.ts`: CDP 协议封装
- `pw-session.ts`: Playwright 会话
- `server.ts`: 浏览器控制 HTTP 服务

### 5. Canvas 可视化工作区

Canvas 是 Agent 驱动的可视化工作区，位于 `src/canvas-host/`。

特性：

- A2UI (Agent-to-UI) 推送/重置
- JavaScript 代码执行
- 快照捕获
- 与 macOS/iOS 应用集成

### 6. 配置系统

配置系统位于 `src/config/`，使用 YAML 格式。

配置文件位置：`~/.openclaw/config.yaml`

主要配置项：

```yaml
# 模型配置
models:
  default: anthropic/claude-sonnet-4
  fallbacks:
    - openai/gpt-4o

# 渠道配置
channels:
  telegram:
    enabled: true
    token: '...'
  whatsapp:
    enabled: true

# Agent 配置
agents:
  defaults:
    workspace: ~/workspace
    tools:
      allow: ['*']

# Gateway 配置
gateway:
  port: 18789
  bind: loopback
```

### 7. 插件系统

插件系统支持扩展 OpenClaw 的功能。

插件 SDK (`src/plugin-sdk/index.ts`) 导出：

- 渠道插件类型和工具
- 配置 Schema
- 消息处理工具
- 诊断事件

插件目录结构：

```
extensions/my-plugin/
├── package.json
├── src/
│   └── index.ts
└── README.md
```

### 8. 原生应用

macOS 应用 (`apps/macos/`):

- Swift/SwiftUI 实现
- 菜单栏应用
- Voice Wake 语音唤醒
- Talk Mode 对话模式
- WebChat 集成
- Gateway 控制

iOS 应用 (`apps/ios/`):

- Swift/SwiftUI 实现
- Canvas 支持
- Voice Wake
- Talk Mode
- 相机和屏幕录制
- Bonjour 配对

Android 应用 (`apps/android/`):

- Kotlin 实现
- Canvas 支持
- Talk Mode
- 相机和屏幕录制
- 可选 SMS 支持

## 数据流

### 入站消息流

```
用户消息 (WhatsApp/Telegram/...)
    │
    ▼
渠道适配器 (messagingAdapter)
    │
    ▼
消息路由 (src/routing/)
    │
    ▼
会话解析 (resolveSessionKey)
    │
    ▼
自动回复处理 (src/auto-reply/)
    │
    ▼
Agent 运行 (runEmbeddedPiAgent)
    │
    ▼
AI 模型调用
    │
    ▼
响应处理 (工具调用/文本)
    │
    ▼
出站消息 (outboundAdapter)
    │
    ▼
用户收到回复
```

### 工具调用流

```
Agent 请求工具调用
    │
    ▼
工具策略检查 (pi-tools.policy.ts)
    │
    ▼
工具执行 (exec/read/write/...)
    │
    ▼
结果返回给 Agent
    │
    ▼
Agent 继续处理或完成
```

## 技术栈

核心技术：

- TypeScript (ESM)
- Node.js 22+
- Hono (HTTP 框架)
- WebSocket (ws)
- Playwright (浏览器控制)
- Vitest (测试)
- pnpm (包管理)

AI 集成：

- @mariozechner/pi-agent-core
- @mariozechner/pi-ai
- @mariozechner/pi-coding-agent

消息渠道库：

- @whiskeysockets/baileys (WhatsApp)
- grammy (Telegram)
- @slack/bolt (Slack)
- discord.js (Discord)

原生应用：

- Swift/SwiftUI (macOS/iOS)
- Kotlin (Android)

## 安全设计

DM 访问策略：

- `pairing`: 未知发送者需要配对码验证
- `open`: 允许所有人（需显式配置）

工具策略：

- 全局工具允许列表
- 按 Agent 的工具策略
- 按渠道/群组的工具策略
- 沙箱模式支持

认证：

- API Key 管理
- OAuth 支持 (Anthropic/OpenAI)
- 认证配置文件轮换

## 部署选项

本地运行：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
openclaw gateway --port 18789
```

Docker：

```bash
docker-compose up -d
```

远程访问：

- Tailscale Serve/Funnel
- SSH 隧道

## 开发指南

构建：

```bash
pnpm install
pnpm ui:build
pnpm build
```

开发模式：

```bash
pnpm gateway:watch
```

测试：

```bash
pnpm test
pnpm test:coverage
```

代码检查：

```bash
pnpm check  # lint + format
```

## 关键设计决策

1. **本地优先**: Gateway 默认绑定到 loopback，数据存储在本地
2. **插件化渠道**: 所有消息渠道通过统一接口实现，便于扩展
3. **工具策略分层**: 支持全局、Agent、渠道、群组级别的工具控制
4. **多模型支持**: 支持多个 AI 提供商，带故障转移机制
5. **原生应用集成**: 通过 WebSocket 与 Gateway 通信，提供原生体验

## 与 Moryflow 的对比

| 特性     | OpenClaw          | Moryflow           |
| -------- | ----------------- | ------------------ |
| 定位     | 个人 AI 助手      | 企业级 AI 应用平台 |
| 部署     | 本地优先          | 云端部署           |
| 渠道     | 多渠道消息集成    | 专注于特定场景     |
| 原生应用 | macOS/iOS/Android | 待定               |
| 开源     | MIT 许可          | 私有               |

## 参考资源

- 官方文档: https://docs.openclaw.ai
- GitHub: https://github.com/openclaw/openclaw
- Discord: https://discord.gg/clawd
- DeepWiki: https://deepwiki.com/openclaw/openclaw
