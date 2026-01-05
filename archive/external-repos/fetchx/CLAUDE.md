# AIGet

> This document is the core guide for AI Agents. Following the [agents.md specification](https://agents.md/).

## Project Overview

**Web Data API for LLMs & AI** - Turn any URL into clean, LLM-ready data. Scrape pages, crawl sites, extract structured data, and more. A cost-effective web data extraction platform built for AI applications, indie developers, and small teams.

## Core Sync Protocol (Mandatory)

1. **Atomic Update Rule**: After any code change, you MUST sync update the related CLAUDE.md files
2. **Recursive Trigger**: File change → Update file header → Update directory CLAUDE.md → (if global impact) Update root CLAUDE.md
3. **Fractal Autonomy**: Any subdirectory's CLAUDE.md should enable AI to independently understand that module's context
4. **No Legacy Baggage**: No backward compatibility, delete/refactor unused code directly, no deprecated comments

## Project Structure

| Directory | Description | Detailed Spec |
| --- | --- | --- |
| `apps/server/` | Backend API + Web Data Engine (NestJS) | → `apps/server/CLAUDE.md` |
| `apps/console/` | User Console (React + Vite) | → `apps/console/CLAUDE.md` |
| `apps/admin/` | Admin Dashboard (React + Vite) | → `apps/admin/CLAUDE.md` |
| `apps/www/` | Landing Page with Demo Playground (TanStack Start) | → `apps/www/CLAUDE.md` |
| `apps/docs/` | Documentation Site (TanStack Start + Fumadocs) | → `apps/docs/CLAUDE.md` |
| `packages/ui/` | Shared UI Components (shadcn/ui based) | → `packages/ui/CLAUDE.md` |
| `packages/shared-types/` | Shared Type Definitions | → `packages/shared-types/CLAUDE.md` |
| `packages/embed/` | Embed Script Package | - |
| `packages/embed-react/` | React Embed Components | - |

### Tech Stack Quick Reference

| Layer | Technology |
| --- | --- |
| Frontend | Vite + React + TypeScript + TailwindCSS v4 + shadcn/ui (radix-lyra) |
| Backend | NestJS + Prisma + PostgreSQL + Redis + BullMQ |
| Screenshot Engine | Playwright + Sharp |
| Storage | Cloudflare R2 + CDN |
| Auth | Better Auth |
| Payment | Creem |
| Package Manager | pnpm workspace |

## Core Module Overview

### Server Module Structure

```
apps/server/src/
├── auth/           # Auth module (Better Auth)
├── user/           # User management
├── api-key/        # API Key management
├── quota/          # Quota management
├── scraper/        # Scrape API (core) - single URL content extraction
├── map/            # Map API - URL discovery
├── crawler/        # Crawl API - multi-page crawling
├── extract/        # Extract API - AI-powered data extraction
├── search/         # Search API - web search
├── batch-scrape/   # Batch Scrape API - bulk URL processing
├── demo/           # Demo API - playground for landing page
├── oembed/         # oEmbed API support
├── browser/        # Browser instance pool (global module)
├── payment/        # Payment processing (Creem)
├── storage/        # R2 storage
├── redis/          # Redis cache
├── queue/          # BullMQ queue
├── prisma/         # Database
├── email/          # Email service
├── webhook/        # Webhook notifications
├── config/         # Configuration (pricing tiers, etc.)
├── common/         # Shared guards, decorators
├── types/          # Shared type definitions
├── admin/          # Admin API
└── health/         # Health check
```

### Core Business Flow

1. **Scrape Request Flow**: Auth → Rate limit → URL security validation → Cache query → Quota deduction → Concurrency control → Browser render → Content extraction → Return result
2. **Crawl Request Flow**: Auth → URL validation → Create async job → Map site URLs → Queue scrape tasks → Aggregate results → Return job ID
3. **Quota Deduction Rules**: Monthly subscription quota first → Pay-as-you-go quota fallback → Auto-refund on failure
4. **Cache Strategy**: Global shared cache, cache hit = no quota deduction, returns `fromCache: true`

## Documentation

- **Documentation Index**: → [`docs/README.md`](./docs/README.md)
- **Architecture**: → [`docs/architecture/overview.md`](./docs/architecture/overview.md)
- **Testing**: → [`docs/architecture/testing.md`](./docs/architecture/testing.md)
- **Features**: → [`docs/features/`](./docs/features/) (scraper, extract, search, oembed)

## Collaboration Guidelines

- All communication, commits, and documentation in **English**
- Search first, don't guess: Use search to reference existing code before making changes
- Don't define business semantics: Confirm product/data meanings with stakeholders first
- Reuse first: Prioritize existing interfaces, types, and utilities
- Reference moryflow: This project is based on moryflow architecture, refer to `/Users/bowling/code/me/moryflow` when uncertain

## Workflow

1. **Plan**: Before changes, provide minimal scope plan with motivation and risks
2. **Execute**: Focus on single issue, don't blindly modify
3. **Verify**: Run lint/typecheck locally (`pnpm typecheck`), pass before committing
4. **Sync**: Update related CLAUDE.md (mandatory)

## Git Commit Specification

### Atomic Commits (Mandatory)

Each commit should contain **only one logical change**. Do NOT bundle multiple features, fixes, or changes into a single commit.

```bash
# ✅ Good: One logical change per commit
git commit -m "feat(screenshot): add fullPage option support"
git commit -m "fix(quota): correct monthly reset calculation"
git commit -m "docs(api): update rate limit documentation"

# ❌ Bad: Multiple unrelated changes in one commit
git commit -m "feat: add fullPage option, fix quota bug, update docs"
```

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

#### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, no logic change) |
| `refactor` | Code refactoring (no feature/fix) |
| `perf` | Performance improvement |
| `test` | Add or update tests |
| `chore` | Build, CI, dependencies |

#### Scopes

Use module/component names: `screenshot`, `quota`, `api-key`, `console`, `admin`, `docs`, `ui`, etc.

#### Examples

```bash
feat(screenshot): add WebP format support
fix(quota): handle edge case when monthly quota is zero
docs(api): add webhook configuration guide
refactor(browser): extract pool management to separate service
test(screenshot): add integration tests for full page capture
chore(deps): upgrade fumadocs to v15.3.0
```

### Benefits of Atomic Commits

1. **Easy Review** - Reviewers can understand each change in isolation
2. **Safe Revert** - Can revert a single feature without affecting others
3. **Clear History** - Git history tells a readable story
4. **Bisect Friendly** - `git bisect` works effectively to find bugs
5. **Cherry-pick Ready** - Can easily apply specific changes to other branches

### When to Split Commits

Split into separate commits when:
- Adding a new feature AND fixing an existing bug
- Refactoring code AND adding new functionality
- Updating dependencies AND making code changes
- Changing multiple unrelated modules

```bash
# Instead of one big commit, do:
git add apps/server/src/screenshot/
git commit -m "feat(screenshot): add delay option for dynamic content"

git add apps/console/src/pages/
git commit -m "feat(console): add delay slider to playground"

git add docs/
git commit -m "docs(api): document delay option"
```

## File Header Comment Specification

Key files should add comments at the beginning, format based on file type:

| File Type | Format |
| --- | --- |
| Service/Logic | `[INPUT]` / `[OUTPUT]` / `[POS]` |
| React Component | `[PROPS]` / `[EMITS]` / `[POS]` |
| Utility Functions | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| Type Definitions | `[DEFINES]` / `[USED_BY]` / `[POS]` |

Example:

```typescript
/**
 * [INPUT]: ScreenshotRequest - Screenshot request parameters
 * [OUTPUT]: ScreenshotResponse - Screenshot result or error
 * [POS]: Screenshot service core, called by screenshot.controller.ts
 *
 * [PROTOCOL]: When this file changes, you MUST update this header and the directory CLAUDE.md
 */
```

## Directory Specification

### Backend Module Structure (NestJS)

```
module-name/
├── dto/
│   ├── index.ts                    # DTO exports
│   └── module-name.schema.ts       # Zod schemas + inferred types + DTO classes
├── module-name.module.ts           # NestJS module definition
├── module-name.controller.ts       # API controller (ApiKeyGuard)
├── module-name-console.controller.ts # Console controller (SessionGuard) [optional]
├── module-name.service.ts          # Business logic
├── module-name.constants.ts        # Constants, enums, config
├── module-name.errors.ts           # Custom HttpException errors
├── module-name.types.ts            # External API types only [optional]
└── index.ts                        # Public exports
```

**File Responsibilities:**

| File | Purpose | Contains |
|------|---------|----------|
| `dto/*.schema.ts` | Validation + Types | Zod schemas, `z.infer<>` types, `createZodDto()` classes |
| `*.constants.ts` | Configuration | Enums, config values, error codes |
| `*.errors.ts` | Error handling | Custom `HttpException` subclasses |
| `*.types.ts` | External types only | Third-party API response structures (not for validation) |

### Frontend Component Structure

```
ComponentName/
├── index.ts              # Exports
├── ComponentName.tsx     # Main component
├── components/           # Sub-components
└── hooks/                # Component-specific hooks
```

## API Versioning Specification (Mandatory)

All business API endpoints MUST use versioned paths with `/api/v1` prefix.

### Backend Controller Rules

```typescript
// ✅ Correct: All business controllers must specify version: '1'
@Controller({ path: 'admin/users', version: '1' })
// Results in: /api/v1/admin/users

@Controller({ path: 'console/api-keys', version: '1' })
// Results in: /api/v1/console/api-keys

@Controller({ path: 'payment', version: '1' })
// Results in: /api/v1/payment

// ❌ Wrong: Never use VERSION_NEUTRAL for business APIs
@Controller({ path: 'admin/users', version: VERSION_NEUTRAL })
// Results in: /api/admin/users (missing v1!)
```

### Excluded from Versioning

| Path | Reason |
|------|--------|
| `/health/*` | Health check endpoints (infrastructure) |
| `/webhooks/*` | External webhook callbacks |
| `/api/auth/*` | Better Auth managed routes (third-party library) |

### Frontend API Path Constants

All frontend apps must use centralized API path constants:

```typescript
// ✅ Correct: Centralized in api-paths.ts
export const CONSOLE_API = {
  API_KEYS: '/api/v1/console/api-keys',
  WEBHOOKS: '/api/v1/console/webhooks',
} as const

// ✅ Correct: Use constants in API functions
import { CONSOLE_API } from '@/lib/api-paths'
return apiClient.get(CONSOLE_API.API_KEYS)

// ❌ Wrong: Hardcoded paths
return apiClient.get('/api/console/api-keys')
```

### API Conventions Reference

For API conventions and standards, see → [`docs/guides/api-conventions.md`](./docs/guides/api-conventions.md)

## Types & DTO Specification (Zod-First)

### Core Principle: Single Source of Truth

**All request/response types MUST derive from Zod schemas using `z.infer<>`.** Do NOT define duplicate TypeScript interfaces.

### File Organization

```
dto/
├── index.ts              # Export all DTOs
└── memory.schema.ts      # All schemas for this module
```

### Schema File Structure

```typescript
// dto/memory.schema.ts
import { z } from 'zod';
import { createZodDto } from '@wahyubucil/nestjs-zod-openapi';

// ========== Shared Field Schemas ==========

const ContentSchema = z
  .string()
  .min(1, 'Content is required')
  .max(10000, 'Content too long')
  .openapi({ description: 'Memory content', example: 'User prefers dark mode' });

const MetadataSchema = z
  .record(z.unknown())
  .optional()
  .openapi({ description: 'Custom metadata' });

// ========== Request Schemas ==========

export const CreateMemorySchema = z
  .object({
    content: ContentSchema,
    userId: z.string().optional(),
    metadata: MetadataSchema,
  })
  .openapi('CreateMemoryRequest');

export const UpdateMemorySchema = z
  .object({
    content: ContentSchema.optional(),
    metadata: MetadataSchema,
  })
  .openapi('UpdateMemoryRequest');

export const SearchMemorySchema = z
  .object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(100).default(10),
    threshold: z.number().min(0).max(1).default(0.7),
  })
  .openapi('SearchMemoryRequest');

// ========== Response Schemas ==========

export const MemorySchema = z
  .object({
    id: z.string(),
    content: z.string(),
    metadata: z.record(z.unknown()).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Memory');

// ========== Inferred Types (Single Source of Truth) ==========

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>;
export type SearchMemoryInput = z.infer<typeof SearchMemorySchema>;
export type Memory = z.infer<typeof MemorySchema>;

// ========== DTO Classes (NestJS + OpenAPI) ==========

export class CreateMemoryDto extends createZodDto(CreateMemorySchema) {}
export class UpdateMemoryDto extends createZodDto(UpdateMemorySchema) {}
export class SearchMemoryDto extends createZodDto(SearchMemorySchema) {}
export class MemoryDto extends createZodDto(MemorySchema) {}
```

### When to Use types.ts

**ONLY for external/third-party API structures that are NOT validated:**

```typescript
// ✅ Correct: types.ts for external API response
// External oEmbed API response structure (we don't validate this)
export interface OembedData {
  type: 'photo' | 'video' | 'link' | 'rich';
  version: '1.0';
  title?: string;
  html?: string;
}

// ❌ Wrong: Request/Response types in types.ts
// These should be in dto/*.schema.ts with Zod
export interface CreateMemoryRequest { ... }  // Don't do this
```

### Controller Usage

```typescript
// memory.controller.ts
import { ApiTags, ApiOperation, ApiOkResponse, ApiSecurity } from '@nestjs/swagger';
import { CreateMemoryDto, MemoryDto } from './dto';

@ApiTags('Memory')
@ApiSecurity('apiKey')
@Controller({ path: 'memories', version: '1' })
@UseGuards(ApiKeyGuard)
export class MemoryController {

  @Post()
  @ApiOperation({ summary: 'Create a memory' })
  @ApiOkResponse({ type: MemoryDto })
  async create(@Body() dto: CreateMemoryDto): Promise<MemoryDto> {
    // dto is already validated by ZodValidationPipe
    return this.memoryService.create(dto);
  }
}
```

### Custom Errors

```typescript
// memory.errors.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export type MemoryErrorCode = 'MEMORY_NOT_FOUND' | 'MEMORY_LIMIT_EXCEEDED';

export abstract class MemoryError extends HttpException {
  constructor(
    public readonly code: MemoryErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ success: false, error: { code, message, details } }, status);
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(id: string) {
    super('MEMORY_NOT_FOUND', `Memory not found: ${id}`, HttpStatus.NOT_FOUND, { id });
  }
}
```

### Anti-Patterns

```typescript
// ❌ Wrong: Duplicate type definitions
// types.ts
export interface CreateMemoryInput { content: string; }
// schema.ts
export const CreateMemorySchema = z.object({ content: z.string() });
// Now you have TWO sources of truth!

// ❌ Wrong: class-validator decorators
export class CreateMemoryDto {
  @IsString() content: string;  // No runtime validation without pipe
}

// ❌ Wrong: Inline type in service
// service.ts
interface MemoryInput { ... }  // Should be in dto/schema.ts

// ❌ Wrong: Zod enum duplicated as TypeScript type
// types.ts
export type Theme = 'light' | 'dark';
// schema.ts
export const ThemeSchema = z.enum(['light', 'dark']);  // Duplication!

// ✅ Correct: Single source
export const ThemeSchema = z.enum(['light', 'dark']);
export type Theme = z.infer<typeof ThemeSchema>;  // Derived, not duplicated
```

### Constants File Organization

Constants must be in separate `*.constants.ts` files:

```typescript
// ✅ Correct: Constants centralized in .constants.ts
// payment/payment.constants.ts
export const TIER_MONTHLY_QUOTA: Record<SubscriptionTier, number> = {
  FREE: 100,
  BASIC: 5000,
  PRO: 20000,
  TEAM: 60000,
};
```

### Type Safety Guidelines

1. **Use strong types**: Avoid `string`, use specific union types or enums
   ```typescript
   // ✅ tier: SubscriptionTier
   // ❌ tier: string
   ```

2. **Unified type definitions**: Define same type once, reference elsewhere
   ```typescript
   // ✅ Reference shared types from types/ directory
   import type { CurrentUserDto } from '../types';

   // ❌ Duplicate definition of same structure
   interface User { id: string; email: string; ... }
   ```

3. **Export conventions**:
   - Schema: `export const xxxSchema`
   - Types: `export type { XxxDto }`
   - Unified export in `index.ts`

Public function categories:

- **Module-level `helper.ts`** - Module-specific logic, serves only current module
- **Global `common/`** - Cross-module reusable guards, decorators, filters
- **Global `utils/`** - Pure utility functions, no business state dependency

## Code Principles

### Core Principles

1. **Single Responsibility (SRP)**: Each function/component does one thing
2. **Open-Closed (OCP)**: Open for extension, closed for modification
3. **Law of Demeter (LoD)**: Only interact with direct dependencies, avoid deep calls
4. **Dependency Inversion (DIP)**: Depend on abstractions, not implementations
5. **Composition over Inheritance**: Use Hooks and composition patterns for logic reuse
6. When uncertain, search the web; use latest library versions and check latest documentation

### Code Practices

1. **Pure functions first**: Implement logic as pure functions for easier testing
2. **Early return**: Use early return to reduce nesting, improve readability
3. **Separation of concerns**: Constants, utilities, logic, UI each have their role
4. **DRY Principle**: Extract and reuse duplicate logic
5. **Avoid premature optimization**: Ensure correctness and readability first

### Comment Specification

1. **Core logic must be commented**: Complex algorithms, business rules, edge cases need explanation
2. **Naming aids understanding**: Clear naming + necessary comments, both together not either/or
3. **English comments**: Use concise English comments, add JSDoc for public APIs

### No Backward Compatibility Policy (Critical)

**Default stance: Do NOT maintain backward compatibility** with previous data structures, APIs, or code patterns.

| Scenario | Action |
| --- | --- |
| **User-facing data** (database records, user files, API responses used by external clients) | Consider migration strategy, provide data migration if needed |
| **Internal code** (services, utilities, internal types, database schemas for internal use) | Refactor directly, no compatibility shims |
| **Internal APIs** (between modules, between frontend/backend in this repo) | Change directly, update all call sites |
| **Configuration** (env vars, config files, feature flags) | Change directly, update documentation |
| **Database schemas** (internal tables, columns) | Migrate directly, no dual-write patterns |

**Guiding principle**: If refactoring is the best practice, just do it. Don't preserve old patterns "just in case" or "for compatibility". Technical debt compounds—eliminate it immediately.

```typescript
// ✅ Correct: Direct refactor
// Old: user.subscription_tier (string)
// New: user.tier (enum SubscriptionTier)
// → Just migrate the column, update all code, done.

// ❌ Wrong: Compatibility layer
// Don't add: getTier() { return this.tier ?? this.subscription_tier }
// Don't add: @deprecated subscription_tier
// Don't add: if (oldFormat) { ... } else { ... }
```

**Exception**: Only maintain compatibility when external users depend on the interface (public API contracts, exported data formats users have stored locally).

### Prohibited Practices

1. **No legacy compatibility**: Delete/refactor unused code directly
2. **No deprecated comments**: No `// deprecated`, `// removed`, `_unused`, etc.
3. **No guessing implementations**: Search and confirm first, then modify
4. **No compatibility shims**: No `legacyX`, `oldX`, `x_v1` patterns for internal code

## Naming Conventions

| Type | Convention | Example |
| --- | --- | --- |
| Component/Type | PascalCase | `ScreenshotService` |
| Function/Variable | camelCase | `handleScreenshot` |
| Constant | UPPER_SNAKE_CASE | `MAX_CONCURRENT` |
| Component Folder | PascalCase | `ApiKeyCard/` |
| Utility File | camelCase | `urlValidator.ts` |
| API Key Prefix | `lk_` | `lk_abc123...` |

## Language Specification

| Context | Language | Notes |
| --- | --- | --- |
| Documentation/Comments/Commits | English | Consistency |
| Code Identifiers | English | Programming convention |
| API Error Codes | English | `QUOTA_EXCEEDED` |
| User Interface (UI) | English | International users |

## UI/UX Style Specification

### Design Style

**Boxy and Sharp** - Square and sharp design style. All UI elements use right angles, no rounded corners. Overall color palette is soft black/white/gray, accent color is orange.

### Border Radius Specification (Mandatory)

**No rounded corners globally**, all components must use `rounded-none`:

```tsx
// ✅ Correct
<Card className="rounded-none">
<Button className="rounded-none">
<Input className="rounded-none">
<Badge className="rounded-none">

// ❌ Wrong - Any rounded corners not allowed
<Card className="rounded-lg">
<Button className="rounded-md">
<Badge className="rounded-full">
```

> Note: shadcn/ui components have default rounded corners, explicitly add `rounded-none` to override.

### Sidebar Navigation Style (E2B Style)

| State | Text Color | Background | Font Weight |
| --- | --- | --- | --- |
| Unselected | `var(--sidebar-foreground)` gray | transparent | normal |
| Hover | `var(--foreground)` black | transparent | normal |
| Selected | `var(--sidebar-primary)` orange | `#f2f2f2` light gray | medium |

### Theme Color Variables

```css
/* Sidebar */
--sidebar-foreground: oklch(0.35 0 0);      /* Unselected text: dark gray */
--sidebar-primary: oklch(0.65 0.18 45);     /* Selected text: orange */

/* Accent */
--primary: oklch(0.25 0 0);                 /* Primary: dark gray/black */
```

### Link Styles

- Regular links: Use `text-orange-500` orange
- Navigation links: Follow sidebar style specification

### Alert Component Usage

```tsx
// ✅ General tips: Use default style (black text)
<Alert>
  <AlertDescription>Info message</AlertDescription>
</Alert>

// ✅ Error warning: Use destructive
<Alert variant="destructive">
  <AlertDescription>Error message</AlertDescription>
</Alert>

// ❌ Don't use destructive for general tips (shows orange)
```

### Tailwind CSS v4 Notes

Project uses **Tailwind CSS v4**, note these differences:

1. **Data attribute variants**:
   - Radix UI components use `data-[state=active]:` not `data-active:`
   ```tsx
   // ✅ Tailwind v4 + Radix UI
   className="data-[state=active]:bg-background"

   // ❌ Won't work
   className="data-active:bg-background"
   ```

2. **Color opacity**: oklch color opacity modifiers may not work, use inline styles or full color values

3. **CSS variable config**: Define in `@theme inline` block in `globals.css`

## Key Business Rules

### Plans & Quotas

| Plan | Monthly Fee | Monthly Quota | Concurrency Limit |
| --- | --- | --- | --- |
| FREE | $0 | 100 | 2 |
| BASIC | $9 | 5,000 | 5 |
| PRO | $29 | 20,000 | 10 |
| TEAM | $79 | 60,000 | 20 |

### Quota Deduction Logic

```
Priority: Monthly subscription quota → Pay-as-you-go quota
Timing: Pre-deduct on request, refund on failure
Cache hit: No quota deduction, still create record
```

### Security Guidelines

- **SSRF Protection**: URL must pass `url-validator.ts` validation
- **Private IP Blocking**: Block localhost, internal IPs, cloud metadata endpoints
- **API Key Storage**: Store only SHA256 hash, plaintext shown only once on creation

## Development Progress

Current progress reference `TECH_SPEC.md` "Development Steps" section.

**Completed**:
- Phase 0: Project initialization
- Phase 1: Database & base modules
- Phase 1.5: Existing module adaptation
- Phase 2: API Key module
- Phase 3: Quota module
- Phase 4: Scraper module + Browser module (screenshot, markdown, HTML, links)
- Phase 4.5: Test infrastructure (unit tests + integration tests + E2E test framework)
- Phase 5: Console frontend (Dashboard, API Keys, Screenshots, Webhooks, Settings, Playground)
- Phase 5.5: Admin dashboard (Dashboard, Users, Orders, Subscriptions, Queue Monitor)
- Phase 6: Core APIs (Map, Crawl, Extract, Search)
- Phase 6.5: Landing page with Demo Playground
- Phase 7: oEmbed API support
- Phase 8: Batch Scrape API
- Phase 9: Webhook Notifications (CRUD + Crawl/BatchScrape triggers)

**In Progress**:
- Docker deployment optimization

**Pending**:
- PDF export
- Subscription payment integration
- Cache optimization

## Test Infrastructure

Test specification details → [`docs/architecture/testing.md`](./docs/architecture/testing.md)

### Test Commands

```bash
pnpm --filter server test        # Run all tests (excluding integration/E2E)
pnpm --filter server test:unit   # Run unit tests
pnpm --filter server test:cov    # With coverage report
pnpm --filter server test:ci     # CI full test (with integration/E2E + coverage)
```

### Test Directory Structure

```
apps/server/
├── vitest.config.ts              # Vitest config
├── test/
│   ├── setup.ts                  # Global setup
│   ├── helpers/                  # Test helper functions
│   │   ├── containers.ts         # Testcontainers wrapper
│   │   ├── test-app.factory.ts   # NestJS TestingModule factory
│   │   └── mock.factory.ts       # Mock factory
│   └── fixtures/                 # Test data and pages
│       ├── seed.ts               # Shared test data
│       └── test-page.html        # Screenshot test page
└── src/screenshot/__tests__/     # Screenshot module tests
    ├── url-validator.spec.ts     # Unit tests
    ├── image-processor.spec.ts   # Unit tests
    ├── screenshot.service.integration.spec.ts  # Integration tests
    └── screenshot.e2e.spec.ts    # E2E tests
```

---

*Version: 3.2 | Updated: 2026-01-04*
