# WWW (Landing Page)

> This folder structure changes require updating this document.

## Overview

Public landing page with interactive demo playground. Built with TanStack Start (SSR).

## Responsibilities

- Marketing landing page
- Interactive scraping demo
- Pricing information
- Captcha-protected playground

## Constraints

- Server-side rendering (SSR)
- Public access (no auth)
- Cloudflare Turnstile for captcha
- Demo API has rate limits

## Directory Structure

| Directory | Description |
|-----------|-------------|
| `routes/` | File-based routing (TanStack) |
| `components/landing/` | Landing page sections |
| `components/playground/` | Demo playground UI |
| `components/layout/` | Header, Footer |
| `hooks/` | Custom hooks |
| `lib/` | API calls, utilities |
| `types/` | Type definitions |
| `styles/` | Global styles |

## Components

### Landing Sections

| Component | Description |
|-----------|-------------|
| `HeroSection` | Main hero with CTA |
| `FeaturesSection` | Feature highlights |
| `UseCasesSection` | Use case examples |
| `PricingSection` | Pricing tiers |
| `CodeExampleSection` | API code samples |
| `StatsSection` | Platform statistics |
| `CTASection` | Final call-to-action |

### Playground Components

| Component | Description |
|-----------|-------------|
| `HeroPlayground` | Main playground in hero |
| `QuickPlayground` | Compact playground widget |
| `UrlInput` | URL input with validation |
| `ResultPreview` | Scrape result display |
| `PresetButtons` | Quick preset URLs |
| `Turnstile` | Cloudflare captcha |

## Routes

```
routes/
├── __root.tsx      # Root layout
└── index.tsx       # Landing page (/)
```

## Key Files

| File | Description |
|------|-------------|
| `lib/api.ts` | Demo scrape API calls |
| `lib/env.ts` | Public environment config |
| `hooks/useCaptchaVerification.ts` | Turnstile captcha hook |
| `entry-client.tsx` | Client hydration |
| `entry-server.tsx` | SSR entry point |

## Demo Flow

```
User enters URL → Captcha verification → Demo API call → Display result
```

## Common Modification Scenarios

| Scenario | Files to Modify | Notes |
|----------|-----------------|-------|
| Add landing section | `components/landing/` | Create section component |
| Update pricing | `components/landing/PricingSection.tsx` | |
| Change playground | `components/playground/` | |
| Add captcha rule | `hooks/useCaptchaVerification.ts` | |

## Dependencies

```
www/
├── @tanstack/start - SSR framework
├── @aiget/ui - UI components
├── turnstile - Cloudflare captcha
└── tailwindcss - Styling
```

## Key Exports

This is a standalone app, no exports to other packages.
