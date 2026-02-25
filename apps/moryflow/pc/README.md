# moryflow / apps/pc — 本地三栏笔记与智能助手

> 桌面端 Electron 应用，左侧管理 Vault 文件树，中间用 Notion 风格编辑器写 Markdown，右侧通过 Mory 智能助手执行对话、读写本地文件、联网搜索。

## 产品概述

- 仅依赖本地 Electron 主进程，渲染层为 React + Tailwind，所有文件读写都发生在本机 Vault 目录。
- 支持任意文件夹作为 Vault，自动记住最近一次的路径，可搭配 iCloud/网盘做同步但应用本身不托管数据。
- 右侧 Chat Pane 可以流式查看回复、工具调用结果，聊天记录和模型设置都持久化在本机。

## 功能模块

### Vault 文件库

- 初次启动或点击"切换 Vault"会通过系统文件选择器挑选目录，所选路径保存在 `electron-store`（`pc-settings`），并在 `getStoredVault` 时校验读写权限。
- `readTree` 只展示 `.md` 文件和文件夹，隐藏以 `.` 开头的条目；树节点使用 `VaultTree` 组件递归渲染，主进程用 `chokidar` 监听 Vault 目录并通过 `vault:fs-event` 通知渲染层刷新。
- 文件操作（新建/重命名/移动/删除）都在主进程完成：创建 Markdown 时自动补 `.md`；移动会阻止"文件夹移动到自身子目录"；重命名与删除均进行路径净化与存在性校验。

### Notion 风格笔记编辑

- 中间编辑区域使用自研的 `NotionEditor`（Tiptap + 多扩展），支持 Slash Menu、任务列表、数学公式、表格、图片占位等；内部通过 `markdownToHtml`/`htmlToMarkdown` 完成 Markdown 存盘。
- 同时维护"选中文件"和"激活文档"两个状态，支持多标签页，关闭标签后自动回落到最近一个文件。
- 文档内容写入 `pendingSave` 后会开启 2 秒 debounce：若期间继续输入会重置计时，超时后主进程 `files:write` 校验 `clientMtime` 再更新，结果回写 `mtime` 并驱动保存状态 Badge（`已保存/保存中/错误`）。

### Mory 智能助手

Mory 是内置的 AI 助手，具有热心、接地气、靠谱的个性。主要能力包括：

- **Vault 操作**：读取、编辑、创建文件，搜索内容，管理目录结构
- **网络能力**：搜索互联网获取最新信息，抓取网页内容
- **命令执行**：运行 shell 命令完成各种任务
- **计划管理**：创建执行计划，追踪任务进度
- **子代理调度**：对复杂任务启动专门的子代理处理

### 配置与存储

- `vault:getRecent`、`chat-sessions`、`agent-settings` 等均使用 `electron-store`，避免额外后端。
- 主进程暴露统一的 `desktopAPI`（`src/preload/index.ts`），渲染层通过该 API 调用 IPC，无需直接触达 Node 能力。

## Agent 工具清单

Mory 配备一组精简工具，分为五大类：

### Vault 操作（9 个）

| 工具             | 作用         | 说明                                            |
| ---------------- | ------------ | ----------------------------------------------- |
| `read`           | 读取文件内容 | 支持 offset/limit 分段，返回带行号内容和 sha256 |
| `edit`           | 编辑文件     | 查找-替换方式，直接写入并返回 diff              |
| `write`          | 写入文件     | 创建新文件或覆盖（需 base_sha 校验）            |
| `ls`             | 列出目录     | 返回单层目录内容（文件名、大小、修改时间）      |
| `glob`           | 通配符搜索   | 如 `**/*.md` 批量匹配文件                       |
| `grep`           | 内容搜索     | 跨文件搜索文本，返回匹配行和位置                |
| `search_in_file` | 文件内搜索   | 在单个文件中定位特定文本                        |
| `move`           | 移动/重命名  | 支持文件和文件夹                                |
| `delete`         | 删除         | 需要 `confirm: true` 确认                       |

### Tasks 管理（tasks\_\*）

| 工具      | 作用     | 说明                                       |
| --------- | -------- | ------------------------------------------ |
| `tasks_*` | 任务管理 | 创建/更新任务，存储于 `.moryflow/agent` 下 |

### 系统操作（1 个）

| 工具   | 作用     | 说明                                         |
| ------ | -------- | -------------------------------------------- |
| `bash` | 执行命令 | 在 Vault 目录下执行 shell 命令，支持超时控制 |

### 网络操作（2 个）

| 工具         | 作用     | 说明                   |
| ------------ | -------- | ---------------------- |
| `web_search` | 网络搜索 | 搜索互联网获取最新信息 |
| `web_fetch`  | 网页抓取 | 获取网页内容并提取信息 |

### 代理编排（1 个）

| 工具   | 作用       | 说明                                                 |
| ------ | ---------- | ---------------------------------------------------- |
| `task` | 子代理任务 | 启动专门子代理处理复杂任务（explore/research/batch） |

### MCP 扩展工具

用户可在设置中配置 MCP（Model Context Protocol）服务器，动态加载额外工具能力。MCP 工具名称格式为 `mcp__服务名__工具名`。

## 技术架构

### 进程分层

- **主进程 (`src/main`)**：负责窗口生命周期、Vault 读写、文件系统监听、聊天管道、Agent runtime、设置存储。
- **预加载层 (`src/preload`)**：用 `contextBridge` 暴露 `desktopAPI`，确保渲染层运行在 `contextIsolation` 环境下。
- **渲染层 (`src/renderer`)**：React 19 + Vite + Tailwind + shadcn/ui，布局由 `DesktopWorkspace` 统一调度。

### Agent Runtime 架构

```
agent-runtime/
├── index.ts                # 主入口
├── vault-utils.ts          # Vault 工具函数
├── core/
│   ├── agent-factory.ts    # Agent 工厂（构建 Mory 实例）
│   ├── base-tools.ts       # 基础工具集（14 个）
│   ├── auto-continue.ts    # 自动续写（截断处理）
│   ├── prompt.ts           # Mory 系统提示词
│   ├── chat-session.ts     # 聊天会话管理
│   ├── context.ts          # 上下文处理
│   ├── model-factory.ts    # 模型工厂
│   ├── mcp-manager.ts      # MCP 服务管理
│   ├── mcp-utils.ts        # MCP 工具函数
│   └── types.ts            # 类型定义
└── tools/
    ├── index.ts            # 工具导出
    ├── shared.ts           # 共享函数
    ├── helpers.ts          # 辅助函数
    ├── read-tool.ts        # 读取工具
    ├── edit-tool.ts        # 编辑工具
    ├── write-tool.ts       # 写入工具
    ├── glob-tool.ts        # 通配符搜索
    ├── grep-tool.ts        # 内容搜索
    ├── search-in-file-tool.ts  # 文件内搜索
    ├── ls-tool.ts          # 目录列表
    ├── move-tool.ts        # 移动/重命名
    ├── delete-tool.ts      # 删除
    ├── manage-plan.ts      # 计划管理
    ├── bash-tool.ts        # 命令执行
    ├── web-fetch-tool.ts   # 网页抓取
    ├── web-search-tool.ts  # 网络搜索
    └── task-tool.ts        # 子代理任务
```

### 主进程关键模块

- `vault.ts`：封装文件操作，所有路径都要通过 `ensureWithinVault` 校验，避免越权访问。
- `chat/handlers.ts`：实现聊天相关 IPC 处理，包括 `chat:agent-request`、会话管理等。
- `agent-runtime`：管理 Agent 实例、加载本地工具与 MCP 服务器。

### 渲染层重点

- `workspace/handle.ts` 维护 Vault/编辑器状态机、tab 切换、CommandPalette 动作。
- `components/chat-pane` 提供 Chat UI、模型选择、session 管理等。
- `components/notion-like-editor` 基于 Tiptap 扩展出所见即所得体验。

### 数据与配置

- `electron-store` 用于 `pc-settings`（Vault 路径）、`chat-sessions`、`agent-settings`，都以 JSON 落盘。
- Agent 设置包括：模型配置、MCP 服务器列表、UI 主题等。

### 关键依赖

- Electron + `electron-vite` 打包
- `chokidar` 文件监听
- `@ai-sdk/react` / `ai` 对话 SDK 核心
- `@ai-sdk/openai` / `@ai-sdk/anthropic` / `@ai-sdk/google` / `@ai-sdk/xai` 等多服务商 SDK
- `@openrouter/ai-sdk-provider` / `@aihubmix/ai-sdk-provider` 聚合服务商
- `@openai/agents-core` + `@moryflow/agents-runtime` 推理与工具系统
- UI 组件主要来自 shadcn/ui
- 编辑器依赖 Tiptap 扩展

### 多服务商支持

Moryflow 采用「预设服务商 + 预设模型」的设计模式：

- **预设服务商**：内置 OpenAI、Anthropic、Google、xAI、DeepSeek、Moonshot、智谱、OpenRouter、AIHubMix 等 20+ 服务商
- **预设模型**：每个服务商预设支持的模型列表，包含能力标签（推理、多模态等）和参数限制（上下文窗口、最大输出）
- **模型注册表**：`src/shared/model-registry/` 包含完整的模型和服务商定义
- **自定义服务商**：支持添加 OpenAI 兼容协议的自定义服务商

## 安全设计

### 文件操作安全

- 所有文件路径都经过 `ensureWithinVault` 校验，防止越权访问
- `write` 工具覆盖文件时需要 `base_sha` 校验，防止意外覆盖
- `delete` 工具需要 `confirm: true` 才能执行

### 命令执行安全

- `bash` 工具在 Vault 目录下执行，有超时限制（默认 2 分钟，最大 10 分钟）
- 危险命令由 AI 在执行前说明，用户可自行判断

### 网络安全

- `web_fetch` 自动将 HTTP 升级为 HTTPS
- 网络操作不涉及用户凭证

## 启动与首屏性能

- **树与 Watcher**：首屏仅拉 `readTreeRoot`（depth=0），展开节点才调 `readTreeChildren`。
- **懒加载**：Editor/Chat/Shiki/编辑器扩展均 lazy chunk，Skeleton 兜底。
- **Warmup**：idle 阶段仅 `import()` 预热少量重模块（如 ChatPane/Shiki），不做 IPC/落盘缓存，保证交互稳定。

## 开发命令

```bash
# 开发模式
pnpm dev

# 类型检查
pnpm typecheck

# 运行工具测试
pnpm test:tools

# 构建
pnpm build

# 打包（本地）
pnpm dist:mac   # macOS
pnpm dist:win   # Windows
pnpm dist:linux # Linux
```

## 发布流程

发布新版本使用项目根目录下的 `release.sh` 脚本，会自动完成版本更新、Git tag 创建和推送，触发 GitHub Actions 构建。

```bash
# 在项目根目录执行
./apps/pc/scripts/release.sh <version>

# 示例
./apps/pc/scripts/release.sh 0.2.13      # 正式版本
./apps/pc/scripts/release.sh 0.2.13-beta # 预发布版本
```

### 发布流程说明

1. **检查 Git 状态**：如有未提交更改会提示确认
2. **检查 Tag**：确保版本号未被使用
3. **更新版本**：自动修改 `package.json` 中的 version
4. **提交更改**：创建版本更新的 commit
5. **创建 Tag**：创建带注释的 Git tag
6. **推送远程**：推送 commit 和 tag 到 GitHub
7. **触发构建**：GitHub Actions 自动构建并发布

### 下载地址

构建完成后，安装包将在以下位置可用：

- **GitHub Releases**：https://github.com/dvlin-dev/moryflow/releases
- **国内加速**：https://download.moryflow.com/{version}/

## 已知问题

- Vault Tree 未做虚拟滚动，大型仓库会多次触发全量渲染，性能需关注。
- Settings Dialog 中有 4 个预先存在的 TypeScript 类型错误（与 MCP 表单相关）。
- 大于 32KB 的附件会被截断，二进制文件暂未做自动解析。

## 后续计划

1. **虚拟滚动优化**：为大型 Vault 提供更好的性能
2. **附件处理增强**：支持更多文件类型的智能处理
3. **多 Agent 协作**：探索多 Agent Pipeline 能力
4. **MCP 健康检查**：提供服务器连接状态反馈
