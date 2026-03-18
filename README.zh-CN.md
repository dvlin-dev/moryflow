<p align="center">
  <img src="apps/moryflow/www/public/logo.svg" width="64" height="64" alt="Moryflow" />
</p>

<h1 align="center">Moryflow</h1>

<p align="center">
  <strong>本地优先的 AI 智能体工作空间</strong>
</p>

<p align="center">
  让 AI 智能体在你的知识、笔记和文件上下文中工作，<br/>
  把结果沉淀为可长期管理并可发布的知识资产。
</p>

<p align="center">
  <a href="https://www.moryflow.com/zh">官网</a> ·
  <a href="https://github.com/dvlin-dev/moryflow/releases">下载</a> ·
  <a href="https://discord.gg/cyBRZa9zJr">Discord</a>
</p>

<p align="center">
  <a href="./README.md">English</a>
</p>

---

## 核心特性

### 自主 AI 智能体

交给智能体，它来完成 —— 调研、写作、整理，基于你的笔记和文件自主执行。智能体是工作空间的一等公民，不是附加的聊天窗口。

### 本地优先知识库

知识留在你的设备上。完全自主，无云端锁定 —— 按需同步。你的笔记就是你机器上的文件，完全由你掌控。

### 自适应记忆

智能体记住你的偏好、项目和上下文，跨会话持久化。越用越懂你。

### 一键发布

将任何笔记变为线上网站。数字花园、作品集、文档 —— 无需单独的 CMS。本地写作，全球发布。

### 远程智能体（Telegram）

智能体随时随地工作。通过 Telegram 启动任务 —— 同样的上下文与记忆，始终在线。

### 开源 & 可扩展

完全开源、24+ AI 模型提供商自带 API Key、MCP 工具无限扩展。MIT 许可 —— 审查、修改、自托管。

## 下载

当前公开提供 macOS（Apple Silicon 与 Intel）桌面版本。

**[下载 macOS 版 →](https://github.com/dvlin-dev/moryflow/releases)**

## 对比

| 特性                     | Moryflow |  Notion  | Obsidian | Manus |
| ------------------------ | :------: | :------: | :------: | :---: |
| 自主 AI 智能体           |    ✓     |    —     |    —     |   ✓   |
| 本地优先数据             |    ✓     |    —     |    ✓     |   —   |
| 自适应记忆               |    ✓     |    —     |    —     |   —   |
| 一键发布                 |    ✓     |    ✓     | 付费插件 |   —   |
| 24+ AI 供应商 (自带 Key) |    ✓     |    —     | 通过插件 |   —   |
| 开源                     |    ✓     |    —     |    —     |   —   |
| 桌面原生                 |    ✓     | Web 封装 |    ✓     |   —   |
| 远程智能体 (Telegram)    |    ✓     |    —     |    —     |   —   |

[查看全部对比 →](https://www.moryflow.com/zh/compare)

## 项目结构

```text
apps/moryflow/
├── pc/                # 桌面端 (Electron)
├── server/            # 后端 API (NestJS)
├── mobile/            # 移动端 (Expo)
├── www/               # 官网 (TanStack Start)
├── publish-worker/    # 边缘发布 (Cloudflare Worker)
└── site-template/     # 站点模板系统

packages/
├── agents-runtime/    # Agent Runtime 核心
├── agents-tools/      # 智能体工具层
├── agents-mcp/        # MCP 接入层
├── model-bank/        # 模型/供应商注册表
├── api/               # 共享 API 契约
├── sync/              # 云同步逻辑
├── tiptap/            # 编辑器扩展 (Tiptap)
└── ui/                # UI 组件 (React + Tailwind)
```

## 开发

```bash
pnpm install
pnpm dev:moryflow:pc    # 桌面端
pnpm dev:moryflow:www   # 官网
```

## 社区

- [GitHub Discussions](https://github.com/dvlin-dev/moryflow/discussions)
- [Discord](https://discord.gg/cyBRZa9zJr)
- [Twitter / X](https://x.com/AnyHunt_)

## 许可证

[MIT](./LICENSE)
