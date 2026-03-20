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

Mory 是内置的 AI 助手，当前采用 Bash-First + session-scoped task 的轻量化运行时。主要能力包括：

- **Bash-First 本地执行**：通过沙盒 `bash` 完成文件读写、内容搜索、脚本执行与批量处理；Vault 外路径需走授权链路。
- **会话级任务清单**：`task` 工具只维护当前会话的 checklist snapshot，直接持久化到 session summary。
- **网络与媒体能力**：支持 `web_search`、`web_fetch`、`generate_image`。
- **技能与子代理**：支持 `skill` 加载启用中的本地 skill，`subagent` 负责复杂任务的委托执行。
- **MCP 扩展**：可按设置动态加载外部 MCP 工具。

### 配置与存储

- `vault:getRecent`、`chat-sessions`、`agent-settings` 等均使用 `electron-store`，避免额外后端。
- 主进程暴露统一的 `desktopAPI`（`src/preload/index.ts`），渲染层通过该 API 调用 IPC，无需直接触达 Node 能力。

## Agent 工具清单

Mory 当前默认工具面保持轻量，遵循“bash 负责本地执行，task 只负责会话清单，其余能力按需补充”的原则。

### 默认内置工具

| 工具             | 作用         | 说明                                                                         |
| ---------------- | ------------ | ---------------------------------------------------------------------------- |
| `bash`           | 沙盒命令执行 | 默认本地执行入口，文件操作/搜索/脚本都优先走 bash；Vault 外路径需要授权。    |
| `task`           | 轻量任务清单 | 维护当前会话的 checklist snapshot，仅支持 `get / set / clear_done`。         |
| `web_search`     | 网络搜索     | 搜索互联网获取最新信息。                                                     |
| `web_fetch`      | 网页抓取     | 获取网页内容并提取信息。                                                     |
| `generate_image` | 图片生成     | 调用模型生成图片。                                                           |
| `skill`          | 加载技能     | 按名称读取已启用的本地 skill 正文与引用文件。                                |
| `subagent`       | 子代理委托   | 启动单一能力面的子代理执行复杂任务，不再区分 `explore/research/batch` 角色。 |

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
├── index.ts                    # 主入口：组装模型、工具、权限、compaction、stream 生命周期
├── task-state-service.ts       # taskState 规范化与唯一写入口
├── task-state-runtime.ts       # taskState -> chatSessionStore -> session-event 广播桥接
├── prompt-resolution.ts        # system prompt / model params 解析
├── permission-runtime.ts       # 工具审批与全局权限模式
├── doom-loop-runtime.ts        # 循环调用防护
├── subagent-tools.ts           # 子代理工具面构建
├── skill-tool.ts               # skill 工具
├── tool-output-storage.ts      # 工具输出截断与落盘
├── runtime-config.ts           # JSONC runtime 配置
├── desktop-adapter.ts          # 桌面端能力适配
└── core/
    ├── chat-session.ts         # Session 适配与历史拼装
    ├── mcp-manager.ts          # MCP 服务与工具管理
    └── mcp-utils.ts            # MCP 辅助工具
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

- **GitHub Releases**：https://github.com/dvlin-dev/moryflow/releases（手动下载与应用内自动更新的唯一源）

当前公开平台：

- **macOS arm64**
- **macOS x64**
- **Windows**：暂不对外承诺，待发布链路恢复后再重新开放

## 已知问题

- Vault Tree 未做虚拟滚动，大型仓库会多次触发全量渲染，性能需关注。
- Settings Dialog 中有 4 个预先存在的 TypeScript 类型错误（与 MCP 表单相关）。
- 大于 32KB 的附件会被截断，二进制文件暂未做自动解析。

## 后续计划

1. **虚拟滚动优化**：为大型 Vault 提供更好的性能
2. **附件处理增强**：支持更多文件类型的智能处理
3. **多 Agent 协作**：探索多 Agent Pipeline 能力
4. **MCP 健康检查**：提供服务器连接状态反馈
