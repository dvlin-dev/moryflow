# Moryflow PC Sidebar Quick Create

## Goal

Simplify Moryflow PC sidebar creation flows so files and folders are created immediately without a naming prompt, use deterministic auto-increment names, create empty files by default, and support creating both child files and child folders from folder context menus.

## Current Status

Implemented.

## Fixed Decisions

- File base name is `NewFile`; folder base name is `NewFolder`.
- Collision suffixes have no spaces: `NewFile2`, `NewFile3`, `NewFolder2`, `NewFolder3`.
- Files persist on disk as Markdown files: `NewFile.md`, `NewFile2.md`.
- New file default content is empty string.
- Scope includes existing sidebar-adjacent create entry points:
  - Files section create menu
  - root blank-area context menu
  - empty-state create button
  - folder context menu child file create
  - folder context menu child folder create
- Scope excludes rename UX changes, new shortcuts, inline rename-on-create, and editor-title behavior changes.
- Empty-state action surface remains a single primary file-create button; this task does not add an empty-state folder button.

## Current Implementation

### Main-process create policy

- `apps/moryflow/pc/src/main/vault/files.ts` owns filename and folder-name allocation.
- Renderer sends logical base names only: `NewFile` and `NewFolder`.
- Markdown extension normalization happens only in the main process.
- File creation uses atomic `writeFile(..., { flag: 'wx' })` retry loops to avoid duplicate-name races under fast repeated creation.
- Folder creation uses `mkdir(...)` retry loops on `EEXIST`.
- Name uniqueness is scoped to the requested parent directory.
- `template` payload support remains available, but the default file content fallback is now `''`.

### Renderer quick create

- `create-file.ts` no longer opens a naming dialog during create.
- `create-folder.ts` no longer opens a naming dialog during create.
- Root and target-folder create flows both dispatch immediate create intents.
- Existing pending-selection, pending-open, and tree-refresh behavior is preserved.
- Folder create options now support `targetNode?: VaultTreeNode` so child-folder creation uses the same create pipeline as child-file creation.

### Sidebar and tree action wiring

- Workspace controller plumbing now exposes folder-scoped create-folder actions alongside create-file actions.
- Sidebar state snapshots carry both `onCreateFile` and `onCreateFolder`.
- Folder context menus now expose both `New file` and `New folder`.
- When a folder context-menu child create action is triggered on a collapsed folder, the folder is expanded first so the new child is immediately visible.
- Blank-area root context menu remains available and still routes through the same quick-create behavior.

### Copy cleanup

- Removed obsolete workspace translation keys for the deleted create-name dialogs:
  - `createFileTitle`
  - `createFolderTitle`
  - `enterFileName`
  - `enterFolderName`
  - `fileNamePlaceholder`
  - `folderNamePlaceholder`
- `note` namespace translations were intentionally left unchanged because they are outside this task's scope.

## Acceptance Status

- No create-name dialog appears for sidebar file or folder creation.
- Root and folder-scoped create actions share one naming policy.
- Duplicate names increment as `NewFile2` / `NewFolder2` without spaces.
- New files are empty by default.
- Folder context menus expose both child create actions.
- Existing title-based rename behavior remains in place.
- Obsolete workspace create-dialog translation keys have been removed.

## Verification Baseline

Verified on March 11, 2026 with:

```bash
pnpm install --frozen-lockfile
pnpm --filter @moryflow/pc exec vitest run src/main/vault/__tests__/files.test.ts src/renderer/workspace/file-operations/operations/create-file.test.ts src/renderer/workspace/file-operations/operations/create-folder.test.ts src/renderer/workspace/components/sidebar/hooks/use-sidebar-panels-store.test.tsx src/renderer/workspace/handle.test.tsx src/renderer/components/vault-files/handle.test.ts src/renderer/components/vault-files/vault-files-store.test.tsx src/renderer/components/vault-files/components/vault-folder.test.tsx src/renderer/workspace/components/sidebar/components/sidebar-files.test.tsx
pnpm --filter @moryflow/pc typecheck
pnpm --filter @moryflow/pc test:unit
```

Observed results:

- Focused regression suite passed: `9` test files, `26` tests passed.
- `pnpm --filter @moryflow/pc typecheck` passed.
- Package unit suite passed: `176` test files, `754` tests passed.
- Follow-up regressions for the `showInputDialog` dependency cleanup and collapsed-folder auto-expand behavior also passed.

## Remaining Validation Gap

- Desktop manual smoke check via `pnpm --filter @moryflow/pc dev` was not run in this execution.
