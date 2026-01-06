# Console Features

> This folder structure changes require updating this document.

## Overview

Feature modules for the user console. Each feature is self-contained with its own API calls, hooks, types, and components.

## Feature Module Pattern

Each feature follows this structure:
```
feature-name/
├── api.ts           # React Query mutations
├── hooks.ts         # React Query queries
├── types.ts         # Feature-specific types
├── components/      # Feature components
└── index.ts         # Barrel exports
```

## Features

| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| `api-keys/` | API key CRUD | `/api/v1/console/api-keys` |
| `auth/` | Login/logout flow | `/api/auth/*` |
| `playground/` | Screenshot testing | `/api/v1/demo/scrape` |
| `screenshots/` | Screenshot history | `/api/v1/console/screenshots` |
| `settings/` | User profile settings | `/api/v1/console/user` |
| `webhooks/` | Webhook management | `/api/v1/console/webhooks` |
| `embed-playground/` | Embed script testing | Demo only |

## Key Files Per Feature

### api-keys/
- `components/create-api-key-dialog.tsx` - Key creation modal
- `components/api-key-table.tsx` - Key list with actions
- `hooks.ts` - useApiKeys, useCreateApiKey, useDeleteApiKey

### playground/
- `components/playground-form.tsx` - URL input and options
- `components/result-preview.tsx` - Scrape result display
- `components/format-tabs.tsx` - Output format selection
- `hooks.ts` - useScrape mutation

### webhooks/
- `components/webhook-table.tsx` - Webhook list
- `components/create-webhook-dialog.tsx` - Create modal
- `components/edit-webhook-dialog.tsx` - Edit modal
- `hooks.ts` - useWebhooks, useCreateWebhook, useUpdateWebhook

### settings/
- `components/profile-form.tsx` - User profile editor
- `components/password-form.tsx` - Password change
- `components/danger-zone.tsx` - Account deletion

## Common Patterns

### API Mutation
```typescript
// api.ts
export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateApiKeyInput) =>
      apiClient.post(CONSOLE_API.API_KEYS, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}
```

### Query Hook
```typescript
// hooks.ts
export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiClient.get<ApiKey[]>(CONSOLE_API.API_KEYS),
  })
}
```

## Common Modification Scenarios

| Scenario | Files to Modify | Notes |
|----------|-----------------|-------|
| Add feature | Create new directory | Follow module pattern |
| Add API call | `api.ts` | Use apiClient from lib/ |
| Add component | `components/` | Import UI from @aiget/ui |
| Add form | `components/`, parent's `lib/validations/` | Use Zod schema |

## Dependencies

All features use:
- `@tanstack/react-query` - Data fetching
- `@aiget/ui` - UI components
- `../lib/api-client` - HTTP client
- `../lib/api-paths` - Endpoint constants
- `zod` - Form validation
