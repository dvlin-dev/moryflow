# Console

> Warning: When this folder structure changes, you MUST update this document

## Position

User-facing web console for the Memai platform. React 19 + Vite application for managing API keys, memories, webhooks, and account settings.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite |
| Routing | React Router v7 |
| State | Zustand (auth) + React Query (server state) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Forms | React Hook Form + Zod |
| Charts | Recharts |

## Directory Structure

```
apps/console/src/
├── App.tsx                     # Router + providers
├── main.tsx                    # Entry point
├── stores/
│   └── auth.ts                 # Zustand auth store (persist)
├── lib/
│   ├── api-client.ts           # Centralized API client
│   ├── api-paths.ts            # API endpoint constants
│   └── validations/            # Zod schemas
├── pages/                      # Route pages
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── MemoryPlaygroundPage.tsx
│   ├── ApiKeysPage.tsx
│   ├── WebhooksPage.tsx
│   ├── WebhookDeliveriesPage.tsx
│   ├── EntitiesPage.tsx
│   ├── MemoriesPage.tsx
│   └── SettingsPage.tsx
├── components/
│   ├── layout/                 # MainLayout, AppSidebar, NavMain
│   ├── ui/                     # Custom UI extensions
│   └── shared/                 # Shared components
├── features/                   # Feature modules
│   ├── auth/                   # Login components
│   ├── api-keys/               # API key management
│   ├── webhooks/               # Webhook management
│   ├── memories/               # Memory operations
│   ├── entities/               # Entity management
│   ├── stats/                  # Usage statistics
│   └── settings/               # User settings
├── constants/
│   └── tier.ts                 # Subscription tiers
└── styles/
    └── globals.css             # Global Tailwind config
```

## Constraints

- Use `apiClient` for ALL API requests (handles auth token injection)
- Use `rounded-none` for all UI components (no rounded corners)
- Follow feature module pattern: `api.ts`, `types.ts`, `hooks.ts`, `components/`
- React Query for server state, Zustand only for auth

## Routes

```
/login              # Public - login page
/                   # Protected - dashboard
/playground         # Protected - API playground
/api-keys           # Protected - API key management
/webhooks           # Protected - webhook config
/webhook-deliveries # Protected - delivery logs
/entities           # Protected - entity management
/memories           # Protected - memory list
/settings           # Protected - account settings
```

## Feature Module Pattern

Each feature follows this structure:
```
feature-name/
├── api.ts          # API client calls
├── types.ts        # TypeScript interfaces
├── hooks.ts        # React Query hooks
├── components/     # Feature-specific components
├── constants.ts    # Feature constants [optional]
├── storage.ts      # Local storage utils [optional]
└── index.ts        # Public exports
```

## Development Commands

```bash
pnpm --filter console dev       # Start dev server (port 5173)
pnpm --filter console build     # Build for production
pnpm --filter console typecheck # Type checking
pnpm --filter console test      # Run tests
```

## API Client Usage

```typescript
// Always use apiClient, never direct fetch
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'

// GET request
const data = await apiClient.get<ApiKey[]>(CONSOLE_API.API_KEYS)

// POST request
const result = await apiClient.post<CreateResponse>(CONSOLE_API.API_KEYS, payload)

// Paginated request
const { items, pagination } = await apiClient.getPaginated<Memory>(CONSOLE_API.MEMORIES)
```

## Common Modification Scenarios

| Scenario | Files | Notes |
|----------|-------|-------|
| Add new page | `pages/`, `App.tsx` | Add route in App.tsx |
| Add API call | `features/*/api.ts`, `lib/api-paths.ts` | Define path constant first |
| Add feature | Create folder in `features/` | Follow module pattern |
| Add UI component | `components/` | Use shadcn/ui as base |

## Dependencies

```
This app
├── depends on → @memai/ui (shared components)
├── depends on → apps/server (API backend)
└── peers with → apps/admin (similar architecture)
```

---

*See root [CLAUDE.md](../../CLAUDE.md) for global conventions*
