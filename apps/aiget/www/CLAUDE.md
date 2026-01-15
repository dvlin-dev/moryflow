# WWW (Aiget Dev Website)

> This folder structure changes require updating this document.

## Overview

Aiget Dev 官网（`aiget.dev`），包含模块页 `/fetchx`、`/memox`。基于 TanStack Start（SSR），包含 Fetchx Demo Playground 和 Digest Reader 首页。

## Responsibilities

- 平台官网（统一入口）
- 模块页路由：Fetchx / Memox
- Docs 外链入口：`https://docs.aiget.dev`
- Fetchx Demo Playground（验证码保护）
- Digest Public Pages（SEO）：Topics / Editions（`/topics`）
- **首页 Reader 三栏布局**：Discover Feed / Topics 浏览与预览 / Inbox / Article Detail
- Reader 内操作不跳页：登录/注册/忘记密码通过全局 Auth 弹窗完成
- Reader-only：不保留 `/settings` 等独立用户页面路由
- Pricing / Code Examples / CTA
- Root error boundary：异常时展示友好兜底页（`routes/__root.tsx`）

## Constraints

- Server-side rendering (SSR)
- Public access (no auth)
- Cloudflare Turnstile for captcha
- Demo API has rate limits
- 组件统一从 `@aiget/ui` 导入，图标统一 Hugeicons
- 全局样式仅引入 `@aiget/ui/styles`，`@source` 只扫描本应用源码
- Docker 构建固定使用 pnpm@9.12.2（避免 corepack pnpm@9.14+ 在容器内出现 depNode.fetching 报错）
- Docker 构建安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃
- Vite `vite-tsconfig-paths` 需跳过 `archive/external-repos`，避免外部仓库 tsconfig 解析失败

## 环境变量

- `VITE_API_URL`：后端 API 地址（生产必填）
- 生产环境默认：`https://server.aiget.dev`
- `VITE_TURNSTILE_SITE_KEY`：Turnstile Site Key（可选）
- 示例文件：`.env.example`

## Directory Structure

| Directory                | Description                     |
| ------------------------ | ------------------------------- |
| `routes/`                | File-based routing (TanStack)   |
| `components/reader/`     | Reader layout components        |
| `components/landing/`    | Landing page sections           |
| `components/memox/`      | Memox module page sections      |
| `components/playground/` | Demo playground UI              |
| `components/layout/`     | Header, Footer                  |
| `features/digest/`       | Digest API, hooks, types        |
| `features/discover/`     | Discover feed API, hooks, types |
| `features/reader/`       | Reader page composition         |
| `hooks/`                 | Custom hooks                    |
| `lib/`                   | API calls, utilities            |
| `types/`                 | Type definitions                |
| `styles/`                | Global styles                   |

## Components

### Reader Components (首页)

| Component                    | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| `ReaderLayout`               | Three-column layout container                   |
| `MobileReaderLayout`         | Mobile-optimized layout                         |
| `SidePanel`                  | Left sidebar (Discover/Inbox/Subscriptions)     |
| `ArticleList`                | Middle column article list (Inbox)              |
| `ArticleCard`                | Article card in list                            |
| `ArticleDetail`              | Right column article detail                     |
| `DiscoverFeedList`           | Middle column discover feed (Featured/Trending) |
| `DiscoverFeedCard`           | Discover feed item card                         |
| `DiscoverDetail`             | Right column discover item detail               |
| `WelcomeGuide`               | Welcome guide for new users                     |
| `CreateSubscriptionDialog`   | Create subscription dialog                      |
| `SubscriptionSettingsDialog` | Subscription settings dialog                    |

### Landing Sections

| Component            | Description          |
| -------------------- | -------------------- |
| `HeroSection`        | Main hero with CTA   |
| `FeaturesSection`    | Feature highlights   |
| `UseCasesSection`    | Use case examples    |
| `PricingSection`     | Pricing tiers        |
| `CodeExampleSection` | API code samples     |
| `StatsSection`       | Platform statistics  |
| `CTASection`         | Final call-to-action |

### Playground Components

| Component         | Description               |
| ----------------- | ------------------------- |
| `HeroPlayground`  | Main playground in hero   |
| `QuickPlayground` | Compact playground widget |
| `UrlInput`        | URL input with validation |
| `ResultPreview`   | Scrape result display     |
| `PresetButtons`   | Quick preset URLs         |
| `Turnstile`       | Cloudflare captcha        |

## Features

### Digest Feature (`features/digest/`)

- `api.ts` - Digest API functions (subscriptions, inbox, runs, topics)
- `hooks.ts` - React Query hooks for digest operations
- `types.ts` - TypeScript type definitions

### Discover Feature (`features/discover/`)

- `api.ts` - Discover API functions (feed, featured/trending topics)
- `hooks.ts` - React Query hooks for discover operations
- `types.ts` - TypeScript type definitions

## Routes

```
routes/
├── __root.tsx      # Root layout
├── index.tsx       # Homepage (Reader three-column layout)
├── fetchx.tsx      # Fetchx module page (/fetchx)
├── memox.tsx       # Memox module page (/memox)
├── login.tsx       # Auth route (opens Auth modal over Reader)
├── register.tsx    # Auth route (opens Auth modal over Reader)
├── forgot-password.tsx # Auth route (opens Auth modal over Reader)
├── topics/         # Public topic pages
└── developer.tsx   # Developer hub page (/developer)
```

## Key Files

| File                              | Description                    |
| --------------------------------- | ------------------------------ |
| `lib/api-client.ts`               | API client with cookie auth    |
| `lib/api-paths.ts`                | Centralized API path constants |
| `lib/env.ts`                      | Public environment config      |
| `hooks/useCaptchaVerification.ts` | Turnstile captcha hook         |
| `hooks/useKeyboardShortcuts.ts`   | Reader keyboard shortcuts      |
| `hooks/useIsMobile.ts`            | Mobile detection hook          |
| `entry-client.tsx`                | Client hydration               |
| `entry-server.tsx`                | SSR entry point                |

## Homepage View Flow

```
未登录用户:
  默认显示 Discover Feed (Featured) → 可切换 Trending / Browse topics → 右栏预览

已登录用户（有订阅）:
  默认显示 Inbox (All) → 可切换 Saved/Subscription → 显示 ArticleDetail

已登录用户（无订阅）:
  默认显示 Inbox 空状态（WelcomeGuide）→ 引导创建订阅 / 浏览 Topics
```

## Common Modification Scenarios

| Scenario             | Files to Modify                         | Notes                    |
| -------------------- | --------------------------------------- | ------------------------ |
| Add landing section  | `components/landing/`                   | Create section component |
| Update pricing       | `components/landing/PricingSection.tsx` |                          |
| Change playground    | `components/playground/`                |                          |
| Add captcha rule     | `hooks/useCaptchaVerification.ts`       |                          |
| Update reader layout | `components/reader/`                    |                          |
| Add digest API       | `features/digest/api.ts`                |                          |
| Add discover API     | `features/discover/api.ts`              |                          |

## Dependencies

```
www/
├── @tanstack/start - SSR framework
├── @tanstack/react-query - Data fetching
├── @aiget/ui - UI components
├── @hugeicons/core-free-icons - Icon library
├── turnstile - Cloudflare captcha
└── tailwindcss - Styling
```

## Key Exports

This is a standalone app, no exports to other packages.
