# PC Memory Bootstrap Runtime Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 统一 active workspace runtime bootstrap，在账号切换等 profile scope 变化后自动对当前 workspace 触发 memory bootstrap，并让 Memory 页在初始化窗口内展示诚实状态而不是误导性空态。

**Architecture:** 主进程把 membership 变化后的恢复动作收敛成单一 active workspace runtime 协调入口，复用现有 `ensureActiveVaultReady()` 链路完成 watcher、cloud sync 与 memory reconcile。Memory IPC 仅补一个最小 bootstrap 提示字段；renderer 继续维持 `Scanning / Needs attention / Indexing / Ready` 四态，并在初始化窗口内做短周期轮询直到收敛。

**Tech Stack:** Electron main process, Vitest, shared IPC types, React, Zustand, Testing Library

---

## 执行状态

- `[x]` Task 1 收敛 Membership 变化后的 Active Workspace Bootstrap 入口
- `[x]` Task 2 通过 IPC 暴露最小 Bootstrap Hint
- `[x]` Task 3 修正 Renderer 状态语义，避免误导性空态
- `[x]` Task 4 在初始化窗口内做可停止的前台轮询
- `[x]` Task 5 最小闭环验证与文档回看

### 当前执行记录

- 已完成 Task 1：membership runtime 不再直接拼接 `reinitCloudSync + triggerMemoryRescan`，而是统一调用 `reconcileActiveWorkspaceRuntimeAfterMembershipChange()`；identity changed 时在 reset 后复用 active workspace bootstrap 入口，identity unchanged 时保留最小恢复路径。
- 已验证 Task 1：
  - `pnpm --filter @moryflow/pc exec vitest run src/main/membership/runtime.test.ts src/main/app/bootstrap/membership-reconcile.test.ts src/main/app/runtime/active-vault-runtime.test.ts`
- 已完成 Task 2：`MemoryOverview` 新增最小 `bootstrap` hint，main IPC 通过依赖注入读取 memory indexing bootstrap 状态与本地 document registry；`reconcileMemoryIndexingVault()` 现在会显式标记 bootstrap started/finished，且 `memoryIndexingEngine` 暴露对应只读状态给 IPC 消费。
- 已验证 Task 2：
  - `pnpm --filter @moryflow/pc exec vitest run src/main/memory-indexing/reconcile.spec.ts src/main/memory-indexing/__tests__/engine.spec.ts src/main/app/ipc/memory.test.ts`
- 已完成 Task 3：Knowledge summary 现在会把 `bootstrap.pending + hasLocalDocuments` 的初始化窗口映射成 `SCANNING`；整页 full empty dashboard 判断已抽到纯 presenter，只会在 `READY` 且确实无内容时出现。
- 已验证 Task 3：
  - `pnpm --filter @moryflow/pc exec vitest run src/renderer/workspace/components/memory/knowledge-status.test.ts src/renderer/workspace/components/memory/dashboard-state.test.ts`
- 已完成 Task 4：`useMemoryPage()` 现在会在 `bootstrap.pending + hasLocalDocuments` 的初始化窗口内短轮询 `overview + knowledge statuses`，并在 bootstrap 收敛后自动停止，不引入新前端状态机。
- 已验证 Task 4：
  - `pnpm --filter @moryflow/pc exec vitest run src/renderer/workspace/components/memory/use-memory-page.test.ts src/renderer/workspace/components/memory/knowledge-status.test.ts src/renderer/workspace/components/memory/dashboard-state.test.ts`
- Review 回看：
  - Task 2 评审指出两处实现风险：IPC 依赖注入不纯、bootstrap 状态全局共享且不支持重入。两处均已修正，并补了重入与异常收尾测试。
  - Task 3 评审指出两处测试缺口：`hasLocalDocuments=false` 的负例未锁住、最终 UI 路径未做集成级断言。前者已补单测；后者暂保留为低风险残余项，因为空态门控已经收敛在纯 presenter 并有单测覆盖。
- 已完成 Task 5：补做最终 code review 后，继续修正了两处真实风险。
  - `bootstrap.pending` 不再只靠 ref count，而是按每次 reconcile 的 token 跟踪，避免 `reset()` 与旧 reconcile 的 `finally` 互相踩掉新一轮 bootstrap。
  - `bootstrap.hasLocalDocuments` 不再直接读取可能包含 retained tombstone 的 document registry，而是改为扫描当前 workspace 的真实 Markdown 候选文件。
- Follow-up 全量 review 修正：
  - `bootstrap.hasLocalDocuments` 已进一步收敛为 memory indexing runtime 的轻量状态，不再让 `getOverview` 在轮询期间重复递归扫描整个 workspace。
  - bootstrap 轮询现在会同时刷新 graph，并保留当前 graph query，避免 Connections 卡片计数与 Overlay 图数据脱节。
  - bootstrap 轮询 effect 现在会随 `overview` 更新重新挂下一轮 timer，避免长时间 bootstrap 期间只轮询一次就停掉。
  - identity changed 后的 active workspace rebuild 现在会显式以 `forceReplayAll` 方式重放当前 vault 的现有 Markdown 文件，保证未变更文件也会对新 profile 重新入队。
  - Knowledge summary 在 bootstrap scan 的早期窗口内，只要 `pending` 且尚无已知 source/attention/indexing 结果，就保持 `Scanning`，不再误落到 `Ready` / full empty dashboard。
  - membership reconcile controller 现在会在 attach 时先建立“当前 token -> 当前 `userId`”基线；`runtime.ts` 在这个 priming 窗口只更新 `lastUserId`，不触发 runtime recovery。后续 token 变化再基于已知用户身份区分“真实换号”与“同用户 token refresh”。
  - bootstrap 轮询现在会在每轮尝试结束后递增独立 poll tick；即使 `loadOverview()` 瞬时失败，下一轮 timer 也会继续挂起，不会永久停在 `Scanning`。
- 已验证 Task 5：
  - `pnpm --filter @moryflow/pc exec vitest run src/main/memory-indexing/__tests__/engine.spec.ts src/main/memory-indexing/reconcile.spec.ts src/main/app/ipc/memory.test.ts src/renderer/workspace/components/memory/use-memory-page.test.ts src/renderer/workspace/components/memory/knowledge-status.test.ts src/renderer/workspace/components/memory/dashboard-state.test.ts src/main/membership/runtime.test.ts src/main/app/bootstrap/membership-reconcile.test.ts src/main/app/runtime/active-vault-runtime.test.ts`
  - `pnpm --filter @moryflow/pc typecheck`
  - `node scripts/check-doc-contracts.mjs`

---

### Task 1: 收敛 Membership 变化后的 Active Workspace Bootstrap 入口

**Files:**
- Modify: `apps/moryflow/pc/src/main/app/runtime/active-vault-runtime.ts`
- Modify: `apps/moryflow/pc/src/main/app/runtime/active-vault-runtime.test.ts`
- Modify: `apps/moryflow/pc/src/main/membership/runtime.ts`
- Modify: `apps/moryflow/pc/src/main/membership/runtime.test.ts`
- Modify: `apps/moryflow/pc/src/main/app/bootstrap/membership-reconcile.ts`
- Modify: `apps/moryflow/pc/src/main/app/bootstrap/membership-reconcile.test.ts`
- Modify: `apps/moryflow/pc/src/main/index.ts`

**Step 1: Write the failing tests**

在以下测试里先把目标行为写红：

```ts
// apps/moryflow/pc/src/main/membership/runtime.test.ts
it('uses one runtime recovery entrypoint after identity changes', async () => {
  const recoverActiveWorkspaceRuntime = vi.fn(async () => undefined);

  await reconcileMembershipRuntimeState(
    { lastToken: 'token-a', lastUserId: 'user-a', nextToken: 'token-b' },
    {
      clearUserIdCache: vi.fn(),
      fetchCurrentUserId: async () => 'user-b',
      resetWorkspaceScopedRuntimeState: vi.fn(async () => undefined),
      reconcileActiveWorkspaceRuntimeAfterMembershipChange: recoverActiveWorkspaceRuntime,
    }
  );

  expect(recoverActiveWorkspaceRuntime).toHaveBeenCalledWith({ identityChanged: true });
});
```

```ts
// apps/moryflow/pc/src/main/app/runtime/active-vault-runtime.test.ts
it('rebuilds the current active workspace after membership identity changes', async () => {
  const ensureActiveVaultReady = vi.fn(async () => undefined);

  await reconcileActiveWorkspaceRuntimeAfterMembershipChange(
    {
      getStoredVault: async () => ({ path: '/vault-a' }),
      ensureActiveVaultReady,
      reinitCloudSync: vi.fn(async () => undefined),
    },
    { identityChanged: true }
  );

  expect(ensureActiveVaultReady).toHaveBeenCalledWith('/vault-a');
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/membership/runtime.test.ts \
  src/main/app/bootstrap/membership-reconcile.test.ts \
  src/main/app/runtime/active-vault-runtime.test.ts
```

Expected: FAIL，因为依赖接口仍是 `reinitCloudSync + triggerMemoryRescan` 分裂链路，且不存在统一的 `reconcileActiveWorkspaceRuntimeAfterMembershipChange()` 协调入口。

**Step 3: Write the minimal implementation**

把 membership 恢复动作收敛成一个主进程入口，`membership/runtime.ts` 不再直接知道 `rescan` 细节：

```ts
// apps/moryflow/pc/src/main/app/runtime/active-vault-runtime.ts
export async function reconcileActiveWorkspaceRuntimeAfterMembershipChange(
  deps: {
    getStoredVault: () => Promise<{ path?: string } | null>;
    ensureActiveVaultReady: (vaultPath: string) => Promise<void>;
    reinitCloudSync: () => Promise<void>;
  },
  input: { identityChanged: boolean }
): Promise<void> {
  if (!input.identityChanged) {
    await deps.reinitCloudSync();
    return;
  }

  const activeVault = await deps.getStoredVault();
  if (!activeVault?.path) {
    return;
  }
  await deps.ensureActiveVaultReady(activeVault.path);
}
```

```ts
// apps/moryflow/pc/src/main/membership/runtime.ts
export interface MembershipRuntimeDeps {
  clearUserIdCache: () => void;
  fetchCurrentUserId: () => Promise<string | null>;
  resetWorkspaceScopedRuntimeState: () => Promise<void>;
  reconcileActiveWorkspaceRuntimeAfterMembershipChange?: (input: {
    identityChanged: boolean;
  }) => Promise<void>;
}

if (membershipIdentityChanged) {
  await deps.resetWorkspaceScopedRuntimeState();
}

await deps.reconcileActiveWorkspaceRuntimeAfterMembershipChange?.({
  identityChanged: membershipIdentityChanged,
});
```

`index.ts` 负责把现有 `getStoredVault + ensureActiveVaultReady + cloudSyncEngine.reinit()` 组装进去；`membership-reconcile.ts` 只透传新接口，不再保留 `triggerMemoryRescan`。

**Step 4: Run tests to verify they pass**

Run the same command again:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/membership/runtime.test.ts \
  src/main/app/bootstrap/membership-reconcile.test.ts \
  src/main/app/runtime/active-vault-runtime.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add \
  apps/moryflow/pc/src/main/app/runtime/active-vault-runtime.ts \
  apps/moryflow/pc/src/main/app/runtime/active-vault-runtime.test.ts \
  apps/moryflow/pc/src/main/membership/runtime.ts \
  apps/moryflow/pc/src/main/membership/runtime.test.ts \
  apps/moryflow/pc/src/main/app/bootstrap/membership-reconcile.ts \
  apps/moryflow/pc/src/main/app/bootstrap/membership-reconcile.test.ts \
  apps/moryflow/pc/src/main/index.ts
git commit -m "fix: unify pc workspace runtime bootstrap after membership changes"
```

### Task 2: 通过 IPC 暴露最小 Bootstrap Hint

**Files:**
- Modify: `apps/moryflow/pc/src/main/memory-indexing/state.ts`
- Modify: `apps/moryflow/pc/src/main/memory-indexing/reconcile.ts`
- Modify: `apps/moryflow/pc/src/main/memory-indexing/reconcile.spec.ts`
- Modify: `apps/moryflow/pc/src/main/memory-indexing/__tests__/engine.spec.ts`
- Modify: `apps/moryflow/pc/src/shared/ipc/memory.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc/memory-domain/shared.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc/memory-domain/overview.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc/memory-domain/deps.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc/memory.test.ts`

**Step 1: Write the failing tests**

先把 bootstrap hint 的合同写红：

```ts
// apps/moryflow/pc/src/main/app/ipc/memory.test.ts
it('marks overview as bootstrapping when local docs exist and reconcile is pending', async () => {
  deps.memoryIndexing.getBootstrapState.mockReturnValue({
    pending: true,
    pendingPathCount: 3,
  });
  deps.documentRegistry.getAll.mockResolvedValue([
    { documentId: 'doc-1', path: 'notes/a.md', fingerprint: 'f1', contentFingerprint: 'c1' },
  ]);

  const result = await getMemoryOverviewIpc(deps);

  expect(result.bootstrap).toEqual({
    pending: true,
    hasLocalDocuments: true,
  });
});
```

```ts
// apps/moryflow/pc/src/main/memory-indexing/reconcile.spec.ts
it('tracks bootstrap pending around reconcile', async () => {
  await reconcileMemoryIndexingVault(...);
  expect(memoryIndexingEngine.markBootstrapStarted).toHaveBeenCalledWith('/vault-a');
  expect(memoryIndexingEngine.markBootstrapFinished).toHaveBeenCalledWith('/vault-a');
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/memory-indexing/reconcile.spec.ts \
  src/main/memory-indexing/__tests__/engine.spec.ts \
  src/main/app/ipc/memory.test.ts
```

Expected: FAIL，因为 `MemoryOverview` 还没有 `bootstrap` 字段，memory indexing runtime 也没有最小 bootstrap 状态。

**Step 3: Write the minimal implementation**

给 memory indexing runtime 加一个非持久化、最小的 bootstrap hint，不引入新状态机：

```ts
// apps/moryflow/pc/src/main/memory-indexing/state.ts
type BootstrapState = {
  pendingVaults: Set<string>;
};

markBootstrapStarted(vaultPath: string): void;
markBootstrapFinished(vaultPath: string): void;
getBootstrapState(vaultPath: string): { pending: boolean; pendingPathCount: number };
```

```ts
// apps/moryflow/pc/src/shared/ipc/memory.ts
export type MemoryOverview = {
  // ...
  bootstrap: {
    pending: boolean;
    hasLocalDocuments: boolean;
  };
};
```

```ts
// apps/moryflow/pc/src/main/app/ipc/memory-domain/overview.ts
return {
  // existing fields...
  bootstrap: {
    pending: deps.memoryIndexing.getBootstrapState(context.activeVault.path).pending,
    hasLocalDocuments: localDocumentCount > 0,
  },
};
```

关键点：

1. `reconcileMemoryIndexingVault()` 用 `try/finally` 标记 bootstrap 开始/结束。
2. `hasLocalDocuments` 直接基于当前 active vault 的 `documentRegistry.getAll()` 计算，不猜远端状态。
3. 这个 hint 只服务 presenter，不参与服务端 scope、不持久化、不引入额外恢复逻辑。

**Step 4: Run tests to verify they pass**

Run the same command again:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/memory-indexing/reconcile.spec.ts \
  src/main/memory-indexing/__tests__/engine.spec.ts \
  src/main/app/ipc/memory.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add \
  apps/moryflow/pc/src/main/memory-indexing/state.ts \
  apps/moryflow/pc/src/main/memory-indexing/reconcile.ts \
  apps/moryflow/pc/src/main/memory-indexing/reconcile.spec.ts \
  apps/moryflow/pc/src/main/memory-indexing/__tests__/engine.spec.ts \
  apps/moryflow/pc/src/shared/ipc/memory.ts \
  apps/moryflow/pc/src/main/app/ipc/memory-domain/shared.ts \
  apps/moryflow/pc/src/main/app/ipc/memory-domain/overview.ts \
  apps/moryflow/pc/src/main/app/ipc/memory-domain/deps.ts \
  apps/moryflow/pc/src/main/app/ipc/memory.test.ts
git commit -m "fix: expose pc memory bootstrap hint"
```

### Task 3: 修正 Renderer 状态语义，避免误导性空态

**Files:**
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.ts`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.test.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.test.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx`

**Step 1: Write the failing tests**

先把 presenter 语义写成纯函数测试：

```ts
// apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.test.ts
it('returns SCANNING when bootstrap is pending and local docs exist', () => {
  const summary = deriveKnowledgeSummary({
    overview: createOverview({
      sourceCount: 0,
      indexedSourceCount: 0,
      indexingSourceCount: 0,
      attentionSourceCount: 0,
    }, {
      bootstrap: { pending: true, hasLocalDocuments: true },
    }),
    loading: false,
    attentionItems: [],
    indexingItems: [],
  });

  expect(summary.state).toBe('SCANNING');
});
```

```ts
// apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.test.ts
it('does not show the full empty dashboard while knowledge bootstrap is pending', () => {
  expect(
    shouldShowMemoryEmptyDashboard({
      overview,
      overviewLoading: false,
      personalFactsCount: 0,
      graphEntityCount: 0,
      knowledgeState: 'SCANNING',
    })
  ).toBe(false);
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/knowledge-status.test.ts \
  src/renderer/workspace/components/memory/dashboard-state.test.ts
```

Expected: FAIL，因为当前 summary 只看远端 counts，整页空态也没有识别 bootstrap 初始化窗口。

**Step 3: Write the minimal implementation**

把空态判断抽成纯 presenter，不把分支逻辑继续堆在组件里：

```ts
// apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.ts
export function shouldShowMemoryEmptyDashboard(input: {
  overview: MemoryOverview | null;
  overviewLoading: boolean;
  personalFactsCount: number;
  graphEntityCount: number;
  knowledgeState: KnowledgeSummaryState;
}): boolean {
  if (input.overviewLoading) return false;
  if (input.knowledgeState === 'SCANNING') return false;
  // keep existing empty checks...
}
```

```ts
// apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.ts
const bootstrapScanning =
  overview.bootstrap.pending &&
  overview.bootstrap.hasLocalDocuments &&
  overview.indexing.sourceCount === 0 &&
  attentionSourceCount === 0 &&
  indexingSourceCount === 0;

const state: KnowledgeSummaryState =
  bootstrapScanning ? 'SCANNING'
  : attentionSourceCount > 0 ? 'NEEDS_ATTENTION'
  : indexingSourceCount > 0 ? 'INDEXING'
  : 'READY';
```

`index.tsx` 只消费 presenter 结果，不再内联猜“是不是空白”。

**Step 4: Run tests to verify they pass**

Run the same command again:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/knowledge-status.test.ts \
  src/renderer/workspace/components/memory/dashboard-state.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add \
  apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.ts \
  apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.test.ts \
  apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.ts \
  apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.test.ts \
  apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx
git commit -m "fix: make pc memory bootstrap state honest"
```

### Task 4: 在初始化窗口内做可停止的前台轮询

**Files:**
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory-page.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory-page.test.ts`
- Optionally Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.ts`

**Step 1: Write the failing tests**

先写一个只覆盖行为的 hook 回归：

```ts
it('polls overview and knowledge statuses while bootstrap is pending, then stops once stable', async () => {
  vi.useFakeTimers();

  mockMemoryApi.getOverview
    .mockResolvedValueOnce(createOverview({ bootstrap: { pending: true, hasLocalDocuments: true } }))
    .mockResolvedValueOnce(createOverview({
      indexing: { sourceCount: 3, indexedSourceCount: 0, indexingSourceCount: 3, attentionSourceCount: 0, lastIndexedAt: null },
      bootstrap: { pending: false, hasLocalDocuments: true },
    }));

  renderHook(() => useMemoryPage('vault-1:user-b'));
  await flushPromises();

  await act(async () => {
    vi.advanceTimersByTime(2_000);
    await Promise.resolve();
  });

  expect(mockMemoryApi.getOverview).toHaveBeenCalledTimes(2);
  expect(mockMemoryApi.getKnowledgeStatuses).toHaveBeenCalledTimes(4);
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/use-memory-page.test.ts
```

Expected: FAIL，因为当前 hook 只在 mount / scope change 时拉一次数据，不会自动收敛。

**Step 3: Write the minimal implementation**

在 hook 内增加一个小而可停止的 polling effect：

```ts
const shouldPollBootstrap =
  !overviewLoading &&
  overview?.bootstrap.pending === true &&
  overview.bootstrap.hasLocalDocuments === true;

useEffect(() => {
  if (!shouldPollBootstrap) return;
  const timer = window.setTimeout(() => {
    void Promise.all([loadOverview(), loadKnowledgeStatuses()]);
  }, 2000);
  return () => window.clearTimeout(timer);
}, [shouldPollBootstrap, loadOverview, loadKnowledgeStatuses, overview?.scope.workspaceId]);
```

约束：

1. 只轮询 `overview + knowledge statuses`，不重复拉 `facts / graph`。
2. 轮询必须受 `scopeKey` 保护，切换 workspace 或账号时清掉旧 timer。
3. 一旦 summary 进入 `INDEXING / NEEDS_ATTENTION / READY` 或 bootstrap hint 变为 `pending=false`，立即停止。

**Step 4: Run tests to verify they pass**

Run the same command again:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/use-memory-page.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add \
  apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory-page.ts \
  apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory-page.test.ts
git commit -m "fix: poll pc memory overview during bootstrap"
```

### Task 5: 最小闭环验证与文档回看

**Files:**
- Verify: `docs/design/moryflow/core/workspace-profile-and-memory-architecture.md`
- Verify: `docs/design/moryflow/features/moryflow-pc-memory-workbench-architecture.md`
- Verify: `docs/plans/2026-03-21-knowledge-indexing-rebuild-implementation-plan.md`

**Step 1: Run focused verification**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/membership/runtime.test.ts \
  src/main/app/bootstrap/membership-reconcile.test.ts \
  src/main/app/runtime/active-vault-runtime.test.ts \
  src/main/memory-indexing/__tests__/engine.spec.ts \
  src/main/memory-indexing/reconcile.spec.ts \
  src/main/app/ipc/memory.test.ts \
  src/renderer/workspace/components/memory/knowledge-status.test.ts \
  src/renderer/workspace/components/memory/dashboard-state.test.ts \
  src/renderer/workspace/components/memory/use-memory-page.test.ts
```

Expected: PASS

**Step 2: Run type and doc checks**

Run:

```bash
pnpm --filter @moryflow/pc typecheck
node scripts/check-doc-contracts.mjs
```

Expected: PASS

**Step 3: Re-read frozen docs**

确认实现没有偏离以下冻结事实；若无偏离，不再新增文档改动：

1. `docs/design/moryflow/core/workspace-profile-and-memory-architecture.md`
2. `docs/design/moryflow/features/moryflow-pc-memory-workbench-architecture.md`
3. `docs/plans/2026-03-21-knowledge-indexing-rebuild-implementation-plan.md`

**Step 4: Commit**

```bash
git add \
  docs/design/moryflow/core/workspace-profile-and-memory-architecture.md \
  docs/design/moryflow/features/moryflow-pc-memory-workbench-architecture.md \
  docs/plans/2026-03-21-knowledge-indexing-rebuild-implementation-plan.md \
  docs/plans/2026-03-22-pc-memory-bootstrap-runtime-unification.md
git commit -m "docs: freeze pc memory bootstrap implementation plan"
```
