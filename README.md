<p align="center">
  <img src="apps/moryflow/www/public/logo.svg" width="64" height="64" alt="Moryflow" />
</p>

<h1 align="center">Moryflow</h1>

<p align="center">
  <strong>Local-first AI Agent Workspace</strong>
</p>

<p align="center">
  AI agents that work with your knowledge, notes, and files.<br/>
  Capture results as durable knowledge and publish to the web.
</p>

<p align="center">
  <a href="https://www.moryflow.com">Website</a> ·
  <a href="https://www.moryflow.com/download">Download</a> ·
  <a href="https://discord.gg/cyBRZa9zJr">Discord</a> ·
  <a href="https://github.com/dvlin-dev/moryflow">GitHub</a>
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a>
</p>

---

## Features

### Autonomous AI Agents

Assign the task, your agent does the work — research, write, organize, and act on your notes and files. Agents are first-class workspace members, not bolt-on chat windows.

### Local-first Knowledge Base

Your knowledge stays on your device. Full ownership, no cloud lock-in — sync only when you choose. Your notes are files on your machine that you fully control.

### Adaptive Memory

Agents remember your preferences, projects, and context across every session. The more you use Moryflow, the smarter your agents get.

### One-click Publishing

Turn any note into a live website. Digital gardens, portfolios, documentation — no separate CMS needed. Write locally, publish globally.

### Remote Agent (Telegram)

Your agents work wherever you are. Start tasks from Telegram — same context, same memory, always connected.

### Open & Extensible

Open source, 24+ AI providers with your own API keys, and MCP tools for infinite extensibility. MIT licensed — inspect, modify, and self-host.

## Download

Public builds are available for macOS (Apple Silicon and Intel).

**[Download for macOS →](https://www.moryflow.com/download)**

## Compare

| Feature                 | Moryflow |   Notion    |  Obsidian   | Manus |
| ----------------------- | :------: | :---------: | :---------: | :---: |
| Autonomous AI Agents    |    ✓     |      —      |      —      |   ✓   |
| Local-first Data        |    ✓     |      —      |      ✓      |   —   |
| Adaptive Memory         |    ✓     |      —      |      —      |   —   |
| Built-in Publishing     |    ✓     |      ✓      | Paid add-on |   —   |
| 24+ AI Providers (BYOK) |    ✓     |      —      | Via plugins |   —   |
| Open Source             |    ✓     |      —      |      —      |   —   |
| Desktop Native          |    ✓     | Web wrapper |      ✓      |   —   |
| Remote Agent (Telegram) |    ✓     |      —      |      —      |   —   |

[See all comparisons →](https://www.moryflow.com/compare)

## Project Structure

```text
apps/moryflow/
├── pc/                # Desktop app (Electron)
├── server/            # Backend API (NestJS)
├── mobile/            # Mobile app (Expo)
├── www/               # Website (TanStack Start)
├── publish-worker/    # Edge publishing (Cloudflare Worker)
└── site-template/     # Site template system

packages/
├── agents-runtime/    # Agent runtime core
├── agents-tools/      # Agent tool surface
├── agents-mcp/        # MCP integration
├── model-bank/        # Model/provider registry
├── api/               # Shared API contracts
├── sync/              # Cloud sync logic
├── tiptap/            # Editor extensions (Tiptap)
└── ui/                # UI components (React + Tailwind)
```

## Development

```bash
pnpm install
pnpm dev:moryflow:pc    # Desktop app
pnpm dev:moryflow:www   # Website
```

## Community

- [GitHub Discussions](https://github.com/dvlin-dev/moryflow/discussions)
- [Discord](https://discord.gg/cyBRZa9zJr)
- [Twitter / X](https://x.com/AnyHunt_)

## License

[MIT](./LICENSE)
