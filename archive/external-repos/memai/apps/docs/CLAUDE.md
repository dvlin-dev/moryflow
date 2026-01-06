# Docs (Documentation Site)

> Warning: When this folder structure changes, you MUST update this document

## Position

Technical documentation site for the Memai platform. Fumadocs-powered documentation with i18n support (English + Chinese).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start v1.145 |
| Docs Engine | Fumadocs v15.8 |
| Content | Content Collections + MDX |
| Search | Orama (with Chinese tokenizer) |
| Runtime | Nitro (SSR) |
| Build | Vite v7 |
| Styling | Tailwind CSS v4 |

## Directory Structure

```
apps/docs/
├── content/docs/              # MDX documentation
│   ├── index.mdx              # Docs home
│   ├── meta.json              # Root nav structure
│   ├── getting-started/
│   │   ├── index.mdx
│   │   ├── quickstart.mdx
│   │   ├── authentication.mdx
│   │   ├── *.zh.mdx           # Chinese translations
│   │   └── meta.json
│   ├── api-reference/
│   │   ├── memories.mdx
│   │   ├── entities.mdx
│   │   ├── relations.mdx
│   │   ├── webhooks.mdx
│   │   └── meta.json
│   └── guides/
│       ├── best-practices.mdx
│       ├── rate-limits.mdx
│       └── meta.json
├── src/
│   ├── routes/
│   │   ├── __root.tsx         # Root with I18nProvider
│   │   ├── index.tsx          # Root redirect
│   │   └── docs/$.tsx         # Dynamic docs page
│   ├── components/
│   │   ├── providers.tsx      # RootProvider wrapper
│   │   └── search-dialog.tsx  # Custom search
│   ├── lib/
│   │   ├── i18n.ts            # i18n config (en, zh)
│   │   ├── i18n/en.ts         # English translations
│   │   ├── layout.shared.tsx  # Base layout options
│   │   ├── source.ts          # Fumadocs loader
│   │   └── search.ts          # Server-side search
│   └── mdx-components.tsx     # MDX component registry
└── content-collections.ts     # Content config
```

## Constraints

- All documentation in MDX format
- Navigation structure via `meta.json` files
- Chinese translations use `.zh.mdx` suffix
- Search supports both English and Mandarin

## i18n Configuration

| Language | Code | Default |
|----------|------|---------|
| English | en | Yes |
| Chinese | zh | No |

## Development Commands

```bash
pnpm --filter docs dev       # Start dev server
pnpm --filter docs build     # Build for production
pnpm --filter docs typecheck # Type checking
```

## Adding Documentation

1. Create `.mdx` file in appropriate `content/docs/` subdirectory
2. Add frontmatter (title, description)
3. Update `meta.json` for navigation order
4. For Chinese: create parallel `.zh.mdx` file

## MDX Components

Available in MDX files:
- `Accordion`, `Tabs`, `Steps` - Content organization
- `Files` - File tree display
- `TypeTable` - Type documentation
- `Callout` - Notes/warnings
- `ImageZoom` - Zoomable images

## Dependencies

```
docs/
├── depends on → @memai/ui (shared components)
└── peers with → apps/www (cross-links)
```

---

*See root [CLAUDE.md](../../CLAUDE.md) for global conventions*
