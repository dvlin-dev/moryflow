# Moryflow WWW Interactive Workspace Hero Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the homepage screenshot placeholder with a desktop-only interactive workspace demo that visually matches Moryflow PC Home and uses mock editor/chat data.

**Architecture:** Keep the existing TanStack Start homepage route and landing-page composition, but swap the hero implementation from a static screenshot placeholder to a marketing-only workspace shell driven by local React state. The demo lives entirely inside `apps/moryflow/www`, uses mock data constants, and deliberately does not depend on PC runtime stores, chat controllers, or editor infrastructure.

**Tech Stack:** TanStack Start (SSR), React 19, TypeScript, Tailwind CSS v4, Vitest

---

### Task 1: Freeze copy and mock demo data

**Files:**

- Create: `apps/moryflow/www/src/components/landing/workspace-demo/mock-data.ts`
- Modify: `apps/moryflow/www/src/lib/i18n.ts`

**Step 1: Add the homepage demo mock constants**

Create a mock module that exports:

- sidebar tabs and one selected file
- default document title/body
- default completed conversation
- fixed follow-up assistant reply

Use English user-facing strings only.

**Step 2: Add or extend hero copy keys only where needed**

Keep current hero positioning copy if still valid. Only add i18n keys for any new desktop-only labels that should not be hardcoded.

**Step 3: Verify shape locally**

Run: `pnpm --filter @moryflow/www typecheck`

Expected: `typecheck` passes with the new mock module and i18n additions.

### Task 2: Build the workspace demo shell

**Files:**

- Create: `apps/moryflow/www/src/components/landing/workspace-demo/WorkspaceDemoShell.tsx`
- Create: `apps/moryflow/www/src/components/landing/workspace-demo/WorkspaceDemoSidebar.tsx`
- Create: `apps/moryflow/www/src/components/landing/workspace-demo/WorkspaceDemoEditor.tsx`
- Create: `apps/moryflow/www/src/components/landing/workspace-demo/WorkspaceDemoChat.tsx`
- Create: `apps/moryflow/www/src/components/landing/workspace-demo/index.ts`

**Step 1: Implement the shell state**

Use local `useState` for:

- current visual sidebar tab
- editable document content
- chat input value
- appended follow-up messages after user submit

Do not introduce Zustand or shared app stores for this marketing demo.

**Step 2: Implement the sidebar**

Render:

- `Home | Chat` tabs
- search button shell
- one selected file item
- bottom `New chat` button shell

Keep `Home | Chat` as visual state only; do not swap the main content.

**Step 3: Implement the editor**

Render a lightweight editable document area with:

- title row
- body editor area
- local editable text state

Do not add a rich-text editor dependency.

**Step 4: Implement the chat pane**

Render:

- default completed conversation
- tool-step rows for “searching” and “writing”
- text input and send button

On submit:

- append the user message
- append the fixed assistant marketing reply
- keep all behavior synchronous/local

**Step 5: Export the demo components**

Expose the shell through a small `index.ts` barrel for clean landing-page imports.

### Task 3: Replace the static hero screenshot with the interactive demo

**Files:**

- Modify: `apps/moryflow/www/src/components/landing/AgentFirstHero.tsx`
- Modify: `apps/moryflow/www/src/components/landing/index.ts`

**Step 1: Refactor the hero layout**

Keep:

- title
- subtitle
- OS-aware download CTA

Replace:

- the screenshot placeholder block

With:

- desktop-only interactive workspace demo
- mobile fallback that keeps the hero compact without rendering the demo

**Step 2: Keep visual hierarchy stable**

Ensure the CTA still reads as the primary action and the demo acts as the proof section inside the hero rather than pushing the headline too far down.

**Step 3: Run focused verification**

Run: `pnpm --filter @moryflow/www typecheck`

Expected: homepage hero compiles after the component swap.

### Task 4: Add supporting styles for the demo

**Files:**

- Modify: `apps/moryflow/www/src/styles/globals.css`

**Step 1: Add only the missing tokens/utilities**

Add the smallest set of styles needed for:

- app-shell borders/backgrounds
- mock editor typography rhythm
- chat tool-step styling
- desktop-only hero spacing adjustments

Prefer existing design tokens and utility classes over bespoke CSS.

**Step 2: Verify responsive behavior**

Ensure:

- `lg` and up shows the demo
- below `lg` the demo does not render
- mobile hero still preserves readable spacing and CTA placement

### Task 5: Add regression coverage for the homepage demo behavior

**Files:**

- Create: `apps/moryflow/www/src/components/landing/__tests__/AgentFirstHero.spec.tsx`
- Modify: `apps/moryflow/www/vitest.config.ts` (only if current test setup lacks the required environment)

**Step 1: Add a render test for the desktop hero**

Assert that the hero renders:

- the selected mock document title
- the default completed conversation
- the download CTA

**Step 2: Add an interaction test**

Assert that submitting a new chat message:

- appends the user message
- appends the fixed assistant marketing reply

**Step 3: Run the targeted unit test**

Run: `pnpm --filter @moryflow/www test:unit -- AgentFirstHero`

Expected: the hero regression test passes.

### Task 6: Run the minimum validation baseline

**Files:**

- No file changes

**Step 1: Run typecheck**

Run: `pnpm --filter @moryflow/www typecheck`

Expected: PASS

**Step 2: Run unit tests**

Run: `pnpm --filter @moryflow/www test:unit`

Expected: PASS

**Step 3: Manual verification**

Run: `pnpm --filter @moryflow/www dev`

Check:

- desktop homepage shows the interactive workspace demo in the hero
- default state shows a completed conversation
- editor content is editable
- sending a new message appends the fixed assistant reply
- mobile width hides the demo and preserves a valid hero layout

**Step 4: Do not commit automatically**

Do not run `git commit` unless the user explicitly asks for it.
