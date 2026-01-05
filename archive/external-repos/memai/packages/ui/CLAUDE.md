# UI Package

> Warning: When this folder structure changes, you MUST update this document

## Position

Shared React component library for the Memai platform. Built on shadcn/ui with Tailwind CSS v4 and custom extensions.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18/19 |
| Styling | Tailwind CSS v4 |
| Base | shadcn/ui (Radix UI) |
| Icons | Hugeicons |
| Charts | Recharts |

## Directory Structure

```
packages/ui/src/
├── components/
│   ├── primitives/           # 52 shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── ... (52 total)
│   │   └── index.ts
│   └── composed/             # 6 business components
│       ├── data-table.tsx
│       ├── page-header.tsx
│       ├── simple-pagination.tsx
│       ├── status-badge.tsx
│       ├── table-skeleton.tsx
│       └── index.ts
├── hooks/
│   ├── use-mobile.ts         # Mobile breakpoint detection
│   ├── use-pagination.ts     # Pagination logic
│   └── index.ts
├── lib/
│   ├── utils.ts              # cn() class utility
│   ├── format.ts             # Format functions
│   └── index.ts
├── styles/
│   └── globals.css           # Global Tailwind config
└── index.ts                  # Main exports
```

## Export Structure

```typescript
// Import paths
import { Button, Card } from '@memai/ui/primitives'
import { DataTable, PageHeader } from '@memai/ui/composed'
import { useIsMobile, usePagination } from '@memai/ui/hooks'
import { cn, formatDate, formatCurrency } from '@memai/ui/lib'
```

## Constraints

- ALL components use `rounded-none` (no rounded corners)
- Follow Radix UI data attribute conventions
- Use oklch colors for theme variables
- Components must be React 18/19 compatible

## Primitive Components (52)

Form inputs, layout, data display, overlays, navigation, feedback, utilities:
- Form: `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `toggle`, `switch`
- Layout: `card`, `separator`, `sidebar`, `breadcrumb`
- Display: `table`, `pagination`, `badge`, `avatar`, `skeleton`
- Overlay: `dialog`, `sheet`, `popover`, `tooltip`, `dropdown-menu`
- Navigation: `tabs`, `accordion`, `menubar`
- Feedback: `alert`, `progress`, `sonner`

## Composed Components (6)

| Component | Purpose |
|-----------|---------|
| `DataTable` | Table with data management |
| `PageHeader` | Page header layout |
| `SimplePagination` | Pagination UI |
| `StatusBadge` | Status display |
| `TableSkeleton` | Loading skeleton |

## Utility Functions

```typescript
// Class name merging
cn('base-class', conditional && 'conditional-class')

// Formatting
formatDate(date)           // "Jan 1, 2024"
formatDateTime(date)       // "Jan 1, 2024 12:00 PM"
formatCurrency(cents)      // "$10.00"
formatFileSize(bytes)      // "1.5 MB"
formatNumber(num)          // "1,234"
formatRelativeTime(date)   // "2 hours ago"

// Expiry checks
isExpiringSoon(date)       // boolean
isExpired(date)            // boolean
```

## Adding Components

```bash
# Add new shadcn/ui component
pnpm --filter ui dlx shadcn@latest add [component-name]
```

## Dependencies

```
@memai/ui
├── depended by ← apps/console
├── depended by ← apps/admin
├── depended by ← apps/www
└── depended by ← apps/docs
```

---

*See root [CLAUDE.md](../../CLAUDE.md) for global conventions*
