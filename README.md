# Moryflow

[English](./README.md) | [简体中文](./README.zh-CN.md)

Moryflow is a local-first AI agent workspace for knowledge work, publishing, and cross-device sync. This monorepo is centered on Moryflow, while also housing Anyhunt Dev as a sibling capability platform. The two product lines share infrastructure in `packages/*`, but they do not share identity, billing, or user data.

## What This Repository Contains

This repository is organized around two product lines:

- **Moryflow**: the main product — a local-first AI agent workspace with knowledge management, cloud sync, and one-click publishing
- **Anyhunt Dev**: a supporting platform that provides capability products such as Fetchx, Memox, and agent/browser infrastructure

At a high level:

```text
apps/
├── moryflow/
│   ├── pc/              # Electron desktop app
│   ├── server/          # Moryflow backend and API
│   ├── mobile/          # Expo mobile app
│   ├── www/             # Marketing site
│   ├── publish-worker/  # Cloudflare Worker for published sites
│   ├── site-template/   # Static site template system
│   ├── admin/
│   └── docs/
├── anyhunt/
│   ├── server/
│   ├── console/
│   ├── www/
│   ├── admin/
│   └── docs/
packages/
└── shared infrastructure used by both product lines
```

## Open-Source Foundations And Reusable Building Blocks

The architecture is built on top of a modern open-source stack:

- **Frontend**: React 19, Vite, Tailwind CSS v4, Tiptap
- **Desktop**: Electron
- **Mobile**: Expo, React Native
- **Backend**: NestJS, Prisma, PostgreSQL, Redis, BullMQ
- **AI runtime**: Vercel AI SDK, OpenAI Agents Core, MCP
- **Auth and validation**: Better Auth, Zod
- **Deployment**: Cloudflare Workers, R2, KV, Docker

The monorepo also contains reusable internal building blocks that are designed as shared infrastructure:

| Package                    | Role                                          |
| -------------------------- | --------------------------------------------- |
| `@moryflow/agents-runtime` | Shared agent runtime core                     |
| `@moryflow/agents-tools`   | Local and runtime tool surface                |
| `@moryflow/agents-mcp`     | MCP integration layer                         |
| `@moryflow/model-bank`     | Model/provider registry and schemas           |
| `@moryflow/api`            | Shared API contracts and clients              |
| `@moryflow/sync`           | Cloud sync contracts and shared logic         |
| `@moryflow/tiptap`         | Editor extensions and editor-facing utilities |
| `@moryflow/ui`             | Shared UI components                          |

## Moryflow

Moryflow is the main narrative of this repository. It combines a local-first knowledge base, autonomous AI agents, cloud sync, and one-click publishing into one product surface.

### Product pillars

- **Local-first knowledge base**: users work inside their own vault with full ownership — no cloud lock-in
- **Autonomous AI agents**: agents research, write, organize, and act on your notes and files — with adaptive memory that compounds over time
- **Open & extensible**: open source, 24+ AI providers with bring-your-own keys, and MCP tools for infinite extensibility
- **Cross-device sync**: PC and mobile share a server-authoritative cloud sync model
- **Publish to the web**: turn any note into a live website on `moryflow.app` — no separate CMS

### Architecture

Moryflow is split into a few clear runtime layers:

- **`apps/moryflow/pc`**: the primary and most complete product surface today. It owns the local workspace, editor, agent runtime, MCP management, Telegram channel integration, and site publishing UI.
- **`apps/moryflow/server`**: the backend for auth, sync, publishing, payment/credits foundations, speech services, and product APIs.
- **`apps/moryflow/mobile`**: the mobile client with editor, chat, and cloud sync foundations, following the same shared contracts where possible.
- **`apps/moryflow/www`**: the marketing site at `www.moryflow.com`.
- **`apps/moryflow/publish-worker`**: the Cloudflare Worker that serves published sites from edge storage.
- **`apps/moryflow/site-template`**: the rendering/template system used by the publishing flow.

In production terms:

- `www.moryflow.com` is the marketing entry
- `server.moryflow.com` is the app/API backend
- `moryflow.app` is the published-site domain

### Available today

Based on the current codebase, Moryflow already has these major capabilities in place:

- Local vault management and markdown-centered knowledge base
- Notion-like editor on desktop, plus mobile editor foundations
- Autonomous AI agents with tools, skills, subagents, MCP, and 24+ model providers (bring your own keys)
- Adaptive memory that persists context across sessions
- Server-authoritative cloud sync across desktop and mobile
- One-click publishing from markdown to live websites
- Remote agent access via Telegram (same context, same memory)
- Marketing site, backend API, and the shared package layer that powers the product family

### Current roadmap

The current roadmap is centered on product expansion rather than basic infrastructure:

- File revision history and stronger content lifecycle management
- Voice input and speech-to-text workflows across clients
- A more complete subscription, credits, and entitlement experience
- Better in-product automation and subscription guidance
- Broader external integrations built on top of the shared agent and platform capabilities
- Continued expansion of the mobile product surface toward stronger parity with desktop

## Anyhunt Dev

Anyhunt Dev is the sibling platform in the same monorepo. It is not the main product story here, but it matters because part of Moryflow is built alongside shared capability infrastructure.

Anyhunt currently covers:

- Developer-facing APIs and console flows
- Fetchx, Memox, and agent/browser capability modules
- Platform concerns such as API keys, quota, billing, and public capability delivery

The key boundary is simple:

- **Moryflow** and **Anyhunt Dev** are separate businesses
- They do **not** share accounts, tokens, databases, or billing
- They **do** share selected infrastructure packages from `packages/*`

## Development

### Root

```bash
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

### Common entry points

```bash
# Moryflow desktop
pnpm dev:moryflow:pc

# Anyhunt backend
pnpm dev:anyhunt

# Anyhunt web apps
pnpm dev:anyhunt:www
pnpm dev:console
pnpm dev:admin
```

## Documentation

- Repository context: [`docs/reference/repository-context.md`](./docs/reference/repository-context.md)
- Moryflow core docs: [`docs/design/moryflow/core/index.md`](./docs/design/moryflow/core/index.md)
- Moryflow feature docs: [`docs/design/moryflow/features/index.md`](./docs/design/moryflow/features/index.md)
- Anyhunt core docs: [`docs/design/anyhunt/core/index.md`](./docs/design/anyhunt/core/index.md)
- Reference index: [`docs/reference/index.md`](./docs/reference/index.md)
