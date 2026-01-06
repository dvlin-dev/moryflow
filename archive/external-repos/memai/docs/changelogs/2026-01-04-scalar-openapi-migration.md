# 2026-01-04: Scalar + OpenAPI Migration

## Summary

Today's work focused on migrating API documentation from Swagger UI to Scalar, replacing class-validator with Zod validation, and enhancing OpenAPI documentation across all controllers.

## Changes Overview

| Commit | Description |
|--------|-------------|
| `a8ff02d` | Migrate to Scalar + Zod validation (major) |
| `5bb4aa7` | Split API docs into public and internal |
| `fc8a02a` | Fix missing DTO exports |
| `eb6a7f6` | Fix SwaggerModule include (use modules) |
| `2a6566d` | Enhance OpenAPI documentation |
| `40b9e96` | Add Scalar migration guide |

## Files Modified

### New Files
- `apps/server/src/openapi/` - OpenAPI module (service, constants, middleware)
- `apps/server/src/*/dto/*.schema.ts` - Zod schema files
- `apps/server/src/*/errors.ts` - Custom error classes
- `docs/SCALAR_MIGRATION_GUIDE.md` - Migration documentation

### Deleted Files
- Old DTO files using class-validator (`create-*.dto.ts`, `update-*.dto.ts`)
- Duplicate type files (`*.types.ts`)
- Extract preview interface (controller method, service method, schema)

---

## Verification Checklist

### 1. Server Startup

```bash
cd apps/server
pnpm start:dev
```

**Verify:**
- [ ] Server starts without errors
- [ ] No TypeScript compilation errors
- [ ] Database connection successful
- [ ] Redis connection successful

### 2. Public API Documentation

**URL:** https://server.memai.dev/api-reference (or http://localhost:3000/api-reference)

**Verify:**
- [ ] Scalar UI loads correctly
- [ ] 5 API tags visible: Memory, Entity, Relation, Graph, Extract
- [ ] Each endpoint shows parameters
- [ ] Click "Show more" displays request/response details

**Test Each Endpoint Has:**
- [ ] `@ApiOperation` - summary shown
- [ ] `@ApiOkResponse` or `@ApiNoContentResponse` - response description shown
- [ ] Request body schema (for POST/PATCH)
- [ ] Query parameters (for GET with filters)

### 3. Internal API Documentation (Dev Only)

**URL:** http://localhost:3000/api-reference/internal

**Verify:**
- [ ] Only accessible in development environment
- [ ] Shows all API endpoints (including Console, Admin)
- [ ] Console APIs show `@ApiCookieAuth`
- [ ] Admin APIs show `@ApiCookieAuth`

### 4. OpenAPI JSON

**URL:** https://server.memai.dev/openapi.json

**Verify:**
- [ ] JSON is valid
- [ ] `paths` object is NOT empty
- [ ] Contains Memory, Entity, Relation, Graph, Extract endpoints
- [ ] Does NOT contain internal endpoints (Console, Admin)

### 5. API Validation (Zod)

**Test Memory Create API:**

```bash
# Valid request - should succeed
curl -X POST https://server.memai.dev/api/v1/memories \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "content": "Test memory content"}'

# Invalid request - should return validation error
curl -X POST https://server.memai.dev/api/v1/memories \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "", "content": ""}'
```

**Expected validation error format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "path": ["userId"], "message": "userId is required" },
      { "path": ["content"], "message": "Content is required" }
    ]
  }
}
```

**Verify:**
- [ ] Valid requests return success response
- [ ] Invalid requests return Zod validation errors
- [ ] Error format matches unified response standard

### 6. Extract API (Preview Removed)

**Verify Extract endpoints only include:**
- [ ] `POST /api/v1/extract` - Extract from single text
- [ ] `POST /api/v1/extract/batch` - Extract from multiple texts
- [ ] NO `/api/v1/extract/preview` endpoint exists

**Test:**
```bash
# Should return 404
curl -X POST https://server.memai.dev/api/v1/extract/preview \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}'
```

### 7. Console Memory Export

**Test parameter ordering fix:**

```bash
curl -X GET "http://localhost:3000/api/console/memories/export?format=json" \
  -H "Cookie: your_session_cookie"
```

**Verify:**
- [ ] Export works with `format=json`
- [ ] Export works with `format=csv`
- [ ] Returns file download with correct Content-Type

### 8. TypeScript Check

```bash
cd apps/server
pnpm typecheck
```

**Verify:**
- [ ] No TypeScript errors
- [ ] All imports resolve correctly

### 9. Test Suite

```bash
cd apps/server
pnpm test
```

**Verify:**
- [ ] All unit tests pass
- [ ] No test failures related to DTO changes

---

## Specific Endpoints to Test

### Memory API
| Method | Endpoint | Expected |
|--------|----------|----------|
| POST | `/api/v1/memories` | Create memory |
| POST | `/api/v1/memories/search` | Search memories |
| GET | `/api/v1/memories` | List memories |
| GET | `/api/v1/memories/:id` | Get single memory |
| DELETE | `/api/v1/memories/:id` | Delete memory (204) |
| DELETE | `/api/v1/memories/user/:userId` | Delete user memories (204) |

### Entity API
| Method | Endpoint | Expected |
|--------|----------|----------|
| POST | `/api/v1/entities` | Create entity |
| POST | `/api/v1/entities/batch` | Batch create |
| GET | `/api/v1/entities` | List entities |
| GET | `/api/v1/entities/:id` | Get single entity |
| DELETE | `/api/v1/entities/:id` | Delete entity (204) |

### Relation API
| Method | Endpoint | Expected |
|--------|----------|----------|
| POST | `/api/v1/relations` | Create relation |
| POST | `/api/v1/relations/batch` | Batch create |
| GET | `/api/v1/relations` | List relations |
| GET | `/api/v1/relations/entity/:entityId` | Get entity relations |
| DELETE | `/api/v1/relations/:id` | Delete relation (204) |

### Graph API
| Method | Endpoint | Expected |
|--------|----------|----------|
| GET | `/api/v1/graph` | Get full graph |
| POST | `/api/v1/graph/traverse` | Traverse from entity |
| GET | `/api/v1/graph/path` | Find path |
| GET | `/api/v1/graph/neighbors/:entityId` | Get neighbors |

### Extract API
| Method | Endpoint | Expected |
|--------|----------|----------|
| POST | `/api/v1/extract` | Extract entities/relations |
| POST | `/api/v1/extract/batch` | Batch extract |

---

## Known Issues

None identified.

## Rollback Plan

If critical issues found:

```bash
git revert 2a6566d  # Revert OpenAPI enhancements
git revert eb6a7f6  # Revert module fix
git revert 5bb4aa7  # Revert doc split
git revert a8ff02d  # Revert Scalar migration (major)
```

Or reset to before migration:

```bash
git reset --hard cdd4dd4  # Last commit before migration
```

---

## Sign-off

- [ ] All verification items checked
- [ ] API documentation accessible and correct
- [ ] Validation working as expected
- [ ] No production errors

**Verified by:** _________________ **Date:** _________________
