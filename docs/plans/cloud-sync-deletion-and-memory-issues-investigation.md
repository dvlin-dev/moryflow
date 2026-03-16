# Cloud Sync 删除 & Memory 问题冻结方案

> 2026-03-16 冻结。状态：待审核。

---

## 一、云同步删除 — 文件被恢复

### 根因定位

**核心链路**：本地删除 → `detectLocalChanges` 构造 `contentHash: ''` + `incrementClock(mirrorClock, deviceId)` → 服务端 `resolveLocalDeleted(local, remote, relation)` 做决策。

**时钟对比机制**（`packages/sync/src/vector-clock.ts`）：

```
compareVectorClocks(local, remote):
  - equal:      所有分量相同
  - after:      本地所有分量 >= 远端，且至少一个 >
  - before:     本地所有分量 <= 远端，且至少一个 <
  - concurrent: 各有领先分量
```

**当前 `resolveLocalDeleted`**（`server/src/sync/sync-diff.ts:81-104`）：

| relation     | 当前行为 | 是否正确                          |
| ------------ | -------- | --------------------------------- |
| `after`      | delete   | 正确 — 本地严格领先，删除意图明确 |
| `before`     | download | 正确 — 远端有更新内容，保留修改   |
| `concurrent` | download | 正确 — 其他设备有修改，"修改优先" |
| `equal`      | download | **BUG** — 无人修改却恢复文件      |

**单设备正常流程**：mirror `{A:1}` → 删除 → increment → 发送 `{A:2}` → 服务端 `{A:1}` → `after` → 删除生效。**单设备下删除必定成功**。

**双设备恢复场景**：

1. 设备 A 上次同步后 mirror = `{A:1}`
2. 设备 B 编辑文件 → 服务端变为 `{A:1, B:1}`
3. 设备 A 删除 → increment → 发送 `{A:2}`
4. 服务端比较 `{A:2}` vs `{A:1, B:1}` → A 分量领先，B 分量落后 → `concurrent`
5. `concurrent` → download → 文件被恢复

**这个 `concurrent` 恢复在语义上是正确的**：设备 B 修改了文件，保留修改符合 "修改优先" 原则。

**用户感知到的问题**可能有两类：

- 确实是双设备 `concurrent`（用户忘记了另一台有修改）— 行为正确，但缺少 UX 解释
- `equal` 触发了恢复 — 这是 bug（理论上因 increment 不应触发，但防御性代码写成了 download）

### 冻结决策

1. **`equal` → delete**：修复 `resolveLocalDeleted` 中 `equal` case，改为执行删除
2. **`concurrent` 保持 download**：符合 "修改优先" 原则，不改
3. **删除事件缩短 debounce**：`sync-engine` 对 `unlink` 事件使用 50ms debounce（当前统一 300ms），减少删除到同步的时间窗口
4. **恢复通知**：当文件因 `concurrent` 被恢复时，通过 IPC 通知渲染进程，在云同步状态中显示简短提示（如 "2 files restored from cloud due to changes on another device"）

### 执行步骤

**S1.1 — 修复 `equal` case**

- 文件：`apps/moryflow/server/src/sync/sync-diff.ts:86-103`
- 改动：`case 'equal'` 与 `case 'after'` 合并，返回 `{ action: 'delete' }`
- 单测：新增 sync-diff 单测覆盖 `resolveLocalDeleted` 四种 relation

```typescript
// 改为：
case 'after':
case 'equal':
  return {
    fileId: local.fileId,
    path: local.path,
    action: 'delete',
    contentHash: remote.contentHash,
  };
case 'before':
case 'concurrent':
  return createDownloadAction(remote);
```

**S1.2 — 删除事件快速同步**

- 文件：`apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts`（`handleFileChange`）
- 改动：`unlink` case 使用 `scheduleSync(performSync, { debounceMs: 50 })` 或新增 `scheduleSyncImmediate` 变体
- 文件：`apps/moryflow/pc/src/main/cloud-sync/sync-engine/scheduler.ts`
- 改动：支持可选 debounce 参数，默认 300ms，deletion 传 50ms

**S1.3 — 恢复通知（可选，低优先）**

- 文件：`apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts`
- 改动：在 `applyChangesToSyncMirror` 阶段，收集被 download 恢复的文件列表
- 文件：`apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts`
- 改动：通过 IPC 事件发送 `cloud-sync:files-restored` 给渲染进程
- 渲染侧：在云同步状态区域显示一次性提示

---

## 二、Memory 知识库 12 个文件卡在 Pending

### 根因定位

**致命链条**：

1. `flushDocument` 调用 `readText(absolutePath)` 读取被删除的文件 → ENOENT；或服务端返回 400 VALIDATION_ERROR（`sync_object_ref` 与实际 vault 状态不一致）
2. 重试 3 次后 `scheduleRetry` 返回 false → `resetTask` 清除本地跟踪 → `throw error` 被外层 `catch` 吞掉（仅 `console.error`）
3. **服务端 `pendingSourceCount` 永远不减少** — 客户端从未通知服务端该文件索引失败
4. UI 查询 `overview.indexing.pendingSourceCount` → 永远显示 12 pending

**错误分类缺失**：`flushDocument` 的 `catch` 不区分可重试错误（网络超时）和不可重试错误（ENOENT、400）。对不可重试错误做 3 次 retry 纯粹浪费。

**`sync_object_ref` 失效场景**：云同步恢复文件后，syncMirror 的 `lastSyncedHash`/`lastSyncedStorageRevision` 可能与服务端实际状态不一致 → `batchUpsert` 传了过期的 `storageRevision` → 400 VALIDATION_ERROR。

### 冻结决策

1. **错误分类**：区分不可重试（ENOENT / 4xx）和可重试（网络错误 / 5xx）
2. **ENOENT 自动转 delete**：`flushDocument` 捕获 ENOENT 后直接调用 `flushDelete`，不 retry
3. **4xx 不 retry + fallback**：`sync_object_ref` 验证失败时，回退到 `inline_text` 模式重试一次；若仍失败则调用 `batchDelete` 清除服务端 pending 记录
4. **IPC 错误反馈**：永久失败后通过 IPC 通知渲染进程，UI 在 Knowledge Panel 显示具体失败文件列表

### 执行步骤

**S2.1 — 错误分类工具**

- 文件：`apps/moryflow/pc/src/main/memory-indexing/engine.ts`
- 新增：

```typescript
const isNonRetryable = (error: unknown): boolean => {
  if (error && typeof error === 'object') {
    // ENOENT — 文件不存在
    if ('code' in error && (error as { code: string }).code === 'ENOENT') return true;
    // 4xx — 服务端验证失败
    if ('status' in error && typeof (error as { status: number }).status === 'number') {
      const status = (error as { status: number }).status;
      return status >= 400 && status < 500;
    }
  }
  return false;
};
```

**S2.2 — `flushDocument` ENOENT 转 delete**

- 文件：`apps/moryflow/pc/src/main/memory-indexing/engine.ts`
- 改动：在 `readText` 调用处包裹 try-catch，捕获 ENOENT 后调用 `flushDelete`

```typescript
let contentText: string;
try {
  contentText = await resolvedDeps.files.readText(params.absolutePath);
} catch (readError) {
  if (isNonRetryable(readError)) {
    // 文件已不存在，转为删除
    await flushDelete({
      workspacePath: params.workspacePath,
      relativePath: params.relativePath,
      documentId: params.documentId,
      taskKey: params.taskKey,
      generation: params.generation,
      expectedProfileKey: params.expectedProfileKey,
      expectedUserId: params.expectedUserId,
    });
    return;
  }
  throw readError;
}
```

**S2.3 — `batchUpsert` 4xx 不 retry + fallback**

- 文件：`apps/moryflow/pc/src/main/memory-indexing/engine.ts`（`flushDocument` catch 块）
- 改动：

```typescript
} catch (error) {
  if (!isCurrentGeneration(params.generation)) return;

  if (isNonRetryable(error)) {
    // sync_object_ref 验证失败 → 回退 inline_text 重试一次
    if (document.mode === 'sync_object_ref') {
      try {
        const fallbackDoc: WorkspaceContentDocument = {
          documentId: params.documentId,
          path: relativePath,
          title,
          mimeType: 'text/markdown',
          contentHash,
          contentBytes: Buffer.byteLength(contentText),
          mode: 'inline_text',
          contentText,
        };
        await resolvedDeps.api.batchUpsert({
          workspaceId: context.profile.workspaceId,
          documents: [fallbackDoc],
        });
        if (isCurrentGeneration(params.generation)) {
          resolvedDeps.state.markUploaded(params.taskKey, buildUploadSignature(fallbackDoc));
        }
        return;
      } catch {
        // fallback 也失败，走清理
      }
    }
    // 永久失败：清理服务端 pending 状态
    resolvedDeps.state.resetTask(params.taskKey);
    try {
      await resolvedDeps.api.batchDelete({
        workspaceId: context.profile.workspaceId,
        documents: [{ documentId: params.documentId }],
      });
    } catch {
      // best-effort cleanup
    }
    return;
  }

  // 可重试错误，走原有 retry 逻辑
  const scheduled = resolvedDeps.state.scheduleRetry(params.taskKey, () => { ... });
  ...
}
```

**S2.4 — 清理现有卡住的 pending**

- 当前 12 个卡住的文件需要手动清理
- 方案：在 engine `stop()` 或启动时，如果发现 registry 中有文件 documentId 但本地文件不存在，主动发送 `batchDelete` 清除对应的 workspace-content 记录
- 文件：`apps/moryflow/pc/src/main/memory-indexing/engine.ts`
- 新增 `reconcile()` 方法，在 `handleFileChange` 外部由 `index.ts` 在启动阶段调用

---

## 三、Memory 搜索冗余 — 移除 Memory tab 独立搜索

### 根因定位

| 搜索                               | API                                   | 范围                                          |
| ---------------------------------- | ------------------------------------- | --------------------------------------------- |
| 全局搜索 (`global-search`)         | `search.query` + `memory.search` 并行 | Files + Threads + Memory Files + Memory Facts |
| Memory 搜索 (`search-overlay`)     | `memory.search`                       | Memory Facts + Memory Files                   |
| Knowledge 搜索 (`knowledge-panel`) | `memory.search`                       | Knowledge Facts + Files                       |

全局搜索已完全覆盖 Memory 搜索的范围（且多出 Threads + 本地 Files）。Memory tab 的搜索按钮和 SearchOverlay 是多余入口。

Knowledge Panel 内的搜索是 Knowledge 子面板的过滤功能，保留。

### 冻结决策

1. **移除 Memory Dashboard 右上角搜索按钮和 SearchOverlay**
2. **保留 Knowledge Panel 内的搜索**（它是 Knowledge 子面板的上下文过滤器，不是独立搜索入口）
3. **全局搜索已具备 Memory 能力，无需额外补全**

### 执行步骤

**S3.1 — 移除 SearchOverlay 及关联代码**

- 文件：`apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx`
  - 删除 `import { SearchOverlay }` 和 `<SearchOverlay ... />`（行 315-323）
  - 删除 `handleOpenSearch`（行 93）和 `handleSearch`（行 138-143）
  - 删除右上角搜索按钮 `<Button ... onClick={handleOpenSearch}>`（行 174-176）
- 文件：`apps/moryflow/pc/src/renderer/workspace/components/memory/search-overlay.tsx`
  - 删除整个文件
- 文件：`apps/moryflow/pc/src/renderer/workspace/components/memory/memory-store.ts`
  - `MemoryDetailView` 类型中移除 `'search'`
- 文件：`apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory-page.ts`
  - 移除 `searchResults` / `searchLoading` / `searchAll` / `clearSearch` 相关 state 和函数（行 60-61, 268-293）
  - 从 return 中移除对应字段

**S3.2 — 清理 const.ts 无引用常量**

- 检查 `MEMORY_TABS` 中 `search` tab 是否仍有引用，若无则删除

---

## 四、Memory tab Stale-While-Revalidate 刷新

### 根因定位

`use-memory-page.ts` 用 `useState` 管理所有数据 → 组件卸载时数据丢失 → 重新挂载时 `scopeKey` 变化检测触发 → reset 所有 state 为 null/loading → 全量重新请求。

用户每次从其他 tab 切到 Memory tab，都要看到加载骨架等待网络请求。

### 冻结决策

将 Memory 数据缓存提升到 Zustand store（`memory-store.ts`），组件卸载不丢失。挂载时立即渲染缓存数据，后台静默刷新。

### 执行步骤

**S4.1 — 扩展 `memory-store.ts` 增加数据缓存**

```typescript
interface MemoryDataCache {
  scopeKey: string | undefined;
  overview: MemoryOverview | null;
  personalFacts: MemoryFact[];
  personalFactsHasMore: boolean;
  knowledgeFacts: MemoryFact[];
  graphEntities: MemoryGraphEntity[];
  graphRelations: MemoryGraphRelation[];
}

// 新增 actions:
setDataCache: (cache: Partial<MemoryDataCache>) => void;
```

**S4.2 — 改造 `use-memory-page.ts`**

核心改动：

```typescript
export function useMemoryPage(scopeKey: string | undefined): MemoryPageState {
  // 从 store 读取缓存
  const cached = useMemoryStore((s) => s.dataCache);
  const setDataCache = useMemoryStore((s) => s.setDataCache);

  // scopeKey 不变时复用缓存初始值
  const isSameScope = cached.scopeKey === scopeKey;
  const [overview, setOverview] = useState<MemoryOverview | null>(
    isSameScope ? cached.overview : null
  );
  // ... 其他 state 同理

  // 是否有缓存数据（决定是否显示 loading）
  const hasCache = isSameScope && cached.overview !== null;

  // loading 仅在无缓存时为 true
  const [overviewLoading, setOverviewLoading] = useState(!hasCache);

  // refresh 完成后同步写回 store
  const refresh = useCallback(async () => {
    await Promise.all([loadOverview(), loadPersonalFacts(), loadKnowledgeFacts(), loadGraph()]);
    // 每个 load* 函数内部在 setState 同时也 setDataCache
  }, [...]);

  // scopeKey 变化时：只 cancel in-flight + refresh，不 reset state（如果有缓存）
  useEffect(() => {
    if (prevScopeKeyRef.current === scopeKey) return;
    prevScopeKeyRef.current = scopeKey;
    // cancel in-flight
    overviewReqRef.current = '';
    // ...
    // 如果 scopeKey 变化了（vault 切换），才 reset
    if (!isSameScope) {
      setOverview(null);
      setOverviewLoading(true);
      // ...
    }
    void refresh();
  }, [scopeKey, refresh, isSameScope]);

  // ...
}
```

**S4.3 — 后台刷新指示器**

- 文件：`apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx`
- 在 header 区域，当有缓存数据但正在刷新时，显示一个小的旋转图标（`RefreshCw` from lucide-react，size-3.5，muted）
- 无缓存时正常显示骨架

---

## 五、Connections (Graph) 可发现性

### 现状

功能已实现，入口在 Memory Dashboard 的 Connections 卡片（`connections-card.tsx`）。但当 entity/relation 数量为 0 时，卡片不够醒目，容易忽略。

### 冻结决策

不做额外改动。Graph 入口已存在于 Memory Dashboard。如果 entity/relation 为 0，说明 Memox 侧的 entity extraction 尚未完成或无数据。这是后端数据就绪问题，不是前端入口问题。

---

## 执行顺序与验证

### 优先级排序

| 优先级 | 任务                             | 风险                   | 预估改动量                           |
| ------ | -------------------------------- | ---------------------- | ------------------------------------ |
| P0     | S2.1-S2.4 Memory Pending 修复    | 低 — 纯客户端错误处理  | engine.ts ~60 行改动                 |
| P1     | S1.1 sync-diff `equal` 修复      | 低 — 纯函数改动 + 单测 | sync-diff.ts 2 行 + 单测             |
| P1     | S3.1-S3.2 移除 Memory 搜索       | 低 — 纯删除            | 删除 1 文件 + 4 文件改动             |
| P2     | S4.1-S4.3 Stale-While-Revalidate | 中 — 涉及 store 结构   | memory-store.ts + use-memory-page.ts |
| P2     | S1.2 删除快速同步                | 低 — scheduler 改动    | scheduler.ts + index.ts              |
| P3     | S1.3 恢复通知                    | 低 — 增量              | executor.ts + IPC                    |

### 验证计划

1. **S1.1 sync-diff**：`pnpm --filter @moryflow/server test` — sync-diff 单测全过
2. **S1.2 scheduler**：手动验证 — 删除文件后检查 sync 日志确认 50ms 内触发
3. **S2.x Memory Pending**：
   - 重现：删除已索引文件 → 检查日志不再出现无限 retry
   - 验证：Knowledge Panel pending 数归零
4. **S3.x 搜索移除**：`pnpm --filter moryflow-pc typecheck && pnpm --filter moryflow-pc lint`
5. **S4.x SWR**：手动验证 — 切换 tab 时无加载闪烁，后台刷新指示器正常

### 回归

```bash
pnpm --filter moryflow-pc typecheck
pnpm --filter moryflow-pc lint
pnpm --filter moryflow-pc test:unit
pnpm --filter @moryflow/server test
```
