---
title: packages/types + packages/api + packages/config Code Review
date: 2026-01-26
scope: packages/types, packages/api, packages/config
status: done
---

<!--
[INPUT]: packages/types + packages/api + packages/config
[OUTPUT]: Issues + fixes + progress tracking
[POS]: Phase 4 / P3 module review (types/api/config)
[PROTOCOL]: Update docs/code-review/index.md, docs/index.md, docs/CLAUDE.md when this file changes.
-->

# packages/types + packages/api + packages/config Code Review

## Scope

- Shared types: `packages/types/src/`
- Shared API client + membership primitives: `packages/api/src/`
- Shared config + env validation: `packages/config/src/`, `packages/config/package.json`

## Summary

- High risk (P1): 1
- Medium risk (P2): 2
- Low risk (P3): 3
- Deferred: 0

## Findings (ordered by severity)

- [P1] Membership API base did not match the domain plan (hard-coded to `server.moryflow.com`)
  - Research:
    - Architecture docs require Moryflow API at `https://app.moryflow.com` (domain plan + auth guides).
    - `MEMBERSHIP_API_URL` is consumed by PC/Mobile clients and auth helpers.
  - Fix (implemented):
    - Update default `MEMBERSHIP_API_URL` to `https://app.moryflow.com`.
  - Files:
    - `packages/api/src/paths.ts`
    - `packages/api/CLAUDE.md`

- [P2] User-facing membership labels and auth error messages were in Chinese
  - Research:
    - `TIER_DISPLAY_NAMES`, `TIER_INFO_CONFIG`, `MEMBERSHIP_PROVIDER_NAME`, and `parseAuthError` are used by UI.
    - UI copy guidelines require English for user-facing strings.
  - Fix (implemented):
    - Translate membership labels and feature lists to English.
    - Convert Better Auth error messages to English.
    - Simplify account deletion reasons to English-only labels.
  - Files:
    - `packages/api/src/membership/const.ts`
    - `packages/api/src/account.ts`

- [P2] `@anyhunt/config` depended on Zod v3 in a server-only package
  - Research:
    - Project standard: backend packages must use Zod v4 (`import { z } from 'zod'`).
    - `apps/*/server` already uses Zod v4.
  - Fix (implemented):
    - Upgrade `@anyhunt/config` to Zod v4.
  - Files:
    - `packages/config/package.json`

- [P3] `@anyhunt/types` included unused product/business configs and stale API metadata
  - Research:
    - `product/subscription/user/wallet/fetchx` types were unused across the repo.
    - These files contained hard-coded product metadata that drifted from architecture docs.
  - Fix (implemented):
    - Remove unused product/subscription/user/wallet/fetchx types.
    - Keep only shared response and chat attachment types.
  - Files:
    - `packages/types/src/common/*`
    - `packages/types/src/products/*`
    - `packages/types/CLAUDE.md`

- [P3] Membership exports exposed unused helpers and stale protocol references
  - Research:
    - `compareTiers`, `isTierSufficient`, `TIER_PRIORITY`, and `AUTH_ERROR_MESSAGES` are not used by PC/Mobile.
    - File-index protocol still referenced `packages/shared-sync`.
  - Fix (implemented):
    - Remove unused exports and adjust PC/Mobile re-exports.
    - Update file-index protocol references.
    - Add missing file headers to meet repo conventions.
  - Files:
    - `packages/api/src/membership/index.ts`
    - `packages/api/src/file-index/types.ts`
    - `apps/moryflow/mobile/lib/server/index.ts`
    - `apps/moryflow/pc/src/renderer/lib/server/{index.ts,const.ts}`

## Fix plan and status

- Status: done
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`
