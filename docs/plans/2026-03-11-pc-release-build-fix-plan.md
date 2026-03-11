# PC Release Build Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every desktop release build both prebuild externalized workspace runtime package `dist/*` outputs and complete Electron packaging without monorepo node-linker drift.

**Architecture:** Reuse the repository-standard root `build:packages` orchestration as the single source of truth for desktop runtime package builds. Bind that orchestration to the `@moryflow/pc` build lifecycle, then route every `electron-builder` invocation through a small wrapper that forces isolated linker semantics during packaging.

**Tech Stack:** pnpm workspace, GitHub Actions, Electron, electron-vite, Vitest, tsc-multi.

---

### Task 1: Lock the release build contract with tests

**Files:**

- Create: `apps/moryflow/pc/src/main/app/release-build-contract.test.ts`

**Step 1: Write the failing test**

Assert that:

- `apps/moryflow/pc/package.json` defines `prebuild` as a root `build:packages` invocation
- `apps/moryflow/pc/package.json` packaging scripts route through an isolated electron-builder wrapper
- `.github/workflows/release-pc.yml` no longer contains the partial `--if-present build` command and installer steps use the wrapper

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/release-build-contract.test.ts`

Expected: FAIL because `prebuild` is missing and the workflow still contains the broken command.

### Task 2: Move desktop build preconditions into the package lifecycle

**Files:**

- Modify: `apps/moryflow/pc/package.json`
- Modify: `.github/workflows/release-pc.yml`

**Step 1: Add the minimal implementation**

- Add `prebuild` to `@moryflow/pc` that runs root `build:packages`
- Add a packaging wrapper that executes `electron-builder` with isolated linker semantics
- Remove the workflow's partial workspace build step and make installer steps use the wrapper

**Step 2: Run the targeted contract test**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/release-build-contract.test.ts`

Expected: PASS

### Task 3: Verify the original failure mode is gone

**Files:**

- No additional code changes expected

**Step 1: Reproduce the release-like build flow**

Run: `rm -rf packages/*/dist apps/moryflow/pc/dist && CI=1 pnpm --dir apps/moryflow/pc build`

**Step 2: Assert build artifacts exist**

Run:

- `test -f packages/agents-tools/dist/index.mjs`
- `test -f packages/agents-runtime/dist/index.mjs`
- `test -f packages/channels-telegram/dist/index.mjs`

Expected: all commands succeed

**Step 3: Run focused regression verification**

Run:

- `CI=1 node --input-type=module -e "import('@moryflow/agents-tools').then(()=>console.log('OK'))"` from `apps/moryflow/pc`
- `CSC_IDENTITY_AUTO_DISCOVERY=false pnpm --dir apps/moryflow/pc exec node ./scripts/run-electron-builder.cjs --mac dir --arm64 --publish never`

Expected:

- import prints `OK`
- electron-builder completes packaging instead of failing in dependency collection
