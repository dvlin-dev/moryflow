# Console

> This folder structure changes require updating this document.

## Overview

User-facing dashboard for managing API keys, testing scraping capabilities, and configuring webhooks. Built with React + Vite.

## Responsibilities

- Dashboard with usage statistics
- API key management (create, delete, view)
- Screenshot playground for testing
- Webhook configuration
- User account settings

## Constraints

- Uses SessionGuard authentication (cookie-based)
- All API calls via `/api/v1/console/*` endpoints
- Zustand for auth state, React Query for data
- UI style: rounded-none, orange accent

## Directory Structure

| Directory | Description |
|-----------|-------------|
| `pages/` | Route page components |
| `features/` | Feature modules with hooks, API, components |
| `components/` | Shared layout and UI components |
| `lib/` | Utilities, API client, validations |
| `stores/` | Zustand state stores |
| `constants/` | Shared constants |
| `styles/` | Global styles |

## Features

| Feature | Path | Description |
|---------|------|-------------|
| `api-keys/` | `/api-keys` | API key CRUD operations |
| `playground/` | `/playground` | Screenshot testing interface |
| `screenshots/` | `/screenshots` | Screenshot history |
| `webhooks/` | `/webhooks` | Webhook management |
| `settings/` | `/settings` | User profile settings |
| `embed-playground/` | `/embed-playground` | Embed script testing |
| `auth/` | `/login` | Login form |

## Feature Module Structure

```
feature-name/
├── api.ts           # API calls (React Query mutations)
├── types.ts         # Feature-specific types
├── hooks.ts         # Custom hooks (React Query queries)
├── components/      # Feature components
└── index.ts         # Exports
```

## Key Files

| File | Description |
|------|-------------|
| `lib/api-client.ts` | HTTP client with auth, response unwrapping |
| `lib/api-paths.ts` | Centralized API endpoint constants |
| `stores/auth.store.ts` | Zustand auth state |
| `components/layout/MainLayout.tsx` | App shell with sidebar |
| `components/layout/AppSidebar.tsx` | Navigation sidebar |

## Common Modification Scenarios

| Scenario | Files to Modify | Notes |
|----------|-----------------|-------|
| Add new page | `pages/`, routing config | Create page + route |
| Add new feature | `features/*/` | Create api, hooks, components |
| Add API endpoint | `lib/api-paths.ts` | Add to CONSOLE_API object |
| Change layout | `components/layout/` | MainLayout, Sidebar |
| Add form validation | `lib/validations/` | Zod schemas |

## Routing

```tsx
// React Router v6 with protected routes
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/api-keys" element={<ApiKeysPage />} />
  ...
</Route>
```

## API Patterns

```typescript
// lib/api-paths.ts
export const CONSOLE_API = {
  API_KEYS: '/api/v1/console/api-keys',
  WEBHOOKS: '/api/v1/console/webhooks',
  ...
} as const

// features/api-keys/api.ts
export function useCreateApiKey() {
  return useMutation({
    mutationFn: (data) => apiClient.post(CONSOLE_API.API_KEYS, data)
  })
}
```

## Dependencies

```
console/
├── @aiget/ui - UI components
├── @tanstack/react-query - Data fetching
├── zustand - Auth state
├── react-router-dom - Routing
├── zod - Validation
└── sonner - Toast notifications
```

## Key Exports

This is a standalone app, no exports to other packages.
