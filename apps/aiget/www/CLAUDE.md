# WWW (Aiget Dev Website)

> This folder structure changes require updating this document.

## Overview

Aiget Dev 官网（`aiget.dev`），包含模块页 `/fetchx`、`/memox`。基于 TanStack Start（SSR），包含 Fetchx Demo Playground。

## Responsibilities

- 平台官网（统一入口）
- 模块页路由：Fetchx / Memox
- Docs 外链入口：`https://docs.aiget.dev`
- Fetchx Demo Playground（验证码保护）
- Pricing / Code Examples / CTA

## Constraints

- Server-side rendering (SSR)
- Public access (no auth)
- Cloudflare Turnstile for captcha
- Demo API has rate limits
- 组件统一从 `@aiget/ui` 导入，图标统一 Hugeicons
- Docker 构建固定使用 pnpm@9.12.2（避免 corepack pnpm@9.14+ 在容器内出现 depNode.fetching 报错）
- Docker 构建安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃

## 环境变量

- `VITE_API_URL`：后端 API 地址（生产必填）
- 生产环境默认：`https://server.aiget.dev`
- `VITE_TURNSTILE_SITE_KEY`：Turnstile Site Key（可选）
- 示例文件：`.env.example`

## Directory Structure

| Directory                | Description                   |
| ------------------------ | ----------------------------- |
| `routes/`                | File-based routing (TanStack) |
| `components/landing/`    | Landing page sections         |
| `components/memox/`      | Memox module page sections    |
| `components/playground/` | Demo playground UI            |
| `components/layout/`     | Header, Footer                |
| `hooks/`                 | Custom hooks                  |
| `lib/`                   | API calls, utilities          |
| `types/`                 | Type definitions              |
| `styles/`                | Global styles                 |

## Components

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

## Routes

```
routes/
├── __root.tsx      # Root layout
├── index.tsx       # Aiget Dev homepage (/)
├── fetchx.tsx      # Fetchx module page (/fetchx)
└── memox.tsx       # Memox module page (/memox)
```

## Key Files

| File                              | Description               |
| --------------------------------- | ------------------------- |
| `lib/api.ts`                      | Demo scrape API calls     |
| `lib/env.ts`                      | Public environment config |
| `hooks/useCaptchaVerification.ts` | Turnstile captcha hook    |
| `entry-client.tsx`                | Client hydration          |
| `entry-server.tsx`                | SSR entry point           |

## Demo Flow

```
User enters URL → Captcha verification → Demo API call → Display result
```

## Common Modification Scenarios

| Scenario            | Files to Modify                         | Notes                    |
| ------------------- | --------------------------------------- | ------------------------ |
| Add landing section | `components/landing/`                   | Create section component |
| Update pricing      | `components/landing/PricingSection.tsx` |                          |
| Change playground   | `components/playground/`                |                          |
| Add captcha rule    | `hooks/useCaptchaVerification.ts`       |                          |

## Dependencies

```
www/
├── @tanstack/start - SSR framework
├── @aiget/ui - UI components
├── @hugeicons/core-free-icons - Icon library
├── turnstile - Cloudflare captcha
└── tailwindcss - Styling
```

## Key Exports

This is a standalone app, no exports to other packages.
