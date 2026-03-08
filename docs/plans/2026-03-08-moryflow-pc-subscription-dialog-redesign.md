# Moryflow PC Subscription Dialog Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Moryflow PC membership dialog so it feels wider, shorter, more cohesive with the settings shell, and visually closer to Notion-style product surfaces.

**Architecture:** Keep the existing purchase flow and data loading logic in `subscription-dialog.tsx`, but replace the modal layout with a flatter information hierarchy: integrated header, pill billing toggle, denser plan cards, and a low-noise footer. Reuse existing dialog primitives and product lookup logic so the change stays local to the account membership surface.

**Tech Stack:** React, TanStack/Vite renderer, Tailwind utility classes, Radix Dialog/Tabs, Vitest, Testing Library

---

### Task 1: Lock the redesigned dialog behavior with tests

**Files:**

- Create: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/subscription-dialog.test.tsx`
- Modify: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/subscription-dialog.tsx`

**Step 1: Write the failing test**

Add tests that assert:

- the dialog content uses a wide desktop width class instead of the old narrow `max-w-3xl`
- the plan area renders a compact three-column layout with a separate summary panel
- the recommended plan exposes a stronger CTA and yearly helper copy

**Step 2: Run test to verify it fails**

Run: `pnpm --filter ./apps/moryflow/pc test -- --run src/renderer/components/settings-dialog/components/account/subscription-dialog.test.tsx`

Expected: FAIL because the current dialog still renders the old structure and classes.

**Step 3: Write minimal implementation**

Refactor the dialog markup to expose stable test ids and text hooks for:

- outer surface width / spacing
- billing segmented control summary
- per-plan subtitle / helper copy
- recommended card and current-plan button states

**Step 4: Run test to verify it passes**

Run the same test command and confirm the new layout assertions pass.

### Task 2: Rebuild the modal surface in a Notion-like style

**Files:**

- Modify: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/subscription-dialog.tsx`
- Modify: `packages/i18n/src/translations/settings/en.ts`
- Modify: `packages/i18n/src/translations/settings/zh-CN.ts`

**Step 1: Write the failing test**

Extend tests to cover:

- condensed header copy
- annual billing savings summary
- card subtitles and compact feature list
- footer promise bar copy

**Step 2: Run test to verify it fails**

Run the same dialog test command.

Expected: FAIL because the current translations and layout do not expose the new copy structure.

**Step 3: Write minimal implementation**

Implement:

- wider dialog container aligned to the settings shell proportions
- light neutral card surfaces with one recommended emphasis
- reduced duplicate copy and shorter feature lists
- a footer info bar for cancellation/savings reassurance

**Step 4: Run test to verify it passes**

Run the dialog test again and confirm green.

### Task 3: Regression verification

**Files:**

- Test: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/subscription-dialog.test.tsx`
- Test: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account-section.test.tsx`

**Step 1: Run focused tests**

Run:

- `pnpm --filter ./apps/moryflow/pc test -- --run src/renderer/components/settings-dialog/components/account/subscription-dialog.test.tsx`
- `pnpm --filter ./apps/moryflow/pc test -- --run src/renderer/components/settings-dialog/components/account-section.test.tsx`

Expected: PASS

**Step 2: Review for unintended UI regressions**

Confirm the dialog still:

- loads products when opened
- disables unavailable/current plan actions
- keeps the payment dialog integration untouched

**Step 3: Stop without git commit**

Per repository rules, do not create a commit unless the user explicitly asks.
