# Agent Platform Modularization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the agent prompt/tool/runtime assembly into explicit shared core plus platform-specific modules so each app only receives its real platform rules.

**Architecture:** Move prompt construction in `agents-runtime` to a `core + platform + builder` structure, move toolset assembly in `agents-tools` to explicit platform toolset modules, and make PC/Mobile both consume the same shared platform-profile driven prompt builder. Remove mixed cross-platform wording from shared prompt content.

**Tech Stack:** TypeScript, Vitest, Electron PC runtime, React Native mobile runtime, `@openai/agents-core`

---

### Task 1: Refactor runtime prompt modules

**Files:**
- Create: `packages/agents-runtime/src/platform-profile.ts`
- Create: `packages/agents-runtime/src/prompt/core.ts`
- Create: `packages/agents-runtime/src/prompt/platform/pc-bash-first.ts`
- Create: `packages/agents-runtime/src/prompt/platform/mobile-file-tools.ts`
- Create: `packages/agents-runtime/src/prompt/build.ts`
- Modify: `packages/agents-runtime/src/index.ts`
- Modify: `packages/agents-runtime/CLAUDE.md`

**Step 1: Write failing tests**

- Add tests for platform-specific prompt output:
  - PC prompt contains bash-first guidance and does not mention mobile.
  - Mobile prompt contains file-tools guidance and does not mention PC.
  - Shared core prompt still contains style/safety/vibe sections.

**Step 2: Run targeted tests and confirm failure**

Run: `pnpm --filter @moryflow/agents-runtime test -- --run src/__tests__/prompt*.test.ts`

**Step 3: Implement modular prompt builders**

- Define `PlatformProfile = 'pc-bash-first' | 'mobile-file-tools'`.
- Export `getCoreAgentPrompt`, `getPlatformPrompt`, `buildSystemPrompt`.
- Keep prompt assembly explicit and string-based; no dynamic capability matrix.

**Step 4: Run targeted tests and confirm pass**

Run the same test command.

### Task 2: Refactor toolset assembly modules

**Files:**
- Create: `packages/agents-tools/src/toolset/shared.ts`
- Create: `packages/agents-tools/src/toolset/pc-bash-first.ts`
- Create: `packages/agents-tools/src/toolset/mobile-file-tools.ts`
- Modify: `packages/agents-tools/src/index.ts`
- Modify: `packages/agents-tools/src/index.react-native.ts`
- Modify: `packages/agents-tools/CLAUDE.md`
- Delete: `packages/agents-tools/src/create-tools.ts`
- Delete: `packages/agents-tools/src/create-tools-mobile.ts`

**Step 1: Write failing tests**

- Replace current platform toolset test expectations with:
  - `createPcBashFirstToolset`
  - `createMobileFileToolsToolset`

**Step 2: Run targeted tests and confirm failure**

Run: `pnpm --filter @moryflow/agents-tools test:unit -- --run test/pc-bash-first-toolset.spec.ts test/mobile-file-tools-toolset.spec.ts`

**Step 3: Implement new toolset builders**

- Centralize shared `ToolsContext` in `toolset/shared.ts`.
- Move PC bash-first composition into `toolset/pc-bash-first.ts`.
- Move mobile file-tool composition into `toolset/mobile-file-tools.ts`.
- Remove old ambiguous naming.

**Step 4: Run targeted tests and confirm pass**

Run the same package test command.

### Task 3: Unify PC runtime prompt/toolset assembly

**Files:**
- Modify: `apps/moryflow/pc/src/main/agent-runtime/index.ts`
- Modify: `apps/moryflow/pc/src/main/agent-runtime/prompt-resolution.ts`
- Modify: `apps/moryflow/pc/src/main/agent-runtime/__tests__/prompt-resolution.test.ts`

**Step 1: Write failing tests**

- Update prompt-resolution tests to require an explicit platform profile and shared builder output.

**Step 2: Run targeted tests and confirm failure**

Run: `pnpm --filter @moryflow/pc test:unit -- --run src/main/agent-runtime/__tests__/prompt-resolution.test.ts`

**Step 3: Implement PC runtime migration**

- Replace old prompt assembly with shared `buildSystemPrompt(..., 'pc-bash-first')`.
- Replace old tool assembly import with `createPcBashFirstToolset`.

**Step 4: Run targeted tests and confirm pass**

Run the same test command.

### Task 4: Unify Mobile runtime prompt/toolset assembly

**Files:**
- Modify: `apps/moryflow/mobile/lib/agent-runtime/runtime.ts`

**Step 1: Write failing test or assertion coverage**

- Add or extend runtime prompt resolution checks if there is an existing mobile runtime test target.
- If no isolated test harness exists, keep this task covered by shared prompt/toolset tests and local code inspection.

**Step 2: Implement Mobile runtime migration**

- Replace legacy prompt usage with shared `buildSystemPrompt(..., 'mobile-file-tools')`.
- Replace legacy mobile toolset assembly with `createMobileFileToolsToolset(...)`.

**Step 3: Run affected tests**

Run shared runtime/toolset tests plus any mobile runtime tests that exist.

### Task 5: Final verification

**Files:**
- Review diffs in all modified files

**Step 1: Run verification commands**

- `pnpm --filter @moryflow/agents-runtime test`
- `pnpm --filter @moryflow/agents-tools test`
- `pnpm --filter @moryflow/pc test:unit -- --run src/main/agent-runtime/__tests__/prompt-resolution.test.ts`

**Step 2: Record blockers if environment lacks dependencies**

- If package-local `node_modules` or test runners are unavailable, report exact missing dependency/tool state instead of claiming pass.
