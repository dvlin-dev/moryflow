# UI Package

> This folder structure changes require updating this document.

## Overview

Shared UI component library based on shadcn/ui + Radix UI. Used by all frontend apps (console, admin, www, docs).

## Responsibilities

- Provide reusable UI primitives
- Maintain consistent design system
- Export composed components
- Provide utility hooks

## Constraints

- **No rounded corners** - All components must use `rounded-none`
- Orange accent color for selected/active states
- Boxy and sharp design style
- Must override shadcn defaults for border radius

## Directory Structure

| Directory | Description |
|-----------|-------------|
| `src/components/primitives/` | Base shadcn/ui components |
| `src/components/composed/` | Higher-level composed components |
| `src/hooks/` | Shared React hooks |
| `src/lib/` | Utility functions |
| `src/styles/` | Global styles |

## Primitives (~53 components)

| Category | Components |
|----------|------------|
| **Inputs** | Button, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Toggle |
| **Feedback** | Alert, Badge, Progress, Skeleton, Toast (Sonner) |
| **Overlay** | Dialog, Drawer, Popover, Tooltip, DropdownMenu, ContextMenu, AlertDialog |
| **Layout** | Card, Separator, AspectRatio, ScrollArea, Collapsible, Accordion |
| **Navigation** | Tabs, NavigationMenu, Breadcrumb, Pagination, Sidebar |
| **Data** | Table, DataTable (with sorting/filtering), Calendar, Chart (Recharts) |
| **Misc** | Avatar, Command, Carousel, Form |

## Composed Components

| Component | Description |
|-----------|-------------|
| `DataTable` | Advanced table with pagination, sorting |
| `PageHeader` | Standard page header layout |
| `SimplePagination` | Custom pagination UI |
| `StatusBadge` | Status-specific badge styling |
| `TableSkeleton` | Loading skeleton for tables |

## Hooks

| Hook | Description |
|------|-------------|
| `use-mobile.ts` | Mobile responsiveness detection |
| `use-pagination.ts` | Pagination logic |

## Design System

### Colors (CSS Variables)

```css
/* Sidebar */
--sidebar-foreground: oklch(0.35 0 0);      /* Gray */
--sidebar-primary: oklch(0.65 0.18 45);     /* Orange */

/* Primary */
--primary: oklch(0.25 0 0);                 /* Dark gray */
```

### Border Radius Override

```tsx
// ✅ Required for all components
<Card className="rounded-none">
<Button className="rounded-none">
<Input className="rounded-none">

// ❌ Never use rounded corners
<Card className="rounded-lg">  // Wrong
```

## Import Patterns

```typescript
// Primitives
import { Button, Card, Dialog } from '@aiget/ui/primitives'

// Composed
import { DataTable, PageHeader } from '@aiget/ui/composed'

// Hooks
import { useMobile } from '@aiget/ui/hooks'

// Utils
import { cn } from '@aiget/ui/lib'
```

## Common Modification Scenarios

| Scenario | Files to Modify | Notes |
|----------|-----------------|-------|
| Add primitive | `src/components/primitives/` | Export from index |
| Add composed | `src/components/composed/` | Export from index |
| Add hook | `src/hooks/` | Export from hooks/index |
| Change theme | `src/styles/` | Update CSS variables |
| Fix border radius | Component file | Add `rounded-none` |

## Adding New Component

```bash
# Add from shadcn registry
pnpm dlx shadcn@latest add button

# Then manually add rounded-none to the component
```

## Dependencies

```
ui/
├── @radix-ui/* - Primitive components
├── tailwindcss v4 - Styling
├── class-variance-authority - Variant styling
├── clsx + tailwind-merge - Class utilities
├── recharts - Charts
└── sonner - Toasts
```

## Key Exports

```typescript
// lib/utils.ts
export { cn } from './lib/utils'

// hooks
export { useMobile } from './hooks/use-mobile'
export { usePagination } from './hooks/use-pagination'

// All primitives and composed from their respective indices
```
