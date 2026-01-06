# Testing Architecture

> Backend testing specification for AIGet.

---

## Test Layers

| Layer | Scope | Mock Strategy | When |
|-------|-------|---------------|------|
| **Unit** | Single class/function | Mock all dependencies | Every commit |
| **Integration** | Service + Repository | Testcontainers | Every commit |
| **E2E** | Full HTTP flow | Testcontainers | CI |

---

## Directory Structure

```
apps/server/
├── vitest.config.ts
├── test/
│   ├── setup.ts                     # Global setup
│   ├── helpers/
│   │   ├── containers.ts            # Testcontainers wrapper
│   │   ├── test-app.factory.ts      # NestJS TestingModule factory
│   │   └── mock.factory.ts          # Mock factory
│   └── fixtures/
│       └── seed.ts                  # Test data
└── src/{module}/__tests__/
    ├── {name}.spec.ts               # Unit tests
    ├── {name}.integration.spec.ts   # Integration tests
    └── {name}.e2e.spec.ts           # E2E tests
```

---

## Naming Convention

| Type | Suffix | Example |
|------|--------|---------|
| Unit | `.spec.ts` | `quota.service.spec.ts` |
| Integration | `.integration.spec.ts` | `quota.service.integration.spec.ts` |
| E2E | `.e2e.spec.ts` | `scraper.e2e.spec.ts` |

---

## Mock Boundaries

```
Unit Tests (Full Mock):
┌─────────────────────────────────┐
│  Service                        │
│    ↓ Mock                       │
│  Repository ← Mock              │
│  RedisService ← Mock            │
└─────────────────────────────────┘

Integration Tests (Partial Mock):
┌─────────────────────────────────┐
│  Service → Repository → Prisma  │
│            (Real)    (Container)│
│                                 │
│  External ← Mock                │
│  (R2, Playwright, LLM)          │
└─────────────────────────────────┘
```

---

## Commands

```bash
pnpm --filter server test          # All tests
pnpm --filter server test:unit     # Unit only
pnpm --filter server test:cov      # With coverage
pnpm --filter server test:ci       # CI (includes E2E)
```

---

## Coverage Targets

| Module | Target |
|--------|--------|
| quota, api-key | ≥80% |
| scraper, auth, payment | ≥70% |
| Other | ≥60% |

---

## Best Practices

1. **Isolation**: Each test independent, no order dependency
2. **Single Assertion**: One behavior per test
3. **Clear Naming**: `should [expected] when [condition]`
4. **Error Coverage**: Test all error paths

---

*Version: 2.0 | Updated: 2026-01*
