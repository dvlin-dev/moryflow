# Admin

> Warning: When this folder structure changes, you MUST update this document

## Position

Admin dashboard for the Memai platform. React 19 + Vite application for system administration: user management, subscriptions, orders, and platform metrics.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite |
| Routing | React Router v7 |
| State | Zustand (auth) + React Query (server state) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |

## Directory Structure

```
apps/admin/src/
├── App.tsx                     # Router + ProtectedRoute
├── main.tsx                    # Entry point
├── stores/
│   └── auth.ts                 # Zustand auth store (persist)
├── lib/
│   ├── api-client.ts           # Centralized API client
│   ├── api-paths.ts            # API endpoint constants
│   ├── types.ts                # Shared types (PaginatedResponse)
│   ├── subscription.types.ts   # Subscription enums
│   ├── formatters.ts           # Format utilities
│   ├── badge-variants.ts       # Badge styling logic
│   └── labels.ts               # Label utilities
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── UsersPage.tsx
│   ├── SubscriptionsPage.tsx
│   └── OrdersPage.tsx
├── components/
│   └── layout/
│       └── main-layout.tsx     # Sidebar + header layout
├── features/
│   ├── users/                  # User management
│   ├── orders/                 # Order management
│   ├── subscriptions/          # Subscription management
│   └── dashboard/              # Dashboard metrics
└── index.css                   # Global styles
```

## Constraints

- Use `apiClient` for ALL API requests
- Use `rounded-none` for all UI components
- Admin-only access: `ProtectedRoute` checks `isAuthenticated && user?.isAdmin`
- Follow feature module pattern identical to console app

## Routes

```
/login          # Public - admin login
/unauthorized   # Public - access denied
/               # Protected - dashboard (admin only)
/users          # Protected - user management
/orders         # Protected - order management
/subscriptions  # Protected - subscription management
```

## Key Differences from Console

| Aspect | Admin | Console |
|--------|-------|---------|
| Purpose | System administration | User self-service |
| Auth | Admin role required | Any authenticated user |
| Features | Users, orders, subscriptions | API keys, memories, webhooks |
| Auth storage key | `memory-admin-auth` | `auth-storage` |
| Dev port | 5174 | 5173 |

## Feature Module Pattern

Same as console app:
```
feature-name/
├── api.ts          # API client calls
├── types.ts        # TypeScript interfaces
├── hooks.ts        # React Query hooks
└── index.ts        # Public exports
```

## Development Commands

```bash
pnpm --filter admin dev       # Start dev server (port 5174)
pnpm --filter admin build     # Build for production
pnpm --filter admin typecheck # Type checking
```

## API Endpoints

```
Authentication:
  POST /api/admin/login       # Admin login
  POST /api/admin/logout      # Admin logout

Management:
  GET  /api/admin/users       # List users
  GET  /api/admin/users/:id   # Get user detail
  PATCH /api/admin/users/:id  # Update user
  DELETE /api/admin/users/:id # Delete user

  GET  /api/admin/subscriptions
  GET  /api/admin/orders
  GET  /api/admin/dashboard   # Dashboard metrics
```

## Common Modification Scenarios

| Scenario | Files | Notes |
|----------|-------|-------|
| Add new admin page | `pages/`, `App.tsx` | Add route, update sidebar |
| Add management feature | Create in `features/` | Follow module pattern |
| Add dashboard widget | `features/dashboard/` | Use Recharts for charts |

## Dependencies

```
This app
├── depends on → @memai/ui (shared components)
├── depends on → apps/server (API backend)
└── peers with → apps/console (similar architecture)
```

---

*See root [CLAUDE.md](../../CLAUDE.md) for global conventions*
