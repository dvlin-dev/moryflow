# Subscription Dialog Remove Summary Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the redundant summary panel from the PC subscription dialog so the modal focuses on the three pricing cards only.

**Architecture:** Keep the existing dialog shell and billing toggle, but collapse the content area to a single pricing-card grid. Update the dialog test to assert the summary panel is absent and the three plans remain visible.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Tailwind CSS

---

### Task 1: Lock the new layout behavior in tests

**Files:**

- Modify: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/subscription-dialog.test.tsx`

**Step 1: Write the failing test**

Add an assertion that the summary panel is not rendered and that the dialog plan grid still renders the three plan cards.

**Step 2: Run test to verify it fails**

Run: `../../../node_modules/.bin/vitest --config vitest.config.ts run src/renderer/components/settings-dialog/components/account/subscription-dialog.test.tsx --reporter=verbose`

Expected: FAIL because the summary panel is still present.

### Task 2: Remove the redundant summary panel from the dialog

**Files:**

- Modify: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/subscription-dialog.tsx`

**Step 1: Write minimal implementation**

Delete the summary `aside`, collapse the content wrapper to a single grid, and keep the three pricing cards and header intact.

**Step 2: Run tests to verify it passes**

Run: `../../../node_modules/.bin/vitest --config vitest.config.ts run src/renderer/components/settings-dialog/components/account/subscription-dialog.test.tsx src/renderer/components/settings-dialog/components/account-section.test.tsx --reporter=verbose`

Expected: PASS with zero failures.
