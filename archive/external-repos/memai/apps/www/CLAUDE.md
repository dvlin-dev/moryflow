# WWW (Marketing Website)

> Warning: When this folder structure changes, you MUST update this document

## Position

Marketing landing page for the Memai platform. TanStack Start application with interactive demo and pricing information.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start v1.144 |
| Runtime | Nitro (SSR) |
| Build | Vite v7 |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |

## Directory Structure

```
apps/www/src/
├── routes/
│   ├── __root.tsx           # Root layout with env context
│   └── index.tsx            # Home page (landing)
├── components/
│   ├── landing/
│   │   ├── HeroSection.tsx       # Main hero with CTAs
│   │   ├── PlaygroundSection.tsx # Interactive demo
│   │   ├── StatsSection.tsx      # Performance metrics
│   │   ├── UseCasesSection.tsx   # Use case cards
│   │   ├── CodeExampleSection.tsx # Code examples
│   │   ├── FeaturesSection.tsx   # Feature grid
│   │   ├── PricingSection.tsx    # Pricing table
│   │   ├── CTASection.tsx        # Call-to-action
│   │   └── index.ts
│   ├── playground/
│   │   ├── QuickPlayground.tsx   # Demo component
│   │   ├── QueryInput.tsx        # Search input
│   │   ├── PresetButtons.tsx     # Quick presets
│   │   ├── SearchResults.tsx     # Results display
│   │   ├── StatsBar.tsx          # Metrics bar
│   │   ├── Turnstile.tsx         # Cloudflare captcha
│   │   └── index.ts
│   └── layout/
│       ├── Header.tsx            # Sticky header
│       ├── Footer.tsx            # Multi-column footer
│       └── Container.tsx         # Responsive wrapper
├── lib/
│   ├── api.ts                # Backend API client
│   └── env.ts                # Public env interface
├── entry-server.tsx          # SSR handler
├── entry-client.tsx          # Client hydration
├── router.tsx                # TanStack Router
└── styles/globals.css        # Global styles
```

## Constraints

- SSR enabled (not prerendered)
- Sitemap generation enabled for SEO
- Turnstile CAPTCHA required for demo API calls
- Use `rounded-none` for all UI components

## Development Commands

```bash
pnpm --filter www dev       # Start dev server (port 3001)
pnpm --filter www build     # Build for production
pnpm --filter www typecheck # Type checking
```

## Key Features

- Interactive API playground with live demo
- Pricing comparison table (FREE, HOBBY, ENTERPRISE)
- Code examples (cURL, TypeScript)
- Use case showcase
- Trust indicators and stats

## Dependencies

```
www/
├── depends on → apps/server (demo API)
├── depends on → @memai/ui (shared components)
└── peers with → apps/docs (links to docs)
```

---

*See root [CLAUDE.md](../../CLAUDE.md) for global conventions*
