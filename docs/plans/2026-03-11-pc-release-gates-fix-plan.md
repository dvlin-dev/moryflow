# PC Release Gates Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent broken desktop packages from reaching GitHub Releases or `download.moryflow.com` by adding a packaged-app launch gate and tightening release entrypoints to immutable tags.

**Architecture:** Keep build and packaging where they are, but insert a release-specific verification phase between package generation and artifact publication. That verification should inspect the packaged app contents, launch the app binary for a bounded smoke window, and fail the job on early process exit or known main-process crash signatures. Manual reruns must target an existing tag, and the local `release.sh` helper must run the minimum release preflight before commit/tag/push.

**Tech Stack:** GitHub Actions, pnpm workspace, Electron, electron-builder, Node.js scripts, Vitest.

---

### Task 1: Lock the new release gate contract with tests

**Files:**

- Modify: `apps/moryflow/pc/src/main/app/release-build-contract.test.ts`

**Step 1: Write the failing tests**

Assert that:

- `workflow_dispatch` requires a `tag` input
- build jobs checkout and build from the resolved tag
- release workflow runs a packaged-app smoke script before uploading artifacts / publishing
- `release.sh` runs release preflight commands before commit/tag/push

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/release-build-contract.test.ts`

Expected: FAIL because none of those gates exist yet.

### Task 2: Add a packaged-app smoke verifier

**Files:**

- Create: `apps/moryflow/pc/scripts/smoke-check-packaged-app.ts`
- Create: `apps/moryflow/pc/src/main/app/smoke-check-packaged-app-script.test.ts`

**Step 1: Write the failing test**

Cover at least:

- script fails when `app.asar` is missing a required package
- script fails when the app process exits before the smoke timeout
- script succeeds when required packages exist and the spawned process stays alive through the timeout

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/smoke-check-packaged-app-script.test.ts`

Expected: FAIL because the script does not exist yet.

### Task 3: Wire the smoke gate into release workflow and release helper

**Files:**

- Modify: `.github/workflows/release-pc.yml`
- Modify: `apps/moryflow/pc/scripts/release.sh`

**Step 1: Implement the workflow changes**

- Add `workflow_dispatch.inputs.tag`
- Resolve metadata from the tag and make build/publish jobs checkout that exact tag
- Run the packaged-app smoke script after `electron-builder` and before artifact upload
- Keep publish downstream of the smoke-verified build jobs only

**Step 2: Implement the local release preflight**

- Run the contract test
- Run `CI=1 pnpm --dir apps/moryflow/pc build`
- Abort before version bump / commit / tag if preflight fails

**Step 3: Run the targeted contract test**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/release-build-contract.test.ts`

Expected: PASS

### Task 4: Verify the end-to-end gate locally

**Files:**

- No additional code changes expected

**Step 1: Run both targeted test files**

Run:

- `pnpm --filter @moryflow/pc exec vitest run src/main/app/release-build-contract.test.ts`
- `pnpm --filter @moryflow/pc exec vitest run src/main/app/smoke-check-packaged-app-script.test.ts`

**Step 2: Rebuild and package a real macOS app**

Run:

- `CI=1 pnpm --dir apps/moryflow/pc build`
- `CSC_IDENTITY_AUTO_DISCOVERY=false pnpm --dir apps/moryflow/pc exec node ./scripts/run-electron-builder.cjs --mac dir --arm64 --publish never`

**Step 3: Run the packaged-app smoke verifier against the real artifact**

Run:

- `pnpm --dir apps/moryflow/pc exec tsx scripts/smoke-check-packaged-app.ts --app release/<version>/mac-arm64/MoryFlow.app --require-package @openai/agents --require-package @openai/agents-core --require-package @openai/agents-extensions --timeout-ms 12000`

Expected: script reports success and the app stays alive for the full smoke window.
