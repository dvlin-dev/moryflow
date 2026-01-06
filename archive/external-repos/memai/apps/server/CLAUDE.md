# Server

> Warning: When this folder structure changes, you MUST update this document

## Position

Backend API + Memory Engine for the Memai platform. NestJS 11 application providing Memory API, authentication, quota management, and all core business logic.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | NestJS 11 |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 + pgvector |
| Cache/Queue | Redis 7 + BullMQ |
| Auth | Better Auth |
| Validation | Zod + @wahyubucil/nestjs-zod-openapi |
| API Docs | OpenAPI + Scalar |

## Directory Structure

```
apps/server/
├── src/
│   ├── main.ts                 # Bootstrap with OpenAPI, CORS, versioning
│   ├── app.module.ts           # Root module (25 feature modules)
│   ├── memory/                 # Core memory service
│   ├── entity/                 # Entity extraction
│   ├── relation/               # Entity relations
│   ├── graph/                  # Knowledge graph
│   ├── extract/                # LLM extraction
│   ├── embedding/              # Vector embeddings
│   ├── llm/                    # LLM provider abstraction
│   ├── auth/                   # Better Auth integration
│   ├── api-key/                # API key management
│   ├── admin/                  # Admin operations
│   ├── quota/                  # Quota management
│   ├── payment/                # Creem payment processing
│   ├── subscription/           # Subscription tiers
│   ├── usage/                  # Usage tracking
│   ├── user/                   # User management
│   ├── webhook/                # Webhook notifications
│   ├── prisma/                 # Database client
│   ├── redis/                  # Cache client
│   ├── queue/                  # BullMQ jobs
│   ├── email/                  # Resend email
│   ├── common/                 # Guards, decorators, filters, interceptors
│   ├── openapi/                # OpenAPI + Scalar setup
│   ├── config/                 # Pricing config
│   ├── types/                  # Shared types
│   └── health/                 # Health checks
├── prisma/
│   ├── schema.prisma           # Data model (20+ entities)
│   ├── seed.ts                 # Database seeding
│   └── migrations/             # Migration history
├── test/                       # Test helpers and fixtures
└── vitest.config.ts            # Test configuration
```

## Constraints

- All DTOs must use Zod schemas (see root CLAUDE.md "Types & DTO Specification")
- Public API endpoints: Use `ApiKeyGuard`
- Console endpoints: Use `SessionGuard` (Better Auth)
- Admin endpoints: Use `SessionGuard` + `AdminGuard`
- Custom errors must extend module-specific Error class
- Response format: Unified via `ResponseInterceptor`

## Development Commands

```bash
pnpm --filter server dev          # Start with watch mode
pnpm --filter server build        # Build for production
pnpm --filter server typecheck    # Type checking
pnpm --filter server test         # Run unit tests
pnpm --filter server test:cov     # With coverage
pnpm --filter server prisma:studio # Prisma GUI
pnpm --filter server prisma:migrate dev # Create migration
```

## API Structure

```
Public API (v1) - ApiKeyGuard:
  POST   /v1/memories           # Create memory
  POST   /v1/memories/search    # Semantic search
  GET    /v1/memories           # List memories
  GET    /v1/memories/:id       # Get memory
  DELETE /v1/memories/:id       # Delete memory
  (similar for entities, relations, graph)

Console API - SessionGuard:
  /api/console/api-keys         # API key management
  /api/console/webhooks         # Webhook configuration
  /api/console/memories         # Memory management
  /api/console/stats            # Usage statistics

Admin API - SessionGuard + AdminGuard:
  /api/admin/users              # User management
  /api/admin/subscriptions      # Subscription management
  /api/admin/orders             # Order management
  /api/admin/dashboard          # Dashboard metrics
```

## Common Modification Scenarios

| Scenario | Files | Notes |
|----------|-------|-------|
| Add new API endpoint | `*.controller.ts`, `dto/*.schema.ts` | Add Zod schema first |
| Add business logic | `*.service.ts` | Unit tests required |
| Add new error type | `*.errors.ts` | Follow error code pattern |
| Add database field | `prisma/schema.prisma` | Run prisma:migrate |
| Add new module | Create folder, register in `app.module.ts` | Follow module structure |

## Module Dependencies

```
memory/
├── depends on → embedding/ (vector generation)
├── depends on → entity/, relation/ (extraction)
├── depends on → prisma/ (database)
├── depends on → quota/ (usage tracking)
└── depends on → webhook/ (notifications)

auth/
├── depends on → prisma/ (user data)
└── depended by ← api-key/, user/, admin/

quota/
├── depends on → subscription/ (tier limits)
├── depends on → prisma/ (quota records)
└── depended by ← memory/, entity/, relation/
```

## Environment Variables

Key variables (see `.env.example` for full list):
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `BETTER_AUTH_SECRET` - Auth secret
- `OPENAI_API_KEY` - Embedding provider
- `CREEM_API_KEY` - Payment provider

---

*See root [CLAUDE.md](../../CLAUDE.md) for global conventions*
