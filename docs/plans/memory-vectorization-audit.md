# Memory 向量化系统审计与修复方案

> **status**: active
> 经两轮外部 code review 收敛的生产方案。本文档定义运行时边界、失败恢复、兼容性和可观测性到可直接实施的粒度。

---

## 1. 当前架构

```
PC Main Process (Electron)
  ├─ vault-watcher 监测文件变化
  ├─ memory-indexing engine 决定上传
  └─ 调用 Moryflow Server API
        ↓
Moryflow Server
  ├─ workspace-content 写入 WorkspaceDocument + WorkspaceContentOutbox
  └─ memox drain worker 每 5 秒消费 outbox
        ↓
Anyhunt Server (Memox)
  ├─ source-identities resolve → revision create → finalize
  ├─ chunking + embedding → SourceChunk 写入 pgvector
  └─ graph projection（默认关闭，需先完成用户级隔离）
        ↓
Retrieval / Search
  ├─ semantic search (pgvector cosine)
  ├─ keyword search (ILIKE + keywords 交集)
  └─ merge + rank + chunk window expansion
```

---

## 2. 问题诊断与修复方案

### 2.1 文件漏索引（A/B/C）

#### 恢复模型

PC 端文件索引的恢复分两层：**reconcile**（启动/rescan 时的最终状态收敛）和 **journal**（运行时事件暂存）。reconcile 是 truth source，journal 是辅助。

#### Reconcile 规则（问题 A 的核心修复）

`triggerMemoryRescan()` 改为 filesystem ↔ registry reconcile：

1. 扫描 vault 中所有 `.md`/`.markdown` 文件 → `pathsOnDisk: Set<relativePath>`
2. 从 registry 获取所有条目 → `pathsInRegistry: Set<relativePath>`
3. 纯路径集合比较产出 delta：

| 场景     | 检测方式                         | 产出事件                                 |
| -------- | -------------------------------- | ---------------------------------------- |
| 新文件   | `path ∈ disk && path ∉ registry` | `add`                                    |
| 删除文件 | `path ∈ registry && path ∉ disk` | `unlink`                                 |
| 已存在   | `path ∈ both`                    | `change`（signature 去重会跳过未变文件） |

**Rename 不做特殊检测**：registry 是 `path → documentId` 映射，文件重命名后无法可靠地把新路径关联到旧 documentId（需要 content fingerprint 匹配所有新旧文件，复杂且脆弱）。Rename 自然产出旧路径 `unlink` + 新路径 `add`，文件内容会被重新索引，用户无感知。这也是 vault-watcher 运行时的已有行为。

**批量注册**：新文件的 `ensureDocumentId()` 必须批量执行（先收集再一次性写入），不能逐个调用，否则会反复触发全量 `sync()`（`workspace-doc-registry/index.ts:155-173`）。

**变更文件**：`apps/moryflow/pc/src/main/index.ts`

#### Pending paths（问题 B/C 的核心修复）

运行时暂存一个 `pendingPaths: Set<string>`（absolutePath），不需要保留事件类型。

**写入时机**：

- profile resolve 失败时（B）：把 absolutePath 加入 `pendingPaths`
- `stop()` 调用时（C）：把所有 pending timer 对应的 absolutePath 加入 `pendingPaths`

**回放**：profile 就绪后触发 `triggerMemoryRescan()`，reconcile 会覆盖所有 pending 状态。对于 reconcile 未覆盖的 pendingPaths（文件在 vault 内但未被 reconcile 扫到的边缘 case），逐一调 `handleFileChange('change', ...)`，由 signature 去重跳过未变文件。回放后清空 `pendingPaths`。

reconcile 是 truth source，pendingPaths 只是确保"没有文件被遗忘"的安全网。不需要折叠规则和回放优先级——reconcile 的文件系统扫描已经产出了最终状态。

**变更文件**：`apps/moryflow/pc/src/main/memory-indexing/engine.ts`、`apps/moryflow/pc/src/main/memory-indexing/state.ts`

---

### 2.2 Chunking 拆分过碎（D/E/F/G）

#### 问题 D：chunk 大小参数

当前 `SOFT_TARGET=700 / HARD_MAX=1000`，CJK token 估算不准导致中文 chunk 远大于预期。

**修复参数**：见 §4 Chunking 参数最终基线。参数在合并前需通过离线 benchmark 验证（见 §9）。

**变更文件**：`apps/anyhunt/server/src/sources/source-chunking.service.ts`

#### 问题 E：正常路径无 chunk 间重叠

**修复**：同一 heading section 内 flush 时保留 120 token overlap；跨 heading 不保留。实现细节见 §4。

**变更文件**：`apps/anyhunt/server/src/sources/source-chunking.service.ts`

#### 问题 F：CJK token 估算

**修复**：混合估算 + 覆盖完整 CJK 范围 + 修复 `splitLongText` O(n²)。

CJK 范围（完整覆盖中日韩）：

| 范围            | 含义                         |
| --------------- | ---------------------------- |
| `U+3000–303F`   | CJK Punctuation              |
| `U+3040–309F`   | Hiragana                     |
| `U+30A0–30FF`   | Katakana                     |
| `U+31F0–31FF`   | Katakana Extension           |
| `U+3400–4DBF`   | CJK Extension A              |
| `U+4E00–9FFF`   | CJK Unified Ideographs       |
| `U+AC00–D7AF`   | Korean Syllables             |
| `U+F900–FAFF`   | CJK Compatibility Ideographs |
| `U+FF00–FFEF`   | Fullwidth Forms              |
| `U+20000–2A6DF` | CJK Extension B              |
| `U+2A700–2B73F` | CJK Extension C              |
| `U+2B740–2B81F` | CJK Extension D              |
| `U+2B820–2CEAF` | CJK Extension E              |
| `U+2CEB0–2EBEF` | CJK Extension F              |

`splitLongText` O(n²) 修复：用增量 `currentTokens` 变量替代对增长字符串重复调 `estimateTextTokens(next)`。每次追加 sentence 时只计算增量 `sentenceTokens + 1`（空格），不重新估算整个拼接结果。

**待验证**：`chars * 1.5` 是临时 heuristic。合并前用离线 tiktoken 校准（见 §9），把误差分布写入测试。

**变更文件**：`apps/anyhunt/server/src/sources/source-text.utils.ts`、`apps/anyhunt/server/src/sources/source-chunking.service.ts`

#### 问题 G：heading path 前缀

保留。符合最佳实践（ECIR 2026 研究：Context@5 从 33% → 55%）。

---

### 2.3 搜索与检索（H/I/J）

#### 问题 H：`knowledge_read` 工具 API 契约

**主键**：`documentId`。`path` 仅作兼容输入，必须先通过 registry 映射到 documentId + 验证在 active vault 内。

**IPC 契约**：

```typescript
// 新增 IPC 方法：memory.readWorkspaceFile
interface KnowledgeReadInput {
  /** 主键。knowledge_search 返回的 documentId */
  documentId: string;
  /** 兼容输入。必须先映射到 registry，拒绝裸绝对路径 */
  path?: string;
  /** 起始字符偏移，默认 0 */
  offsetChars?: number;
  /** 最大返回字符数，默认 20000，上限 50000 */
  maxChars?: number;
}

interface KnowledgeReadOutput {
  content: string;
  truncated: boolean;
  nextOffset: number | null;
  mimeType: string;
  totalBytes: number;
  relativePath: string;
}
```

**主进程实现规则**：

1. 如果传入 `path`：必须通过 `workspaceDocRegistry.getByPath()` 映射到 documentId，不接受裸绝对路径
2. 通过 `workspaceDocRegistry.getByDocumentId()` 获取 relativePath
3. 解析为 `path.join(activeVault.path, relativePath)` → 验证 `resolved.startsWith(activeVault.path)`，防止 `..` 遍历和软链接逃逸
4. `fs.stat` 检查文件大小 → 如果 > 10MB，返回 `{ content: '', truncated: true, totalBytes, ... }`，不读取
5. 检查 mimeType：只允许 `text/*`，二进制文件拒绝并返回错误
6. 按 `offsetChars` / `maxChars` 分段读取，返回 `truncated` 和 `nextOffset`

**Agent 工具定义**：

```typescript
const knowledgeReadSchema = z.object({
  documentId: z.string().min(1).describe('Document ID from knowledge_search results (preferred)'),
  path: z
    .string()
    .optional()
    .describe('Relative file path, used only if documentId is unavailable'),
  offsetChars: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Start reading from this character offset'),
  maxChars: z.number().int().min(1).max(50000).optional().describe('Maximum characters to return'),
});
```

**Tool description** 引导 Agent：先 `knowledge_search` 找文件 → 用 `knowledge_read` 的 `documentId` 读取内容 → 如果 `truncated=true`，用 `nextOffset` 继续读取。优先使用 `documentId`，`path` 仅作 fallback。

**knowledge_search description 同步更新**：在现有 description 末尾追加 `"Use knowledge_read with the returned documentId to get full file content when the snippet is not enough."`

**`knowledge_search` 与 `knowledge_read` 的统一字节预算**：两个工具共享同一个 `maxChars` 上限概念。`knowledge_search` 的 snippet 上限 800 字符，`knowledge_read` 默认 20000 字符/次、上限 50000 字符/次。避免一个收紧另一个无限。

**变更文件**：

- `apps/moryflow/pc/src/main/agent-runtime/knowledge-tools.ts`（新增 knowledge_read tool）
- `apps/moryflow/pc/src/shared/ipc/memory.ts`（新增 IPC 方法）
- `apps/moryflow/pc/src/main/app/ipc/memory-domain/*`（新增 handler）

#### 问题 I+J：中心化 snippet

**最终算法**：

```
输入：windowChunks[{chunkIndex, content}], bestChunkIndex, maxLength=800
输出：snippet string

1. 按 chunkIndex 升序排列
2. 找 best chunk 在排序后的位置 centerIdx
3. 如果 centerIdx 未找到（best chunk 丢失）→ fallback：拼接全部后截断
4. 如果只有 1 个 chunk → 直接截断返回
5. center = chunks[centerIdx].content
6. 如果 center 本身 > maxLength → 截断 center 返回
7. 计算剩余预算 = maxLength - center.length
8. 交替从两侧扩展：
   a. 如果剩余预算 > 0 且 left >= 0：
      - 计算 leftCandidate = chunks[left].content + '\n\n'
      - 如果 leftCandidate.length <= 剩余预算 → 拼入，left--，剩余 -= length
      - 否则 → 从 leftCandidate 尾部截取剩余预算（保留靠近 center 的部分）
   b. 如果剩余预算 > 0 且 right < length：
      - 同理，从 rightCandidate 头部截取
9. 对最终结果做一次空白归一化
10. 如果结果长度 > maxLength → 最终安全截断 + '…'
```

**边界行为**：

| 场景                  | 行为                                   |
| --------------------- | -------------------------------------- |
| best chunk 丢失       | fallback 到旧逻辑（全部拼接后截断）    |
| 单 chunk              | 直接截断，不做窗口扩展                 |
| best chunk 在窗口边缘 | 单侧扩展，另一侧预算全部给有内容的一侧 |
| 空内容 chunk          | 跳过，不占预算                         |
| best chunk 超长       | 截断 best chunk 自身，不扩展           |
| 归一化后长度变化      | 最终安全截断在归一化之后               |
| 省略号                | 只在最终截断时添加一次，不会重复       |

**向后兼容**：返回字段仍是 `snippet: string`，Anyhunt API 形状不变。语义变化（snippet 内容中心不同）会影响依赖旧 snippet 的测试或 UI snapshot，需同步调整。

**变更文件**：

- `apps/anyhunt/server/src/retrieval/retrieval-score.utils.ts` — 新增 `buildCenteredSnippet`
- `apps/anyhunt/server/src/retrieval/source-search.aggregator.ts` — 改用 centered snippet
- `apps/anyhunt/server/src/retrieval/source-search.service.ts` — radius=2，window content map 保留 chunk 级粒度（不预拼接）

---

### 2.4 知识图谱（K）

#### 问题 K：graph entity 用户级隔离缺失

保持 `MEMOX_SOURCE_GRAPH_PROJECTION_ENABLED` 默认 `false`。原因见第一轮 review P0 结论。

**隔离键选择（为后续 PR 定稳定合同）**：

使用 `projectId` 作为隔离键，而非 `userId`。理由：

- 同一用户多个 workspace/vault 之间也不应共享 entity graph
- Moryflow 中 `projectId = workspaceId`，天然对应一个知识空间
- Anyhunt 作为平台能力，`projectId` 是已有的 scope 字段，不需要新增
- 如果未来 Anyhunt 需要更广的多租隔离，`projectId` 比 `userId` 更容易泛化为 `graphScopeId`

**数据层变更**（后续 PR）：

- `GraphEntity` 唯一键从 `(apiKeyId, entityType, canonicalName)` 扩展为 `(apiKeyId, projectId, entityType, canonicalName)`
- `GraphEntity` 新增 `projectId` 列 + 复合索引
- `GraphRelation` 同理新增 `projectId`
- graph query 所有查询加 `projectId` 过滤
- 旧数据不做迁移，在新 scope 规则下由 reindex 重建

**Memory 面板 UI**：在 projection 未启用时，Connections 视图显示"知识图谱功能即将上线"状态提示，而非空白。

---

### 2.5 关键词提取（L）

#### 根因：缺 CJK 分词

当前 `/[\p{L}\p{N}_-]{3,}/gu` 把连续汉字当成一整个 token，停用词过滤无效。

**Step 1（本 PR）**：扩展英文停用词表（边际收益）。

**Step 2（后续 PR，需先 benchmark）**：

- 不锁定"选哪个分词器"，而是先做多语料 benchmark（中文笔记、日文笔记、代码 Markdown 混排、英文技术文档），再决定是否按语言分流
- `Intl.Segmenter` 作为零依赖默认方案（Node.js 16+ 原生支持，当前仓库基线满足）
- 中文增强分词（jieba / nodejieba）作为可选路径，仅在 benchmark 证明 `Intl.Segmenter` 不够时引入
- Anyhunt 是平台能力，keyword 优化不能只围绕中文笔记

---

## 3. 变更汇总

| #   | 问题                         | 修复方向                                        | 影响范围       |
| --- | ---------------------------- | ----------------------------------------------- | -------------- |
| A   | rescan 不扫描文件系统        | filesystem ↔ registry reconcile（路径集合比较） | PC 端          |
| B   | profile resolve 失败静默丢弃 | pendingPaths 暂存 + reconcile 兜底              | PC 端          |
| C   | generation 切换丢弃 pending  | timer 转存 pendingPaths + reconcile 兜底        | PC 端          |
| D   | chunk 大小参数不适配         | SOFT=800 / HARD=1500（需离线 benchmark）        | Anyhunt        |
| E   | 正常路径无 chunk 重叠        | 同 heading section 内 120 token overlap         | Anyhunt        |
| F   | CJK token 估算不准           | 混合估算 + 完整 CJK 范围 + O(n²) 修复           | Anyhunt        |
| G   | heading path 前缀            | 不做改动                                        | —              |
| H   | Agent 无法获取文件全文       | `knowledge_read` 工具（分页/上限/vault 沙箱）   | PC 端          |
| I+J | snippet 丢失命中内容         | 中心化截断 + radius=2 + maxLength=800           | Anyhunt        |
| K   | graph 隔离缺失               | 保持关闭，后续 PR 按 `projectId` 隔离           | 后续           |
| L   | 中文 keyword 无效            | Step 1 扩停用词；Step 2 benchmark 后引入分词    | Anyhunt / 后续 |

---

## 4. Chunking 参数最终基线

| 参数                         | 值                                           | 中文效果       | 英文效果   |
| ---------------------------- | -------------------------------------------- | -------------- | ---------- |
| `SOFT_TARGET_TOKENS`         | 800                                          | ~533 字        | ~3200 字符 |
| `HARD_MAX_TOKENS`            | 1500                                         | ~1000 字       | ~6000 字符 |
| `MIN_CHUNK_TOKENS`           | 200                                          | ~133 字        | ~800 字符  |
| `CHUNK_OVERLAP_TOKENS`       | 120                                          | ~80 字         | ~480 字符  |
| `FORCED_SPLIT_WINDOW_CHARS`  | 4000                                         | —              | —          |
| `FORCED_SPLIT_OVERLAP_CHARS` | 480                                          | —              | —          |
| Token 估算                   | CJK: `chars * 1.5`，其他: `chars / 4`        | 临时 heuristic | 需离线校准 |
| CJK 范围                     | 完整中日韩（含 Ext B-F、假名、韩文）         | —              | —          |
| Heading path                 | 保留 content 前缀 + 存 metadata              | —              | —          |
| Overlap 边界                 | 同 heading section 内保留，跨 heading 不保留 | —              | —          |

---

## 5. 检索参数最终基线

| 参数                | 旧值     | 新值                                       |
| ------------------- | -------- | ------------------------------------------ |
| Chunk window radius | 1        | 2                                          |
| Snippet 生成        | 前缀截断 | 围绕 best chunk 中心化截断                 |
| Snippet max length  | 320      | 800                                        |
| Agent 全文读取      | 无       | `knowledge_read`（分页/20k 默认/50k 上限） |

---

## 6. Reindex Maintenance Job 设计

Chunking 参数变更后，所有已索引文件需要重新 chunk + embed。

**不做一次性脚本**，做可查询的后台 job。

### Job 数据模型

```typescript
// 新增 Bull queue: MEMOX_REINDEX_MAINTENANCE_QUEUE
interface ReindexMaintenanceJobData {
  jobId: string; // UUID
  apiKeyId: string;
  cursor: string | null; // 分页游标
  pageSize: number; // 每批扫描 source 数，默认 50
  maxConcurrent: number; // 最大并发 reindex 数，默认 3
  processedCount: number; // 已处理
  failedCount: number; // 失败数
  skippedCount: number; // 跳过数（无 currentRevisionId）
  totalSourceCount: number | null; // 总数（首批扫描后填入）
  lastError: string | null;
  startedAt: string;
}
```

### 执行流程

1. **触发**：管理端 API 或 CLI 创建 maintenance job
2. **分页扫描**：按 `KnowledgeSource.id` 升序分页查询 `status=ACTIVE && currentRevisionId IS NOT NULL`
3. **逐 source reindex**：直接调用 `KnowledgeSourceRevisionService.reindex()`，复用其内部的：
   - revision 状态 CAS（`tryMarkProcessing`）
   - Redis per-source lease（`memox:source-processing-lock:${apiKeyId}:${sourceId}`）
   - chunking + embedding + chunk replace 全流程
4. **并发控制**：最多 `maxConcurrent` 个 source 同时 reindex，受现有 Redis lease 保护
5. **source 级失败处理**：单 source 失败 → 记录错误 + `failedCount++` + 继续下一个，不中断整个 job
6. **进度持久化**：每批完成后更新 job data（cursor / processedCount / failedCount）
7. **可暂停/恢复**：暂停 = 不再 enqueue 下一批；恢复 = 从上次 cursor 继续
8. **完成摘要**：job 完成后输出 `{processedCount, failedCount, skippedCount, totalSourceCount, durationMs, estimatedEmbeddingCalls}`

### 成本预估

- 假设 1000 个 source，平均每 source 5 个 chunk
- embedding 调用：1000 × 5 = 5000 次 `text-embedding-3-small`
- 成本：5000 × 平均 500 tokens × $0.02/M tokens ≈ $0.05
- 耗时：并发 3，每 source ~2-5 秒 → 约 10-30 分钟

---

## 7. 测试矩阵

### 7.1 Reconcile + Pending Paths（PC 端）

| Case                          | 输入                               | 预期                                                                   |
| ----------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| 离线新增文件                  | disk 有、registry 无               | reconcile 产出 `add`，批量注册到 registry                              |
| 离线删除文件                  | registry 有、disk 无               | reconcile 产出 `unlink`                                                |
| 离线 rename                   | registry 有旧 path，disk 有新 path | 旧路径 `unlink` + 新路径 `add`（不做 identity 迁移）                   |
| 离线 delete + recreate 同路径 | registry 有、disk 有               | reconcile 产出 `change`，signature 决定是否实际上传                    |
| 无变化文件                    | registry 有、disk 有、内容未变     | reconcile 产出 `change`，signature 去重跳过                            |
| profile 失败暂存              | handleFileChange 时 profile 不可用 | path 加入 pendingPaths                                                 |
| stop 转存                     | debounce 中调 stop                 | pending timer 的 path 加入 pendingPaths                                |
| pending 回放                  | profile 就绪后                     | reconcile 先执行，pendingPaths 中剩余的走 `handleFileChange('change')` |
| pending 回放幂等              | 重复回放同一 path                  | signature 去重跳过                                                     |
| 批量注册性能                  | 50 个新文件                        | 单次批量写入，不逐个 `sync()`                                          |

### 7.2 Chunking

| Case                  | 输入                   | 验证                                  |
| --------------------- | ---------------------- | ------------------------------------- |
| 纯中文笔记            | 1000 字中文            | chunk 数 ≈ 2，每 chunk ~533 字        |
| 纯英文笔记            | 3000 字英文            | chunk 数 ≈ 1，~3000 字符 < 800 tokens |
| 混合中英              | 中英交替段落           | token 估算正确反映混合比例            |
| 长单段无 heading      | 5000 字纯文本          | 强制拆分生效，按句号 + 滑窗           |
| 长代码块              | 200 行代码             | code fence 作为原子 block             |
| heading 边界 overlap  | heading 切换           | overlap buffer 清空，不跨 heading     |
| 同 heading 内 overlap | 连续段落超 SOFT_TARGET | 120 token overlap 注入                |
| 空文档                | 空字符串               | 返回空 chunks[]                       |
| 极小文档              | 100 字                 | 1 个 chunk，不拆分                    |
| O(n²) 回归            | 10000 个短句           | 计时 < 100ms（增量计数）              |

### 7.3 Centered Snippet

| Case                | 输入                          | 验证                      |
| ------------------- | ----------------------------- | ------------------------- |
| best chunk 在中间   | window=[3,4,**5**,6,7]        | snippet 以 chunk 5 为中心 |
| best chunk 在左边缘 | window=[**3**,4,5]            | 右侧获得全部剩余预算      |
| best chunk 在右边缘 | window=[3,4,**5**]            | 左侧获得全部剩余预算      |
| 单 chunk            | window=[**5**]                | 直接截断，不扩展          |
| best chunk 丢失     | bestChunkIndex 不在 window 中 | fallback 全部拼接后截断   |
| 空窗口              | window=[]                     | 返回空字符串              |
| best chunk 超长     | chunk 5 content > 800 字符    | 截断 best chunk，不扩展   |
| 空内容 chunk        | window 中某 chunk content=''  | 跳过，不占预算            |
| 归一化后长度变化    | content 含大量连续空白        | 最终截断在归一化之后      |

### 7.4 knowledge_read

| Case            | 输入                             | 验证                       |
| --------------- | -------------------------------- | -------------------------- |
| 正常读取        | 有效 documentId                  | 返回 content + mimeType    |
| path 映射       | 有效 relativePath                | 映射到 documentId 后读取   |
| 分页读取        | offsetChars=10000, maxChars=5000 | 返回指定范围 + nextOffset  |
| 大文件拒绝      | > 10MB 文件                      | truncated=true, content='' |
| 路径遍历拒绝    | path='../../etc/passwd'          | 拒绝，不读取               |
| 绝对路径拒绝    | path='/Users/xxx/...'            | 拒绝                       |
| 二进制文件拒绝  | documentId 指向 .png             | 返回错误                   |
| 文件不存在      | documentId 有效但文件已删除      | 返回 404                   |
| registry 无映射 | 未知 documentId                  | 返回 404                   |
| maxChars 上限   | maxChars=100000                  | 截断到 50000               |

---

## 8. 不做的事

| 不做                     | 理由                                   |
| ------------------------ | -------------------------------------- |
| tiktoken 运行时          | native 依赖；离线校准 + heuristic 即可 |
| 语义 chunking            | 端到端准确率不优于 recursive           |
| Parent-child chunking    | 场景不需要                             |
| LLM Contextual Retrieval | 成本过高                               |
| 修改 embedding 维度      | 需要 DB migration                      |
| 暴露 localPath           | 隐私泄露 + 权限回退                    |
| Graph 默认开启           | 隔离模型不满足                         |
| Reranker                 | 不是第一优先级                         |
| Embedding model 升级     | 瓶颈不在 embedding 质量                |

---

## 9. 分步执行计划

### Step 1：CJK token 估算 + 停用词扩展（F / L Step 1）

> 前置：无依赖。后续所有 chunking 改动都依赖准确的 token 估算。

**变更 1.1** — `apps/anyhunt/server/src/sources/source-text.utils.ts`

- 替换 `estimateTextTokens`：从 `length / 4` 改为 CJK 混合估算（§2.2 F 的代码，CJK 范围见 §2.2 F 表格）
- 扩展 `KEYWORD_STOP_WORDS`：追加英文停用词（§2.5 的列表）

**变更 1.2** — `apps/anyhunt/server/src/sources/source-chunking.service.ts`

- `splitLongText` O(n²) 修复：用增量 `currentTokens += sentenceTokens + 1` 替代 `estimateTextTokens(next)`

**测试** — `apps/anyhunt/server/src/sources/__tests__/source-chunking.service.spec.ts`

- 新增：纯中文 1000 字 → 验证 token 估算 ≈ 1500
- 新增：纯英文 3000 字符 → 验证 token 估算 ≈ 750
- 新增：中英混合 → 验证比例正确
- 新增：10000 短句性能 → 验证 < 100ms
- 更新：现有 case 的 token 预期值（估算公式变了）

**验证**：`pnpm --filter @anyhunt/anyhunt-server run test -- --run src/sources/__tests__/source-chunking.service.spec.ts`

---

### Step 2：Chunking 参数 + overlap（D / E）

> 依赖：Step 1（token 估算准确后参数才有意义）

**变更 2.1** — `apps/anyhunt/server/src/sources/source-chunking.service.ts`

- 常量：`SOFT_TARGET_TOKENS = 800`、`HARD_MAX_TOKENS = 1500`、`MIN_CHUNK_TOKENS = 200`
- 新增常量：`CHUNK_OVERLAP_TOKENS = 120`
- 更新：`FORCED_SPLIT_WINDOW_CHARS = 4000`、`FORCED_SPLIT_OVERLAP_CHARS = 480`
- 新增 overlap 逻辑：flush 后在同 heading section 内保留尾部 120 token 到 `overlapBuffer`，下次 flush 前注入。heading 变化时清空 `overlapBuffer`

**测试** — 同上测试文件

- 新增：heading 边界 overlap → 验证跨 heading 不保留 overlap
- 新增：同 heading 内连续段落 → 验证 120 token overlap 注入
- 新增：空文档 → 空 chunks
- 新增：极小文档 100 字 → 1 chunk
- 更新：所有现有 case 的 chunk 数和内容预期值（参数变了）

**验证**：同 Step 1

**并行任务**（不阻塞）：用 100 份真实笔记离线 tiktoken 校准 `chars * 1.5` 误差，结果写入测试 case 作为回归基线

---

### Step 3：中心化 snippet + window radius（I / J）

> 依赖：无（与 Step 1/2 可并行，不同 module）

**变更 3.1** — `apps/anyhunt/server/src/retrieval/retrieval-score.utils.ts`

- 新增 `buildCenteredSnippet()` 函数（§2.3 I+J 的算法）
- `truncateSnippet` 默认 `maxLength` 从 320 改为 800（被 `buildCenteredSnippet` 内部调用）

**变更 3.2** — `apps/anyhunt/server/src/retrieval/source-search.service.ts`

- `findChunkWindowsForCandidates` 的 radius 从 `1` 改为 `2`（L75）
- `buildWindowContentMap` 改为保留 chunk 级粒度：返回 `Map<windowKey, Array<{chunkIndex, content}>>` 而非拼接后的 string

**变更 3.3** — `apps/anyhunt/server/src/retrieval/source-search.aggregator.ts`

- `buildSourceSearchResults` 中调 `buildCenteredSnippet(windowChunks, candidate.bestChunkIndex)` 替代 `truncateSnippet(windowContent)`

**测试** — `apps/anyhunt/server/src/retrieval/__tests__/source-search.service.spec.ts`

- 新增 §7.3 所有 9 个 centered snippet case
- 更新：现有 snippet 相关 case 的预期值

**验证**：`pnpm --filter @anyhunt/anyhunt-server run test -- --run src/retrieval/__tests__/`

---

### Step 4：knowledge_read 工具（H）

> 依赖：无（与 Step 1-3 可并行，不同 app）

**变更 4.1** — `apps/moryflow/pc/src/shared/ipc/memory.ts`

- 新增 `KnowledgeReadInput` / `KnowledgeReadOutput` 类型（§2.3 H 的 IPC 契约）
- 新增 IPC 方法声明 `readWorkspaceFile`

**变更 4.2** — `apps/moryflow/pc/src/main/app/ipc/memory-domain/*`

- 新增 `readWorkspaceFile` handler：
  1. documentId → registry 查 relativePath（path 输入先映射 registry）
  2. `path.join(vault, relativePath)` + `startsWith` 校验
  3. `fs.stat` 大小检查（> 10MB 拒绝）
  4. mimeType 检查（只允许 text/\*）
  5. 分段读取 offsetChars / maxChars

**变更 4.3** — `apps/moryflow/pc/src/main/agent-runtime/knowledge-tools.ts`

- 新增 `knowledge_read` tool（schema 见 §2.3 H）
- 更新 `knowledge_search` description：追加引导到 `knowledge_read`
- `knowledge_search` 返回结果增加 `documentId` 字段

**测试** — `apps/moryflow/pc/src/main/memory-indexing/__tests__/` 或新建测试文件

- 新增 §7.4 所有 10 个 knowledge_read case

**验证**：PC 端测试命令

---

### Step 5：Reconcile + Pending Paths（A / B / C）

> 依赖：无（与 Step 1-4 可并行，不同模块）

**变更 5.1** — `apps/moryflow/pc/src/main/memory-indexing/engine.ts`

- 新增 `pendingPaths: Set<string>`
- `handleFileChange`：profile resolve 失败时 → `pendingPaths.add(absolutePath)` 然后 return
- `stop()`：pending timer 的 absolutePath 全部 `pendingPaths.add()` 后再 `state.reset()`

**变更 5.2** — `apps/moryflow/pc/src/main/index.ts`

- `triggerMemoryRescan()` 改为 reconcile（§2.1 Reconcile 规则）：
  1. 扫描 vault 文件系统 → `pathsOnDisk`
  2. registry `getAll()` → `pathsInRegistry`
  3. `pathsOnDisk - pathsInRegistry` → 批量 `ensureDocumentId` + `handleFileChange('add')`
  4. `pathsInRegistry - pathsOnDisk` → `handleFileChange('unlink')`
  5. 交集 → `handleFileChange('change')`
  6. `pendingPaths` 中剩余路径 → `handleFileChange('change')`
  7. 清空 `pendingPaths`

**变更 5.3** — `apps/moryflow/pc/src/main/memory-indexing/state.ts`

- 新增 `getPendingTaskPaths(): string[]` 方法，返回所有 pending timer 的 absolutePath

**测试** — `apps/moryflow/pc/src/main/memory-indexing/__tests__/engine.spec.ts`

- 新增 §7.1 所有 10 个 reconcile + pending paths case

**验证**：PC 端测试命令

---

### Step 6：Reindex maintenance job

> 依赖：Step 1 + 2 已部署到 Anyhunt Server（新 chunking 参数生效后才有意义 reindex）

**变更 6.1** — `apps/anyhunt/server/src/sources/` 新增文件

- 新增 `reindex-maintenance.processor.ts`：Bull processor
- 新增 `reindex-maintenance.service.ts`：分页扫描 + 逐 source `reindex()` + 进度更新
- 复用 `KnowledgeSourceRevisionService.reindex()` 的全部编排能力

**变更 6.2** — `apps/anyhunt/server/src/sources/sources.module.ts`

- 注册新 queue `MEMOX_REINDEX_MAINTENANCE_QUEUE` + processor

**变更 6.3** — 管理端触发入口（CLI 脚本或 admin API）

- 创建 maintenance job → enqueue 首批

**验证**：

- 在 staging 环境触发 → 检查 processedCount / failedCount / durationMs
- 抽样检查几个 source 的 chunk 数是否符合新参数预期

---

### Step 7：Graph projectId 隔离（K）— 独立 PR

> 依赖：无，但建议在 Step 6 之后（reindex 完成后再启用 graph projection，避免旧 chunk 生成脏图谱）

- `GraphEntity` 唯一键扩展 + `projectId` 列 + 索引
- `GraphRelation` 同理
- graph query 加 `projectId` 过滤
- 旧 graph 数据 truncate（在新 scope 下由 projection 重建）
- `MEMOX_SOURCE_GRAPH_PROJECTION_ENABLED` 默认值改为 `true`
- Memory 面板 Connections 视图：移除"即将上线"状态提示

### Step 8：CJK 分词（L Step 2）— 独立 PR

> 依赖：Step 1 已部署

- 多语料 benchmark（中文/日文/代码混排/英文技术文档）
- 根据 benchmark 决定：`Intl.Segmenter` 作为默认 vs 按语言分流
- 更新 `extractKeywords()` 的分词逻辑

---

## 附录：关键文件路径

| 组件                      | 路径                                                                        |
| ------------------------- | --------------------------------------------------------------------------- |
| PC 内存索引引擎           | `apps/moryflow/pc/src/main/memory-indexing/engine.ts`                       |
| PC 索引状态管理           | `apps/moryflow/pc/src/main/memory-indexing/state.ts`                        |
| PC 文件变更入口           | `apps/moryflow/pc/src/main/index.ts`                                        |
| PC Workspace Doc Registry | `apps/moryflow/pc/src/main/workspace-doc-registry/index.ts`                 |
| PC Agent Knowledge Tools  | `apps/moryflow/pc/src/main/agent-runtime/knowledge-tools.ts`                |
| PC Memory IPC Handlers    | `apps/moryflow/pc/src/main/app/ipc/memory-domain/*`                         |
| PC IPC 类型               | `apps/moryflow/pc/src/shared/ipc/memory.ts`                                 |
| Server Workspace Content  | `apps/moryflow/server/src/workspace-content/workspace-content.service.ts`   |
| Anyhunt Chunking          | `apps/anyhunt/server/src/sources/source-chunking.service.ts`                |
| Anyhunt Chunking Tests    | `apps/anyhunt/server/src/sources/__tests__/source-chunking.service.spec.ts` |
| Anyhunt Text Utils        | `apps/anyhunt/server/src/sources/source-text.utils.ts`                      |
| Anyhunt Source Search     | `apps/anyhunt/server/src/retrieval/source-search.service.ts`                |
| Anyhunt Search Aggregator | `apps/anyhunt/server/src/retrieval/source-search.aggregator.ts`             |
| Anyhunt Score Utils       | `apps/anyhunt/server/src/retrieval/retrieval-score.utils.ts`                |
| Anyhunt Search Tests      | `apps/anyhunt/server/src/retrieval/__tests__/source-search.service.spec.ts` |
| Anyhunt Graph Projection  | `apps/anyhunt/server/src/graph/graph-projection.service.ts`                 |
| Anyhunt Platform Config   | `apps/anyhunt/server/src/memox-platform/memox-platform.service.ts`          |
| PC Memory 面板 UI         | `apps/moryflow/pc/src/renderer/workspace/components/memory/`                |
| PC Engine Tests           | `apps/moryflow/pc/src/main/memory-indexing/__tests__/engine.spec.ts`        |

## 附录：业界参考来源

- arxiv 2505.21700：多数据集分析，上下文理解型查询在 512-1024 tokens 时效果最佳
- FloTorch 2026：512 tokens 在英文事实性查询准确率 69%（不直接适用于多语言上下文场景）
- NVIDIA 2024 FinanceBench：page-level chunking 总体最优，token-based 最佳 512-1024，15% overlap 最优
- Chroma 2025：检索性能在 2500 tokens 以上陡降（context cliff）
- Anthropic Contextual Retrieval：chunk 前缀上下文可减少 35% 检索失败
- ECIR 2026 Metadata 研究：heading path 前缀使 Context@5 从 33% → 55%
- Vectara NAACL 2025：chunking 配置对检索质量的影响不亚于 embedding 模型选择
- CJK Token 乘数：中文约 1.76x（cl100k_base 编码）
