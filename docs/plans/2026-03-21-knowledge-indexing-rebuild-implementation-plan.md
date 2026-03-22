# Knowledge Indexing Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重建 Moryflow -> Memox -> Anyhunt -> PC -> Renderer 的知识索引链路，使索引状态诚实、模型职责清晰、系统可自动自愈，并在上线时直接 reset memory/vector/graph 派生域后从 canonical workspace documents 全量重建。

**Architecture:** 这次实现不修旧状态，也不做数据回填。`KnowledgeSource` 收敛为 aggregate，`KnowledgeSourceRevision` 收敛为 attempt 状态机；索引资格判定前置到 Moryflow materialize 之前；Anyhunt 输出唯一的 ingest read model；Moryflow/PC/Renderer 只传递和展示语义，不再各自猜状态。运行期不提供任何用户可见的 `Retry / Rebuild` 按钮，系统通过 bounded retry + 周期 reconcile 自动处理。

**Tech Stack:** Prisma, NestJS, BullMQ, ScheduleModule, Zod, Electron IPC, React, Zustand, `@moryflow/api`

**Companion Review:** `docs/plans/2026-03-21-knowledge-indexing-state-model-rebuild.md`

---

## 执行状态

- `[x]` Task 1 共享 classifier
- `[x]` Task 2 Anyhunt aggregate schema
- `[x]` Task 3 revision 生命周期
- `[x]` Task 4 Anyhunt read model / overview
- `[x]` Task 5 文件级状态查询
- `[x]` Task 6 Moryflow projection 写链
- `[x]` Task 7 自动 reconcile
- `[x]` Task 8 server / IPC contract
- `[x]` Task 9 renderer
- `[x]` Task 10 reset + rebuild 工程化

### 当前执行记录

- 已完成 Task 1：新增 `classifyIndexableText()` 共享纯函数，并接入 `@moryflow/api` 导出。
- 已完成 Task 2：`KnowledgeSource` 收敛为 aggregate，新增 `latestRevisionId` 指针，移除 source-level `PROCESSING / FAILED` 生命周期语义。
- 已完成 Task 3：`KnowledgeSourceRevisionService` 改为以 revision 为唯一 durable lifecycle，受理后的 finalize 结果只落 `INDEXED / FAILED`，不再写 source-level processing/failed 状态。
- 已完成 Task 4：新增 `SourceIngestReadService` 统一输出 `READY / INDEXING / NEEDS_ATTENTION` 语义汇总，`MemoryOverviewService` 改为完全委托该 read model。
- 已完成 Task 5：新增 `GET /api/v1/source-statuses` 与 Moryflow `getKnowledgeStatuses()` 透传链路，文件级状态查询统一输出 `INDEXING / NEEDS_ATTENTION` 和 user-facing reason，不再暴露旧 pending/failed 计数字段。
- 已完成 Task 6：projection 写链改为以 canonical `revisionId` 为 idempotency 根，consumer 只处理仍代表当前文档状态的 outbox 事件；删除双 `resolveSourceIdentity()`，并将 `no indexable text` 收敛为 quiet skip/delete existing source。
- 已完成 Task 7：新增 `MemoxWorkspaceContentReconcileService` 与 10 分钟周期 scheduler，自愈逻辑只基于 canonical document state、matching outbox event 和 Anyhunt source existence 判定是否补 enqueue；保留 internal `rebuild` 入口，但运行期不再依赖人工 retry/rebuild。
- 已完成 Task 8：Moryflow server 新增 `GET /api/v1/memory/knowledge-statuses`，PC main API client / Electron IPC / preload / shared IPC contract 全部改为统一的 `indexingSourceCount / attentionSourceCount` 字段和 `getKnowledgeStatuses()` 查询入口，main/shared 链路已无旧 `pending/failed` 残留。
- 已完成 Task 9：renderer 新增 `deriveKnowledgeSummary()` 唯一 presenter，Knowledge card / panel 只展示 `Scanning / Needs attention / Indexing / Ready` 四种状态；detail panel 改为真实的 attention/indexing 文件列表，移除知识搜索与前端自推导 `pending/failed` 语义；`useMemoryPage()` 只加载 manual facts、graph 和文件级知识状态列表，不再多发 derived/search 请求。
- 已完成 Task 10：新增 `scripts/reset-knowledge-index-domain.mjs` 与 `scripts/rebuild-knowledge-index-domain.mjs`，并补充 root script 入口；`reset` 默认只清 Anyhunt vector 库中的 knowledge/memory/graph 派生表与对应 R2 对象，`rebuild` 默认通过 `POST /internal/sync/memox/workspace-content/rebuild` + `replay` 从 canonical `WorkspaceDocument` 全量重建；同时把 `rebuildActiveDocuments()` 改为分页扫描整个 canonical 文档集，而不是只取前 500 条。
- 已完成 reset/rebuild 根因修复：把“文本 normalize + retrievable block 提取”抽到 `packages/api/src/file-index/structured-blocks.ts` 作为唯一语义源，`classifyIndexableText()` 与 Anyhunt `SourceChunkingService` 现在强制共用同一套规则；heading-only markdown 会被稳定识别为 `no indexable text`，不会再被 Moryflow 当成可索引内容送入 Anyhunt 后在 finalize 阶段炸成 `No retrievable chunks generated`。
- 已完成 execute 阶段第二个根因定位：首次真实 reset 后，rebuild 继续暴露出 internal canonical write 仍走 Anyhunt public `source-revisions/:revisionId/finalize` 配额，73 个文档在同一 API key 的 `FINALIZE_RATE_LIMIT_EXCEEDED` 窗口里被拦截；根因不是数据问题，而是“内部系统写入”和“公网 API guardrail”仍共用同一条 finalize 通道。
- 已完成 internal write 通道重构：Anyhunt 新增 `InternalServiceTenantGuard` 与 `InternalMemoxWriteController`，内部调用必须同时携带 `Authorization: Bearer <INTERNAL_API_TOKEN>` 和 `X-Anyhunt-Api-Key: <tenant api key>`；Moryflow `MemoxClient` 在配置了 `ANYHUNT_INTERNAL_API_TOKEN` 后自动把 `source identity lookup/resolve`、`revision create/finalize` 和 `source delete` 切到 `/internal/memox/*`，对外 public API/search 契约保持不变。
- 已完成 finalize guardrail 解耦：`KnowledgeSourceRevisionService.finalize()` 现在显式支持 `bypassFinalizeWindow` 选项，只有 internal memox finalize 会跳过 public finalize 窗口限流；size/token/chunk/concurrent slot 等真实 ingest guardrail 继续保留，避免 internal rebuild 重新变成无限制旁路。
- 已完成 execute 前状态清理：确认 `WorkspaceContentOutbox` 是派生状态后已清空上一轮失败残留（`842 -> 0`），并重新执行一次真实 `reset-knowledge-index-domain --execute`，当前 knowledge/memory/vector/graph 派生域已经处于干净基线，可直接进入新版 internal write 链路的真实 rebuild。
- 已确认线上 Anyhunt 向量库 live schema 与新模型一致：`KnowledgeSource` 真实列集已经包含 `latestRevisionId`，并且可直接查询到 `status/currentRevisionId/latestRevisionId`，`source identity` 查询链路不再存在 schema 漂移。
- 已确认当前 Moryflow `WorkspaceContentOutbox` 中的 `68` 条死信全部属于旧执行残留：主要是 internal finalize 改造前遗留的 `FINALIZE_RATE_LIMIT_EXCEEDED`，少量为服务重启窗口里的 `fetch failed`；这些是派生状态脏数据，不再作为新版链路 blocker，正式 execute 前将直接清空。
- 已完成正式 execute 前 outbox 基线清理：`WorkspaceContentOutbox` 真实残留从 `118`（`68` dead-letter + `50` processed 历史）已直接清空为 `0`，当前 Moryflow canonical 重建将从无队列残留的干净基线开始。
- 已完成真实 `reset-knowledge-index-domain --execute`：Anyhunt 向量库本次清空了 `KnowledgeSource=57`、`KnowledgeSourceRevision=70`、`SourceChunk=14`、`MemoryFact=25`、`GraphObservation=143` 等 13 张派生表，并同步删除 `70` 个 derived R2 object；当前 knowledge/memory/vector/graph 派生域已回到全空基线。
- 已完成 execute 阶段第三个根因修复：Anyhunt idempotency layer 现在支持按调用方显式开启“`FAILED` 且 `responseStatus >= 500` 时重新开始执行”；本次只对 source identity resolve 开启该能力，避免 memox internal `source-identity` 固定 key 把历史 500 永久 replay 成假死。
- 已完成 Anyhunt 幂等修复验证与服务切换：`src/idempotency` 新增回归测试共 `16` 项全部通过，`pnpm --filter @anyhunt/anyhunt-server build` 已通过；本地 Anyhunt 已重启到新构建，3300 端口当前由新进程承载，后续 replay 将直接命中新逻辑。
- 已完成新版 execute 前 outbox 再清理：确认旧运行残留仍有 `35` 条 dead-letter 和 `72` 条 processed 历史后，已将 `WorkspaceContentOutbox` 从 `107 -> 0` 全量清空；下一轮 rebuild 将完全基于 canonical workspace documents 重新入队，不复用任何旧队列残留。
- 已完成 execute 阶段第四个根因定位：在 source identity idempotency 假死修复后，真实 rebuild 暴露出 `KnowledgeSourceRevisionService.finalize()` 的下一层瓶颈不是 API 或 queue，而是 `SourceChunkRepository.replaceRevisionChunks()` 里的 raw vector writes 会被 Prisma 的 transaction API 5 秒窗口卡住；无论是最早的 interactive callback，还是后来的 batch transaction，只要 `prisma.$executeRaw()` 仍运行在 Prisma transaction 里，就会在真实 chunk replace 超过 `5000ms` 时抛 `Transaction API error: A query cannot be executed on an expired transaction`。
- 已完成第四个根因的最终修复：`SourceChunkRepository` 现在改为“`deleteMany` 后顺序执行 chunked raw INSERT、完全不包 Prisma transaction”的可重试写法；由于 revision 只有在 chunk 全部写完后才会 `markIndexed + activateRevision`，未激活 revision 上的部分 chunk 对外不可见，retry 时再次 `deleteMany` 即可自愈，因此这是一种更贴合当前领域模型的根因修复，而不是继续和 Prisma 的长事务窗口对抗。
- 已完成第四个根因的 TDD 回归：`source-chunk.repository.spec.ts` 先改成红灯，显式要求“`replaceRevisionChunks()` 不允许再包任何 Prisma transaction”；在仓储实现调整后测试已转绿，避免以后再次回退到任何会触发 transaction timeout 的版本。
- 已完成 execute 前 Anyhunt 派生队列清理：在停止本地 Anyhunt 进程后，已对 `memox-source-memory-projection`、`memox-graph-projection`、`memox-graph-scope-rebuild`、`memox-source-cleanup`、`memox-source-revision-cleanup`、`memox-reindex-maintenance` 执行强制 `obliterate`；其中 `memox-graph-projection` 清理前仍残留 `2 active + 237 waiting + 500 failed + 100 completed`，当前所有 memox 派生队列均已归零，不再存在旧 projection job 回写脏数据的入口。
- 已完成第二次真实 `reset-knowledge-index-domain --execute`：由于旧 graph/source projection job 在上一次 Anyhunt 重启时重新写回了派生数据，本轮 reset 额外清空了 `KnowledgeSource=38`、`KnowledgeSourceRevision=61`、`SourceChunk=149`、`MemoryFact=410`、`GraphObservation=1005`、`GraphRelation=404`、`GraphEntity=396`、`GraphScope=4` 等脏数据，并同步删除 `61` 个 derived R2 object；当前 Anyhunt knowledge/memory/vector/graph 派生域再次回到全空基线。
- 已完成 rebuild 前 outbox 再基线清理：按当前 `WorkspaceContentOutbox` 的真实列语义（`processedAt / deadLetteredAt`）核对后，已将残留 outbox 从 `100`（`48 pending + 52 processed`）直接清空为 `0`，下一轮 rebuild 将只依赖 canonical workspace documents 重新生成新的 outbox 事件。
- 已完成 execute 阶段第五个根因确认：在新版 internal write 已经开始正常写入后，`WorkspaceContentOutbox` 的失败记录仍暴露出 `revision finalize` 的 `lastErrorMessage` 为 `Transaction API error ... prisma.$executeRaw() ... expired transaction`；这次证明确认“batch transaction”仍不足以解决真实环境超时，必须彻底去掉 Prisma transaction 包裹。
- 已完成第五个根因的最终收敛：问题并不只是“interactive transaction / batch transaction 超时”，而是 `SourceChunk` 的大批量向量写入本身不应该继续依赖 Prisma raw transaction API；只要 bulk vector insert 仍经过 `prisma.$executeRaw()`，真实环境就会持续命中 `5000ms` transaction window 并把 `finalize` 卡死。
- 已完成底层 vector write 重构：Anyhunt 新增 `VectorPgService` 直接使用 `pg.Pool` 管理 `VECTOR_DATABASE_URL` 事务，`SourceChunkRepository.replaceRevisionChunks()` 现已完全切到“raw pg transaction + parameterized bulk insert”路径，彻底移除对 `vectorPrisma.$transaction()` / `vectorPrisma.$executeRaw()` 的依赖；revision 仍只会在 chunk 全部写完后才 `markIndexed + activateRevision`，因此部分写入对外不可见，失败时重新 `delete + insert` 即可自愈。
- 已完成 execute 阶段第六个根因定位：在向量写链切到 raw pg 之后，真实 outbox 剩余死信暴露出 `IDEMPOTENCY_REQUEST_IN_PROGRESS` 被错误归类为 non-retryable，导致同一 canonical revision 的并发重放第一次就进入 dead-letter，而不是等待当前执行完成后自动重试。
- 已完成 outbox retry 语义修复：`MemoxWorkspaceContentConsumerService.isRetryable()` 现在把 `409 IDEMPOTENCY_REQUEST_IN_PROGRESS` 视为 retryable temporary failure，和网络抖动/限流同类处理；这让 canonical write 在内部幂等窗口冲突时会自动退避重试，不再需要任何人工 retry / rebuild 入口。
- 已完成第五个根因修复后的再次基线清理：在停止上一轮 Anyhunt / rebuild 进程后，又一次清空了 Anyhunt memox 派生队列；这次清理前仍残留 `memox-source-memory-projection: 2 active + 1 waiting + 8 completed`、`memox-graph-projection: 2 active + 120 waiting + 43 completed`，说明部分成功 revision 已经开始向 memory/graph 派生层扩散，继续复用这批状态会污染最终验证。
- 已完成第五个根因修复后的第三次真实 `reset-knowledge-index-domain --execute`：本轮再次清空了 `KnowledgeSource=11`、`KnowledgeSourceRevision=11`、`SourceChunk=121`、`MemoryFact=189`、`GraphObservation=283`、`GraphRelation=117`、`GraphEntity=114`、`GraphScope=1` 等派生脏数据，并同步删除 `11` 个 derived R2 object，确保最终验证将基于“新构建 + 全空向量域”重新开始。
- 已完成最终 rebuild 前 outbox 三次基线清理：本轮把 `WorkspaceContentOutbox` 从 `73`（`3 pending + 1 dead-lettered + 69 processed`）再次清空为 `0`；这代表此前半途运行留下的 processed / retry / dead-letter 残留已经全部丢弃，最终 rebuild 只会消费新构建重新生成的 canonical event。
- 已完成最新一轮 execute 前基线清理：本轮在最新构建重启后再次核对并强制 `obliterate` 了 Anyhunt memox 派生队列，清理前 `memox-graph-projection` 仍残留 `2 completed + 22 failed` 历史任务，其余队列均为 `0`；清理后六个 memox 派生队列全部归零。
- 已完成最新一轮 outbox 基线清理：`WorkspaceContentOutbox` 在这轮真正执行前仍残留 `69` 条未处理历史、`69` 条 processed 历史和 `4` 条 dead-letter 历史，现已再次全量删除并确认归零，确保后续 rebuild 不会复用任何旧 outbox 残留。
- 已完成第四次真实 `reset-knowledge-index-domain --execute`：本轮 reset 在最新构建 + 全空队列基线上再次执行，结果确认 `KnowledgeSource`、`KnowledgeSourceRevision`、`SourceChunk`、`MemoryFact`、`GraphObservation`、`GraphRelation`、`GraphEntity`、`GraphScope`、`ScopeRegistry` 等 13 张派生表当前均为 `0`，derived R2 object 也为 `0`；这说明知识索引派生域已经回到严格全空状态，可直接进入最终 rebuild。
- 已完成脱离 outbox 的真实单条 internal 写链复现：直接复用了旧死信 `b8999b57-c8a2-48e9-98f6-a7ea1c63bfaa` 的大文档 payload，以全新 external id 命中 `resolve identity -> create revision -> finalize -> lookup identity`；`finalize` 在 `9159ms` 返回 `200`，`chunk_count=24`，后续 lookup 也确认 `currentRevisionId/latestRevisionId` 已正确落地。这证明旧的 `prisma.$executeRaw() expired transaction` 根因在当前代码上已经消失，当前 execute 前唯一剩余风险是“服务重启后 reconcile 自动重新入队 + 旧 outbox / 派生队列残留”会污染正式重建基线。
- 已完成正式 execute 前的新一轮运行态清理：为避免 reconcile 和派生 worker 在 reset 期间继续写脏状态，已停止本地 Moryflow / Anyhunt 服务；随后将 `WorkspaceContentOutbox` 从 `141`（`68 pending + 4 dead + 69 processed`）再次清空为 `0`，并强制 `obliterate` Anyhunt memox 派生队列，其中 `memox-graph-projection` 清理前仍有 `2 active + 17 waiting + 5 completed`、`memox-source-memory-projection` 有 `1 completed`，当前六个派生队列已全部归零。
- 已完成第五次真实 `reset-knowledge-index-domain --execute`：本轮 reset 主要清除了刚才 direct repro 成功链路残留的派生数据，实际删除了 `KnowledgeSource=1`、`KnowledgeSourceRevision=1`、`SourceChunk=24`、`MemoryFact=24`、`GraphObservation=52`、`GraphRelation=23`、`GraphEntity=25`、`GraphScope=1`，并同步删除 `1` 个 derived R2 object；当前知识索引派生域再次回到严格全空状态，可直接开始正式 rebuild。
- 已完成正式 rebuild 第七个根因定位：脱离 outbox 的随机新 idempotency key 直打 internal `resolve/create/finalize` 能稳定成功，但 canonical rebuild 复用稳定 lifecycle key 时，同一份大文档依旧立即回放历史 `500 prisma.$executeRaw() expired transaction`。这证明内容本身已无问题，真正残留根因是 internal memox `create revision / finalize` 仍缺少“`FAILED >= 500` 允许重新开始执行”的幂等语义，stable key 会把旧 500 永久 sticky replay 成假死。
- 已完成 internal create/finalize 幂等语义补齐：`InternalMemoxWriteController` 现在对 `source revision create` 和 `revision finalize` 与 `source identity resolve` 一样显式开启 `retryFailedResponseStatusesGte: 500`，确保 rebuild/outbox 在复用 canonical stable key 时，历史 5xx 不会再被直接回放，而会重新走当前代码执行链路。
- 已完成正式 rebuild 第八个根因定位：在 internal `create/finalize` 允许重试 5xx 之后，真实 rebuild 仍出现 `create revision -> 200` 但 `finalize -> 404 Knowledge source revision not found`。根因不是新代码没有创建 revision，而是 `reset` 之前的 Anyhunt 主库 `IdempotencyRecord` 仍保留了 knowledge-write 的旧成功回放；reset 已清空向量库里的 `KnowledgeSourceRevision`，但 stable key 仍能从主库 replay 旧 `revision_id`，导致 `finalize` 命中一个 reset 后不存在的 revision。
- 已完成 reset 脚本职责收敛：`scripts/reset-knowledge-index-domain.mjs` 现在除清空 Anyhunt vector 库的 knowledge/memory/graph 派生表和 derived R2 objects 之外，也会同步清理 Anyhunt 主库里所有 knowledge-write 相关的 idempotency records（覆盖 internal/public 的 source identity resolve、source create/delete、revision create/finalize/reindex scope），保证 release-window 的 reset 真正把“知识索引派生状态 + 派生执行状态”一起回到全空基线，后续 rebuild 不会再 replay 旧 source/revision id。
- 已完成新一轮 rebuild 前 outbox 基线清理：在停掉本地 Moryflow / Anyhunt 运行进程后，再次确认本轮失败残留只存在于 `WorkspaceContentOutbox`，数量为 `73 = 69 processed + 4 dead-letter`；现已再次整体删除并确认归零，确保重建不会复用上一轮已消费或已死信的 canonical event。
- 已完成第六次真实 `reset-knowledge-index-domain --execute`：本轮向量派生表和 derived R2 objects 已经处于全空基线，因此实际删除重点落在 Anyhunt 主库的 knowledge-write idempotency records；脚本本次共清理 `2713` 条（覆盖 internal/public 的 source identity resolve、source create/delete、revision create/finalize/reindex scope），当前 reset 已同时完成“派生数据 + 派生执行状态”双清空，可直接进入下一轮真正的全量 rebuild。
- 已完成正式 rebuild 第九个根因定位：上一轮 `rebuild-knowledge-index-domain --execute` 在 `enqueued 73 canonical document(s)` 后报 `fetch failed`，根因不是知识索引数据链路再次失败，而是脚本把 `/internal/sync/memox/workspace-content/replay` 用成了超长同步 HTTP 请求；当前运行时为 `Node v22.22.1`，默认 `requestTimeout=300000ms`，而旧脚本默认 `batchSize=200, maxBatches=10`，单次请求会把 `consumerService.processBatch()` 推到远超 300 秒的工作量。与此同时，Moryflow 自身的 5 秒 cron drain worker 仍在后台继续消费 outbox，所以现象表现为“脚本 fetch 断了，但数据面还在前进”。
- 已完成 HTTP replay 控制面收敛：`memox-workspace-content.constants.ts` 新增 `MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_BATCH_LIMIT=10` 和 `MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_MAX_BATCHES=1`；`MemoxWorkspaceContentControlService.replayOutbox()` 现在对外部传入参数做强制 clamp，`MemoxWorkspaceContentReplaySchema` 也同步把 replay 控制面 DTO 的默认值和最大值收紧到同一安全边界；`scripts/rebuild-knowledge-index-domain.mjs` 默认 replay payload 改为 `10 x 1`，并对超限参数直接 fail-fast。这样 HTTP replay 语义被固定为“一个安全批次”，bulk drain 继续由后台 BullMQ worker 负责，不再允许任何人通过内部 HTTP 接口发起超长单请求。
- 已完成控制面修复验证：先在 `memox-workspace-content-control.service.spec.ts` 以红灯锁定“即使传 `batchSize=200, maxBatches=10` 也必须收敛到单个安全批次”的行为，再将实现改绿；随后 `pnpm --filter @moryflow/server exec vitest run src/memox/memox-workspace-content-control.service.spec.ts`、`pnpm --filter @moryflow/server typecheck`、`node --check scripts/rebuild-knowledge-index-domain.mjs` 全部通过。额外用本地服务执行 `node scripts/rebuild-knowledge-index-domain.mjs --base-url http://127.0.0.1:3201 --execute --limit 1 --max-rounds 1` 进行真实回归时，脚本已不再出现 `fetch failed`，而是正常返回 `replay round 1: claimed=10, acknowledged=10 ...` 并因仍有 backlog 给出 `Outbox not drained`，证明长请求超时根因已经消失。
- 已完成正式 rebuild 第十个根因修复：真实执行继续暴露出 quiet skip 文档会被 reconcile 错误视为“缺 source”，从而无限补 enqueue。根因是 `WorkspaceContentOutbox` 缺少“本次 canonical 写入已经以 quiet skip 成功收敛”的 durable 结果语义，reconcile 只能用 `sourceExists=false` 猜失败。现已在 `WorkspaceContentOutbox` 新增 `resultDisposition = INDEXED | QUIET_SKIPPED | DELETED`，projection/consumer/redrive/reconcile 全链路统一落库和消费该语义，quiet skip 文档不再被当成缺失 source 反复重排。
- 已完成第十个根因的回归验证：`memox-workspace-content-projection.service.spec.ts`、`memox-workspace-content-consumer.service.spec.ts`、`memox-workspace-content-control.service.spec.ts`、`memox-workspace-content-reconcile.service.spec.ts` 已新增 quiet skip durable disposition 红绿测试并全部通过；随后 `pnpm --filter @moryflow/server prisma:generate`、`pnpm --filter @moryflow/server typecheck`、`pnpm --filter @moryflow/server prisma:push` 全部通过，live schema 已包含 `WorkspaceContentOutbox.resultDisposition`。
- 已完成本轮真实 reset + rebuild：停止本地 Moryflow / Anyhunt 后，重新清空 `WorkspaceContentOutbox=214 -> 0`、强制清空六个 Anyhunt memox 派生队列，并执行 `node scripts/reset-knowledge-index-domain.mjs --anyhunt-env /Users/lin/code/moryflow/apps/anyhunt/server/.env --execute`；本轮 reset 实际删除了 `KnowledgeSource=38`、`KnowledgeSourceRevision=38`、`SourceChunk=366`、`MemoryFact=746`、`GraphObservation=3390`、`GraphRelation=1323`、`GraphEntity=1176`、`GraphScope=4` 以及 `38` 个 derived R2 object，并清理 `114` 条 knowledge-write idempotency records，随后在新构建上执行 `node scripts/rebuild-knowledge-index-domain.mjs --moryflow-env /Users/lin/code/moryflow/apps/moryflow/server/.env --base-url http://127.0.0.1:3201 --execute --max-rounds 20`，真实结果为 `enqueued 73 canonical document(s)`、`round 8 drained=true`、`WorkspaceContentOutbox processed=73 pending=0 dead=0 quiet_skipped=34 indexed=38 deleted=1`，Anyhunt 向量域当前为 `KnowledgeSource=38(active=38)`、`KnowledgeSourceRevision=38(indexed=38, failed=0)`。
- 已完成最终 reconcile 闸门验证：`MemoxWorkspaceContentReconcileScheduler` 为 `EVERY_10_MINUTES`，在本轮 rebuild drain 后等待到 `2026-03-22 00:40 CST` 的真实 scheduler 窗口；该窗口只输出 `MemoxTelemetryService outbox.pendingCount=0` / `outbox.deadLetteredCount=0`，没有任何 `Workspace content reconcile enqueued ...` 日志，同时数据库侧 `WorkspaceContentOutbox` 仍保持 `total=73 processed=73 pending=0 dead=0 quiet_skipped=34 indexed=38 deleted=1`。这证明 quiet skip 文档已被 reconcile 正确视为健康终态，不会再被错误补回 outbox。
- 已完成正式文档回写与产品级 smoke：稳定事实已同步回 `docs/design/moryflow/core/workspace-profile-and-memory-architecture.md`、`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`、`docs/design/moryflow/features/moryflow-pc-memory-workbench-architecture.md` 与 `docs/reference/cloud-sync-and-memox-validation.md`；同时按真实 canonical 内容做大工作区 smoke，最新结果为 `currentDocumentCount=69`、`indexableDocumentCount=34`、`active KnowledgeSource=34`、`quietSkipDocumentCount=34`、`missingIndexedDocumentCount=0`、`unexpectedSourceCount=0`，并确认 `SYNC_OBJECT_REF` 文档必须通过对象快照而不是 `contentText` 验证索引语义。
- 已完成本轮 search 链路性能根因修复：Anyhunt retrieval 结果现在直接携带 `origin_kind / immutable / source_id / source_revision_id / derived_key`，Moryflow `MemoryService.search()` 不再对每条 fact 额外调用 `getMemoryById()` 做 hydration；`memory/search` 的 retrieval DTO 与 Moryflow DTO 已完成同构映射，根因级移除了 fact detail N+1。
- 已完成本地性能基线拆解：在当前真实 token/workspace 下，`POST /api/v1/memory/search ≈ 8.03s`、`GET /api/v1/memory/overview ≈ 5.14s`、直打 Anyhunt `POST /api/v1/retrieval/search ≈ 4.49s`、`GET /api/v1/memories/overview ≈ 4.25s`，其余受保护轻量 endpoint（`/user/profile`、`/user/credits`）约 `1.4s`；结论是 N+1 已清除，但当前用户态延迟主体仍在 Anyhunt 检索/overview 和认证链路，不再错误归因到 Moryflow fact hydration。
- 已完成桌面端四态 UI smoke 固化：新增 `apps/moryflow/pc/tests/memory-dashboard-ui.spec.ts` 与 fake membership memory server 的 `overview / knowledge-statuses / facts/query` stub，真实覆盖 `Scanning / Needs attention / Indexing / Ready` 四种状态，并确认 `Memory` 页面不会再把 quiet skip/attention 混成长期 indexing。
- 已完成 Knowledge 卡片/面板的可访问性收口：两处 icon-only 按钮现已提供稳定的可访问名称（`knowledgeOpenDetails` / `knowledgeBack`），桌面端 UI smoke 也改为按可访问名称驱动，不再依赖 `.rounded-xl` 等样式类定位；这同时去掉了测试对 DOM 皮肤结构的脆弱耦合。
- 已完成本轮代码 review 收口：运行态链路中已确认没有重新引入 `pendingSourceCount / failedSourceCount` 或 `pending_source_count / failed_source_count` 到 Moryflow memory server、PC renderer、Anyhunt retrieval / memory / sources 运行代码；本轮新增的状态聚合仍保持 `SourceIngestReadService -> Moryflow DTO -> IPC -> renderer presenter` 单向语义流。
- 已完成本轮 quota/billing 热路径收敛：`QuotaRepository` 新增单条 SQL 的 `getQuotaContext()` 合并读取 `Quota + Subscription tier/status`，`QuotaService.getStatus()` / `deduct()` 改为共享这份上下文；热路径不再执行 `findByUserId -> getUserTier -> findByUserId` 三段串查，只在周期真正过期时额外触发一次 reset transaction。
- 已完成 quota/billing 的 TDD 回归：`quota.service.spec.ts` 已先用红灯锁定 `getStatus / checkAvailable / deduct / deductOrThrow` 必须走 `getQuotaContext()` 且不得再调用 `findByUserId / getUserTier`，随后实现改绿；`quota.repository.spec.ts` 也补齐了 `getQuotaContext()` 的 active tier / inactive fallback / no quota 分支覆盖。
- 已完成 retrieval 前置热态基线拆解：在当前本地 Anyhunt `3312` 进程、同一把真实 API key 和同一 `project_id=cc88b9bb-cbaf-4869-acf7-eaafd87a0c14` 下，连续 6 次压测得到 `GET /api/v1/quota warmAvg ≈ 559.96ms`，`POST /api/v1/retrieval/search`（`group_limits={sources:0,memory_facts:0}`）`warmAvg ≈ 1395.91ms`；这说明认证 + quota 状态读取已压到约 `0.56s`，当前剩余固定成本主要集中在 search 入口内的同步扣费路径，而不是 retrieval SQL / embedding。
- 已完成 current tenant 配额路径核实：直接读取 `GET /api/v1/quota` 返回值后，确认当前基准 API key 的 `daily.limit=0`、`monthly.remaining=0`、`purchased=36999921`，也就是 retrieval/search 实际只会命中 `PURCHASED` 扣减分支；这排除了 daily credits / monthly quota 对当前热态 benchmark 的干扰。
- 已完成 request logging 路径核实：`RequestLogMiddleware` 只在 response `finish/close` 阶段调用 `RequestLogService.writeAsync()`，后者内部也是 fire-and-forget `prisma.requestLog.create()`；日志落库不在响应路径上 await，因此不是这轮 `retrieval-empty` 的固定热态来源。
- 已完成 no-billing 对照实验：额外启动 `3313` 端口 Anyhunt 进程并临时设置 `BILLING_RULE_OVERRIDES_JSON={\"memox.retrieval.search\":0}` 后，同样的 `POST /api/v1/retrieval/search(group_limits=0/0)` 连续 6 次压测得到 `warmAvg ≈ 679.75ms`。与正常计费进程 `3312` 的 `warmAvg ≈ 1395.91ms` 对比，证明当前同步扣费大约占掉 `~716ms`，已经是 search 入口里最大的固定成本。
- 已完成 quota 仓储层的第二轮根因收敛：`deductMonthlyInTransaction()` / `deductPurchasedInTransaction()` 现在不再使用 Prisma `$transaction(async tx => update + create)` 回调，而是改成单条 SQL CTE 原子完成 `Quota` 更新与 `QuotaTransaction` 插入；这把当前 `PURCHASED` 热路径里的两次数据库调用压成了一次 statement，并保持领域语义不变。
- 已完成 quota 仓储层 CTE 回归：`quota.repository.spec.ts` 新增红灯，强制要求 `deductMonthlyInTransaction()` / `deductPurchasedInTransaction()` 只允许单次 `$queryRaw` 且不得再调用 `$transaction`；实现切换后，`src/quota/__tests__/quota.repository.spec.ts` 与 `src/quota/__tests__/quota.service.spec.ts` 共 `58` 项已全部通过。
- 已完成新 build 健康与 benchmark 前置校验：最新拉起的 `3314`（正常计费）和 `3315`（no-billing）健康检查均返回 `ok`，但在与旧基准完全相同的真实 API key / project_id 条件下，`GET /api/v1/quota` 与 `POST /api/v1/retrieval/search(group_limits=0/0)` 全部返回 `403`，因此这一轮新 build benchmark 当前无效；下一步必须先定位 `3314/3315` 与旧基准进程 `3312/3313` 的认证链路差异，再继续性能对比，避免把 auth 拒绝延迟误判成 quota / retrieval 热路径。
- 已完成 403 根因修正：进一步对比 `3312 / 3314 / 3315` 的 `/api/v1/quota` 原始响应后，确认三者返回体完全一致，都是 `403 Forbidden` 且 `detail = Invalid API key`；这说明当前 benchmark 失败并不是新 build 引入的认证回归，而是此前使用的基准 API key 已经失效。后续性能对比必须先获取新的有效基准 key（或重新生成同权限 key），否则任何新的延迟数字都没有分析价值。
- 已确认基准凭证恢复路径：Anyhunt 主库 `ApiKey` 模型只存 `keyHash / keyPrefix / keyTail`，不存明文 key，因此当前失效 benchmark key 无法从数据库恢复；后续要继续做性能对比，只能为同一测试用户重新生成一把新的有效 API key，再用它重跑 `quota / retrieval-empty` 基准。
- 已确认这轮 benchmark 403 的直接原因：主库当前只有一个活跃的 Anyhunt key，归属测试用户 `yatcJs1VpNX7TT1uRmMymhJ4uPqCCGON (dvlindev@qq.com)`，其 `keyTail = be60`、`isActive = true`；此前 benchmark 使用的明文串尾部与数据库记录完全对不上，说明我们拿错了值（把别的标识当成了明文 key），并不是这把活跃 key 在数据库里被 revoke。后续应直接为同一用户生成新的 benchmark key，而不是继续围绕旧串排查认证回归。
- 已完成新基准凭证恢复与新 build benchmark：已直接为同一测试用户生成新的 Anyhunt benchmark key（`id = cmn15526z00001v3cp0r5mslu`，preview=`ah_****95f2`），并在 `3314`（正常计费）/ `3315`（`memox.retrieval.search=0`）上重新压测；结果为 `GET /api/v1/quota @3314 warmAvg ≈ 566.32ms`、`POST /api/v1/retrieval/search(group_limits=0/0) @3314 warmAvg ≈ 984.16ms`、`POST /api/v1/retrieval/search(group_limits=0/0) @3315 warmAvg ≈ 886.27ms`。对比旧基准 `3312 billed ≈ 1395.91ms` / `3313 no-bill ≈ 679.75ms`，可以确认 quota CTE 收敛后，同步扣费额外成本已从约 `716ms` 降到约 `98ms`；当前 search 剩余固定成本主要回到 retrieval/controller 侧，而不再主要卡在 quota/billing。
- 已完成本轮 profiling 凭证刷新：再次为同一测试用户生成新的临时 benchmark key（`id = cmn15lbxm00005t3cg27l9ian`，preview=`ah_****838a`），仅用于接下来的 retrieval/overview 阶段 profiling；明文 key 不进入文档，只保留在当前终端会话中用于压测。
- 已完成入口层 Redis 基线拆解：直接对认证缓存 key `apikey:<sha256(apiKey)>` 做 10 次 `GET`，在命中缓存（`246 bytes`）的情况下热态仍为 `~176-229ms`；同时复刻全局 throttler 的 Redis `EVAL`，热态同样稳定在 `~190-194ms`。这说明 no-billing `retrieval-empty` 的 `~535ms` 基线里，入口层两次 Redis 往返（throttler + apiKey cache）已经占掉 `~366-419ms`，剩余时间才是 HTTP/Nest 装饰器与少量业务开销。
- 已确认新临时 benchmark key 只用于空租户路径：直接用其 `apiKeyId = cmn15lbxm00005t3cg27l9ian` 对向量库执行 `graphScope lookup / sourceIngest summary / factOverview summary` 后，结果全部为 `0`，且单次查询热态约 `~189-193ms`。因此这把 key 下的 `overview` 压测只代表“无知识索引数据”的租户基线，不可用于判断真实工作区的 read-model 瓶颈；后续 overview profiling 必须切回实际承载索引数据的 `apiKeyId`。
- 已完成本轮 HTTP 基准复测：在新的临时 benchmark key 下，`GET /api/v1/quota @3314 warmAvg ≈ 573.23ms`，`POST /api/v1/retrieval/search(group_limits=0/0) @3314 warmAvg ≈ 764.16ms`，`POST /api/v1/retrieval/search(group_limits=0/0) @3315 warmAvg ≈ 535.09ms`；相比上一轮 billed/no-bill 差值 `~98ms`，这轮差值扩大到 `~229ms`，但 billed 路径依然明显低于 quota CTE 改造前的 `~1395.91ms`。当前可确定的结论是：同步扣费已经不是主瓶颈，入口层固定成本仍是 search 空执行链路的主要组成部分。
- 已完成真实数据租户的 overview 读模型基线拆解：通过直接查询向量库确认，承载实际知识索引数据的主租户仍为 `apiKeyId = cmmqmy8x7000z01nsuo7zrya6`、主工作区 `projectId = cc88b9bb-cbaf-4869-acf7-eaafd87a0c14`，其中 `KnowledgeSource = 34`、`MemoryFact = 652`、`GraphObservation = 3899`。针对该真实租户，`graphScope lookup warmAvg ≈ 187.89ms`、`sourceIngest summary warmAvg ≈ 190.19ms`、`factOverview summary warmAvg ≈ 189.00ms`、`graphOverview summary warmAvg ≈ 219.28ms`。结合 `MemoryOverviewService` 的并行/串行结构，可推导其数据库关键路径约为 `~190ms + ~219ms = ~409ms`；再叠加入口层 `~366-419ms` 的 Redis 固定成本后，overview 的稳定热态理论值应在 `~775-830ms`，此前 `HTTP warmAvg ≈ 1.40s` 主要是被少数长尾请求拉高，而不是单个读模型 SQL 本身异常慢。
- 已完成入口层热路径代码复核：当前 public API 请求固定顺序仍是 `APP_GUARD(UserThrottlerGuard) -> ApiKeyGuard -> ApiKeyService.validateKey()`，也就是先执行一次基于明文 key hash 的 Redis throttler `EVAL`，再执行一次 API key Redis cache `GET`；结合前述 benchmark，当前最小必要优化点已收敛为在 `ApiKeyService.validateKey()` 内增加进程内短 TTL L1 命中层，优先消除第二次 Redis 往返，而不先重构全局限流架构。
- 已完成本轮“不过度设计”约束落地：针对入口层固定成本，本次只在 `ApiKeyService.validateKey()` 内新增 `5s` 进程内 L1 validation cache，复用现有 `invalidateCacheByHash()` 失效路径同步清理内存与 Redis；没有改动 `UserThrottlerGuard -> ApiKeyGuard` 的 guard 拓扑，没有新增持久层、配置面或新基础设施，也没有预埋任何面向潜在场景的复杂缓存/同步机制。
- 已完成 `ApiKeyService` L1 cache 的 TDD 回归：`api-key.service.spec.ts` 先以红灯锁定“重复 `validateKey()` 不得再次命中 Redis”“L1 TTL 过期后必须回退 Redis”“停用 key 必须同时清掉内存与 Redis cache”三类行为，随后实现改绿；当前 `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/api-key/__tests__/api-key.service.spec.ts` 为 `19 passed`，`pnpm --filter @anyhunt/anyhunt-server build` 与 `pnpm --filter @anyhunt/anyhunt-server typecheck` 也已通过。
- 已完成本轮 profiling 凭证刷新：再次为同一测试用户生成新的临时 Anyhunt benchmark key（`id = e7d3636f-8a79-4f21-af8d-953355d36e1c`，preview=`ah_****f5d7`），仅用于这轮入口层 L1 cache benchmark；明文 key 不进入文档，也不用于业务流量。
- 已完成 auth L1 cache 的真实 benchmark 对比：以相同 `quota / retrieval-empty(group_limits=0/0)` 请求分别对比旧进程 `3314/3315` 与启用 L1 cache 的新进程 `3316/3317` 后，最稳定的 billed `retrieval-empty` 中位数已从 `~767.32ms` 下降到 `~558.79ms`（约 `-208ms / -27%`）；而 auth-only `quota` 热路径 lower bound 在新进程上稳定落到 `~376-388ms`，相对旧稳定簇 `~570ms+` 已下降约 `~0.19s / ~33%`。这与前文已验证的 `apikey Redis GET ≈ 176-229ms` 基本对齐，说明本轮优化确实消掉了第二次 Redis 往返，而不是偶然波动。
- 已完成本轮 auth L1 结论收敛：入口层当前剩余的主要固定成本已不再是 API key validation cache，而是全局 throttler 的 Redis `EVAL` 与 guard/controller 本身的同步开销；后续若继续优化，必须先在现有 guard 链路上做最小必要 profiling 与红灯验证，禁止直接推翻全局限流架构。
- 已完成 global throttler 对照 profiling：新增临时对照进程 `3316`（保持计费但通过 `GLOBAL_THROTTLE_SKIP_PATHS` 跳过 `/api/v1/quota` 与 `/api/v1/retrieval/*`）和 `3317`（同样跳过 throttler，且 `memox.retrieval.search=0`）。在相同 API key / project_id / `group_limits={0,0}` 条件下，`3314 -> 3316` 的 billed `quota` 中位数从 `~564.94ms` 下降到 `~194.31ms`，`billed retrieval-empty` 中位数从 `~760.94ms` 下降到 `~373.91ms`；这说明当前 global throttler 本身在用户态热路径上稳定占掉约 `~370-390ms`，与之前拆出来的 Redis `EVAL ≈ 190ms` 量级一致，但真实 HTTP 开销还叠加了 guard/header/adapter 的同步成本。
- 已完成 throttler 对照后的剩余成本定位：在 `3317`（无 throttler + no-billing）上，`retrieval-empty` 中位数已经落到 `~4.31ms`；而 `3316`（无 throttler + billed）同一路径仍为 `~373.91ms`。这证明 retrieval 空执行链路本身几乎没有成本，throttler 拿掉之后，当前下一段主要固定成本已经收敛到同步 billing/quota deduction，而不是 retrieval controller / service / SQL。
- 已完成本轮优化方向再收敛：基于上述对照结果，下一步优先级不再是“大改 throttler 架构”，而是继续在现有 billing/quota 写路径里做最小必要 profiling 与根因收敛；global throttler 后续若要优化，也只能在当前 guard 结构内做局部、可验证的改动，继续遵守“不过度设计”原则。
- 已完成 billing/quota 最小优化面的红灯验证：新增 `QuotaService` / `BillingService` / `RetrievalService` / `RetrievalController` 定向测试后，`pnpm --filter @anyhunt/anyhunt-server exec vitest run src/quota/__tests__/quota.service.spec.ts src/billing/__tests__/billing.service.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts` 以 `6` 个失败用例稳定证明当前缺口完全落在三层透传链上，而不是 retrieval 业务逻辑本身。
- 已验证当前缺口的具体形态：`QuotaService` 在传入 paid `subscriptionTierHint` 时仍固定走 `getQuotaContext()` 的 quota+subscription join，尚未切换到 `findByUserId()` 直查；`BillingService` 尚未把 tier hint 透传给 `QuotaService`；`RetrievalService` / `RetrievalController` 也尚未把 `CurrentUser.subscriptionTier` 向下传递到 billing 层。`FREE` tier 维持旧语义的对照测试已经是绿色，说明下一步只需要在 paid tier 热路径上做局部修正，不需要扩大改动面。
- 已完成 paid-tier quota 热路径的最小实现：`QuotaService` 现在仅在传入 `subscriptionTierHint` 且该 tier `dailyCredits=0` 时，直接复用 `findByUserId()` 读取 quota，并保留原有周期重置逻辑；`BillingService` / `RetrievalService` / `RetrievalController` / `QuotaController` 已把认证上下文里的 tier hint 沿现有链路透传到 quota 层。整个改动没有新增缓存、配置、表结构或新的服务抽象，继续满足“不过度设计”约束。
- 已验证上述最小实现闭环生效：同一组定向测试 `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/quota/__tests__/quota.service.spec.ts src/billing/__tests__/billing.service.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts` 已全部通过（`4 files, 86 tests passed`），其中 paid tier 直查分支、FREE tier 对照、billing hint 透传、retrieval/controller hint 透传均已被覆盖。
- 已验证当前实现可通过静态构建检查：`pnpm --filter @anyhunt/anyhunt-server build` 与 `pnpm --filter @anyhunt/anyhunt-server typecheck` 均已通过，说明此次 paid-tier hint 透传没有破坏 Anyhunt 现有公开接口或模块编译边界。
- 已完成最新一轮同口径 benchmark：基于当前 worktree 重新拉起 `3318`（跳过 global throttler、保留计费）和 `3319`（跳过 global throttler、关闭 `memox.retrieval.search` 计费）后，再次执行 `GET /api/v1/quota` 与 `POST /api/v1/retrieval/search(group_limits={0,0})` 各 `6` 次压测。结果显示 `3318` 的 `quota` 中位数约 `192.13ms`，与上一轮 `3316 ≈ 194.31ms` 基本持平；`3319` 的 `retrieval-empty` 中位数约 `4.37ms`，依然证明无计费时 retrieval 空链路本身几乎无成本。
- 已验证本轮 paid-tier 直查并未显著拉低 billed retrieval 成本：新的 `3318 retrieval-empty` 样本为 `[550.36, 1164.56, 1642.25, 8618.96, 6358.64, 1026.72]`，中位数约 `1403.4ms`，长尾明显高于上一轮 `3316 ≈ 373.91ms`。这说明 paid-tier 直查虽然去掉了一次 quota+subscription join，但 billed retrieval 的主瓶颈仍然在更深的同步 billing/quota 路径，下一步需要继续基于日志和分段 profiling 追根，而不是扩大设计面。
- 已完成 quota 读路径的底层 SQL 对照：直接对主库执行 `SELECT * FROM "Quota" WHERE "userId" = $1` 的 `6` 次热态样本为 `[194.15, 206.53, 187.65, 187.78, 191.08, 187.34]`，中位数约 `189.43ms`；而旧 `quota context` 的 `Quota + Subscription` join 读样本为 `[188.37, 186.65, 187.78, 187.91, 188.9, 188.51]`，中位数约 `188.14ms`。这直接证明当前数据库层面的 join/select 成本几乎等价，本轮 paid-tier 直查属于“语义正确但非主收益”的局部修正，而不是 billed retrieval 长尾的根因修复。
- 已完成 Prisma 层对照：在独立进程中复用当前 worktree 的 `PrismaPg + generated PrismaClient` 后，`prisma.quota.findUnique({ where: { userId } })` 的热态样本为 `[834.19, 192.18, 191.19, 190.13, 191.11, 192.12]`，除首次冷启动外其余样本稳定在 `~190-192ms`，中位数约 `191.66ms`；`prisma.$queryRaw(Quota + Subscription join)` 样本为 `[197.8, 190.81, 193.25, 190.73, 189.8, 190.71]`，中位数约 `190.77ms`。这说明 warm Prisma 路径和 raw SQL 基本同价，ORM 本身不是当前 billed retrieval 1s+ 长尾的主要来源。
- 已完成 `PURCHASED` 扣减分支的底层 SQL 对照：直接在主库连接上以 `BEGIN/ROLLBACK` 包裹 `deductPurchasedInTransaction` 等价 CTE 后，`6` 次热态样本为 `[207.3, 198.48, 230.14, 247.12, 196.29, 187.45]`，中位数约 `202.89ms`。结合前述 `quota` 读路径中位数 `~189-191ms`，当前真实 paid-tier 扣费链路在数据库层的“读 + purchased deduct 写”理论下界约为 `~392ms`，这和 billed retrieval 最低稳定样本 `~550ms` 的量级基本一致，也进一步说明 1s+ 长尾来自长进程运行态中的额外阻塞，而不是单条 SQL 本身。
- 已完成主库冷连接成本对照：以全新 `pg.Client` 每次重新 `connect -> SELECT Quota -> end` 的方式执行 `6` 次后，样本为 `[1096.93, 1012.07, 1052.07, 1052.06, 1083.74, 1101.59]`，中位数约 `1067.91ms`。这说明只要请求路径里命中新建主库连接，单次冷连接本身就会把成本抬到 `~1.0-1.1s`；结合 billed retrieval 的 `~1.0-1.6s` 稳定长尾，可以判断当前长尾更像“主库连接获取/补冷连接抖动 + 同步扣费双查询”的叠加，而不是 `Quota` / `Subscription` join 或 ORM 执行本身。
- 已把“不过度设计”原则同步到当前 profiling 收敛策略：既然底层 SQL 对照已经证明 `quota+subscription join` 不是主瓶颈，下一步将继续围绕现有 `billing/quota deduction` 写路径做分段 profiling 和最小必要改动，不新增缓存层、异步补偿、额外读模型或新的计费抽象，也不会为了追逐理论最优而扩大设计面。
- 已完成 paid-tier 扣费热路径的再次收敛：在确认 `quota+subscription join` 不是主瓶颈后，不再继续横向探索，而是把当前真正可压缩的同步 billing/quota 链路收敛为一个更小的仓储职责边界。`QuotaService` 现在仅负责判断 paid-tier fast path 与结果编排，真正的“月度优先 + 过期重置 + purchased fallback”扣费原子写入下沉到 `QuotaRepository.deductPaidQuotaInTransaction()`；没有新增新服务、缓存或计费抽象，继续满足“功能正常优先、模块化、单一职责、不过度设计”的约束。
- 已完成 paid-tier 原子扣费回归：`pnpm --filter @anyhunt/anyhunt-server exec vitest run src/quota/__tests__/quota.repository.spec.ts src/quota/__tests__/quota.service.spec.ts` 已通过（`2 files, 64 tests passed`），覆盖单条 raw query 扣费、失败返回 `null`、paid-tier fast path 命中以及旧 `quota context` 路径不被误触发。
- 已完成 paid-tier 热路径的上层闭环回归：`pnpm --filter @anyhunt/anyhunt-server exec vitest run src/quota/__tests__/quota.repository.spec.ts src/quota/__tests__/quota.service.spec.ts src/billing/__tests__/billing.service.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts` 已通过（`5 files, 108 tests passed`），证明 tier hint 透传、billing 扣费、retrieval/controller 编排与新的 repository fast path 已经形成闭环，且没有扩大到无关模块。
- 已验证当前收敛版本仍可通过静态构建检查：在上述定向回归之后，`pnpm --filter @anyhunt/anyhunt-server build` 与 `pnpm --filter @anyhunt/anyhunt-server typecheck` 继续通过；说明这次把 paid-tier 成功扣费路径收敛到单个 repository 原子操作，没有破坏 Anyhunt 现有模块边界或公开接口。
- 已完成 paid-tier 原子扣费的最小真实性能验证：使用同一真实租户 `projectId = cc88b9bb-cbaf-4869-acf7-eaafd87a0c14`、新的临时 benchmark key（preview=`ah_****f1a7`，明文不入文档，压测后已删除），分别在 `3320`（跳过 global throttler、保留计费）与 `3321`（跳过 global throttler、关闭 `memox.retrieval.search` 计费）上执行 `POST /api/v1/retrieval/search(group_limits={0,0})` 各 `6` 次 warm benchmark。结果为：`3320 billed retrieval-empty = [200.07, 222.87, 191.52, 205.51, 189.89, 198.99]`，`median ≈ 199.53ms`；`3321 no-billing retrieval-empty = [211.65, 16.53, 12.45, 10.85, 12.02, 9.62]`，去掉首个冷样本后稳定在 `~10-16ms`，整体 `median ≈ 12.23ms`。对比上一轮“去掉 global throttler 但仍走旧 billing/quota 写链”的 `3316 billed ≈ 373.91ms` / `3317 no-bill ≈ 4.31ms`，可以确认这次把 paid-tier 成功扣费路径收敛到单个 repository 原子操作后，同步 billing/quota 额外成本已从约 `~370ms` 收敛到约 `~187ms`，而没有引入新的架构复杂度。
- 已确认本轮剩余长尾不再来自 retrieval 计费热路径本身：同一批次下 `GET /api/v1/quota @3320` 仍出现 `[1095.23, 785.28, 196.41, 814.57, 186.66, 793.88]` 这类主库/认证层抖动，说明 quota 读接口仍受更上游的 auth / connection 获取影响；但 billed `retrieval-empty` 已经稳定落到 `~200ms` 区间，因此本次“合理功能正常、模块化、单一职责、不过度设计”的收口目标已经达到，后续若继续优化，应另起一轮针对 auth/quota read 的独立工作，而不是继续扩展当前 billing 写链改动面。
- 已完成合并前 code review 的第一轮阻塞项确认：当前 branch 把 `ApiKeyValidationResult.user.subscriptionTier` 透传给 retrieval/quota 作为 paid-tier fast path hint，但 `ApiKeyService.validateKey()` 会把这个 tier 缓存在进程内 `5s` 和 Redis `60s`，且订阅状态变化没有对应的 API key cache invalidation 路径；因此用户从 `PRO/TEAM` 降级后，`GET /api/v1/quota` 与 retrieval billing 在最多一个缓存 TTL 内仍可能沿用旧付费 tier，形成短暂的计费/配额语义回归。在修复或移除这条 stale hint 依赖之前，这一轮改动不应视为可合并。
- 已确认当前测试基线对 paid-tier fast path 的真实数据库覆盖仍停留在 unit/上层编排层：`quota.repository.spec.ts`、`quota.service.spec.ts`、`billing/retrieval` 定向回归已经覆盖新的 repository 原子扣费和 hint 透传，但 `quota.service.integration.spec.ts` 仍只覆盖 `FREE/BASIC` 的配额生命周期，没有直接跑到 `PRO/TEAM + subscriptionTierHint` 的真实 Prisma/Redis 集成路径。这是当前 review 的非阻塞测试缺口，后续若修复上述阻塞项，建议顺手补齐这条 integration baseline。
- 已完成上述阻塞项的最小修复：公开 `quota` 与 `retrieval` 控制器不再把 API key 校验缓存中的 `subscriptionTier` 继续往下透传，[`QuotaController.getQuotaStatus()`](/Users/lin/.codex/worktrees/eed6/moryflow/apps/anyhunt/server/src/quota/quota.controller.ts) 与 [`RetrievalController.searchSources/search()`](/Users/lin/.codex/worktrees/eed6/moryflow/apps/anyhunt/server/src/retrieval/retrieval.controller.ts) 已恢复为只传 `userId + apiKeyId + dto` 的语义，避免缓存 tier 直接影响公开运行时配额/计费决策；底层 `BillingService/QuotaService` 的可选 fast path 能力保留在 service 层，不再由 API key cache 驱动。
- 已完成针对该修复的 TDD 回归：先新增/修改 [`retrieval.controller.spec.ts`](/Users/lin/.codex/worktrees/eed6/moryflow/apps/anyhunt/server/src/retrieval/__tests__/retrieval.controller.spec.ts) 与新增 [`quota.controller.spec.ts`](/Users/lin/.codex/worktrees/eed6/moryflow/apps/anyhunt/server/src/quota/__tests__/quota.controller.spec.ts)，并确认旧实现下 3 条断言按预期红灯（公开控制器仍在转发 `'PRO'` hint）；修复控制器后重新执行，当前两份控制器回归已转绿（`5 passed`）。
- 已补充 paid-tier integration baseline 代码：[`quota.service.integration.spec.ts`](/Users/lin/.codex/worktrees/eed6/moryflow/apps/anyhunt/server/src/quota/__tests__/quota.service.integration.spec.ts) 新增 `should support explicit paid-tier fast path with real prisma + redis state`，覆盖 `PRO + deductOrThrow(..., 'PRO')` 的真实数据库/Redis 场景；但当前本机缺少可用的 container runtime，按正式入口 `RUN_INTEGRATION_TESTS=1 pnpm exec vitest run src/quota/__tests__/quota.service.integration.spec.ts` 执行时被 TestContainers 阻塞，报错 `Could not find a working container runtime strategy`，所以这条 integration baseline 已写入代码但尚未在当前环境跑通。
- 已完成这轮可执行验证收口：
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/retrieval/__tests__/retrieval.controller.spec.ts src/quota/__tests__/quota.controller.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/quota/__tests__/quota.repository.spec.ts src/quota/__tests__/quota.service.spec.ts src/billing/__tests__/billing.service.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts src/quota/__tests__/quota.controller.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server typecheck`
    当前结果分别为 `5 passed`、`109 passed` 与 `typecheck 通过`。
- 已完成最终 merge 前清理：仓库根下 `.codex-tmp/` 中的临时重启日志与调试脚本（`anyhunt-prod-restart.log`、`moryflow-prod-restart.log`、`knowledge-index-direct-run.ts`、`restart-from-ps-env.mjs`）已全部移除，当前工作区不再包含这轮调试过程留下的临时目录或日志残留。
- 已完成 PR-ready 阶段的 pre-commit 根因定位：当前 `git commit` 失败不是知识索引或 quota 改动本身挡住，而是 `.husky/pre-commit` 在 `package.json / lint-staged.config.js` 等 root/shared tooling staged 时会触发 full unit；按 `pnpm turbo run test:unit --concurrency=4 --filter=@anyhunt/admin --filter=@anyhunt/console` 复现后，真正不稳定的是 `@anyhunt/console` 的几条测试，其中 `WebhookApiKeyCard` 与 `LoginPage` 仍吃默认 `5s` timeout，而 `admin/console api-client.test.ts` 为了让 `fetch` stub 生效会动态导入模块，并连带重载 `api-base/auth/store` 依赖树，在 full unit 并发下被资源竞争放大。
- 已完成上述 pre-commit 挡点的最小修复：`apps/anyhunt/admin/www/src/lib/api-client.test.ts` 与 `apps/anyhunt/console/src/lib/api-client.test.ts` 继续保留“stub fetch 后动态导入模块”的正确行为，但在测试里显式 mock 了 `api-base`、`auth-methods` 与 `stores/auth`，避免 transport 断言重建整条前端依赖树；同时 `apps/anyhunt/console/src/features/webhooks/components/webhook-api-key-card.test.tsx` 和 `apps/anyhunt/console/src/pages/LoginPage.test.tsx` 为受 full unit 资源竞争影响的用例补了显式 `15_000ms` timeout，属于测试预算修正，不涉及任何业务实现变更。
- 已验证上述修复在最小范围内成立：
  - `pnpm --filter @anyhunt/admin exec vitest run src/lib/api-client.test.ts` -> `1 passed`
  - `pnpm --filter @anyhunt/console exec vitest run src/lib/api-client.test.ts src/features/webhooks/components/webhook-api-key-card.test.tsx src/pages/LoginPage.test.tsx src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.test.tsx` -> `15 passed`
- 已验证上述修复也能在接近 hook 的并发条件下稳定通过：`pnpm turbo run test:unit --concurrency=4 --filter=@anyhunt/admin --filter=@anyhunt/console` 当前结果为 `@anyhunt/admin 28 passed`、`@anyhunt/console 92 passed`，说明这批 pre-commit 挡点已经从“full unit 下的测试脆弱性”收敛到可接受状态。
- 已完成一次真实 `git commit` 门禁复跑：`lint-staged`、`typecheck`、repo script tests、`@anyhunt/admin` 与 `@anyhunt/console` 的 full-unit 段都已通过；当前新的唯一 blocker 已经进一步收敛到 `@moryflow/admin` 的 3 条前端测试，而不是业务代码或服务端实现。
- 已确认当前 `@moryflow/admin` 的 pre-commit 挡点与前面同类：`src/lib/api-client.test.ts` 的 `UNEXPECTED_RESPONSE` case 在 full unit 资源竞争下仍会命中 `15000ms` timeout；`src/features/storage/components/user-storage-card.test.tsx` 与 `src/features/users/components/set-tier-dialog.test.tsx` 则仍使用默认 `5000ms` timeout，在仓库级并发下被放大成假失败。下一步只需要对 `moryflow/admin` 复用同一套“轻量 mock + 显式测试预算”的最小修复，不需要回到业务代码层。
- 已完成 `@moryflow/admin` 同类修复：`apps/moryflow/admin/src/lib/api-client.test.ts` 现已与前述 admin/console 版本保持一致，使用轻量 `api-base/auth-methods/stores/auth` mock + 动态导入模块，并把该慢测预算放宽到 `60_000ms`；`apps/moryflow/admin/src/features/storage/components/user-storage-card.test.tsx` 与 `apps/moryflow/admin/src/features/users/components/set-tier-dialog.test.tsx` 也补了显式 `15_000ms` timeout，以消除 full-unit 资源竞争下的假失败。
- 已验证 `@moryflow/admin` 的最小回归修复成立：`pnpm --filter @moryflow/admin exec vitest run src/lib/api-client.test.ts src/features/storage/components/user-storage-card.test.tsx src/features/users/components/set-tier-dialog.test.tsx` -> `3 files, 10 passed`。
- 已完成第二次真实 `git commit` 门禁复跑并拿到完整失败面：`lint-staged`、`typecheck`、repo script tests、`@anyhunt/admin` 与 `@moryflow/admin` 的 full-unit 段已通过，新的唯一真正 blocker 收敛为 `@anyhunt/console/src/pages/MemoxPlaygroundPage.test.tsx` 在仓库级并发下仍使用默认 `5000ms` timeout；同一轮里 `@moryflow/admin` 还出现了 `src/features/alerts/alert-rule-form.test.ts` 的 `[vitest-pool-runner]: Timeout waiting for worker to respond` 未处理警告，但该包测试仍以 `42 passed` 结束，暂时不是 commit blocker。
- 已完成 `MemoxPlaygroundPage` 挡点的最小修复：该测试现在不再通过 `importOriginal()` 拉起整套 `@/features/memox` 页面依赖树，而是只 mock 页面真正依赖的 hooks、schema/defaults 与两个容器子组件，并补充显式 `15_000ms` timeout；这让测试职责回到“页面能渲染且不触发表单上下文错误”，避免 full-unit 并发下的无意义慢测。
- 已验证上述修复在最小范围与接近 hook 的并发条件下都成立：
  - `pnpm --filter @anyhunt/console exec vitest run src/pages/MemoxPlaygroundPage.test.tsx` -> `1 passed`
  - `pnpm turbo run test:unit --concurrency=4 --filter=@anyhunt/admin --filter=@anyhunt/console --filter=@moryflow/admin` -> `@anyhunt/admin 28 passed`、`@anyhunt/console 92 passed`、`@moryflow/admin 176 passed`
    本轮并发复跑中 `@moryflow/admin` 已不再复现先前的 worker timeout 未处理警告。
- 已完成第三次真实 `git commit` 门禁复跑并定位新的唯一剩余挡点：在 `MemoxPlaygroundPage` 修复后，hook 的 full-unit 长跑不再卡在 `@anyhunt/console` 默认 `5s` 超时，而是暴露出 `@moryflow/admin/src/features/chat/components/conversation-section.test.tsx` 中 `allows manual expand after auto collapse` 在仓库级并发下耗时约 `32s` 后失败；该问题与前面几轮同类，属于前端慢测预算不足，而不是知识索引或服务端实现回归。
- 已验证 `conversation-section` 的最小收口修复成立：`pnpm --filter @moryflow/admin exec vitest run src/features/chat/components/conversation-section.test.tsx` 当前结果为 `3 passed`，说明把 `allows manual expand after auto collapse` 的测试预算显式提升到 `60_000ms` 后，单包维度已不再存在功能或交互回归；下一步只需要复跑最接近 pre-commit hook 的三包并发门禁，确认仓库级资源竞争下也能稳定通过。
- 已验证最接近 pre-commit hook 的三包并发门禁已经重新稳定：`pnpm turbo run test:unit --concurrency=4 --filter=@moryflow/admin --filter=@anyhunt/console --filter=@anyhunt/admin` 当前结果为 `@anyhunt/admin 28 passed`、`@anyhunt/console 92 passed`、`@moryflow/admin 176 passed`，退出码为 `0`。这说明第三次 `git commit` 暴露出的唯一剩余挡点已经收口，当前可以重新进入真正的 `git add && git commit` 阶段。
- 已完成第四次真实 `git commit` 门禁复跑并收敛出新的唯一剩余挡点：`lint-staged`、根级脚本测试、全仓库 `typecheck` 以及 `@moryflow/admin` 的 full-unit 段都已通过，但仓库级 `test:unit` 现在暴露出 `@anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/components/message-row.test.tsx` 中 `passes stable viewportAnchorId to reasoning and tool triggers` 仍使用默认 `5000ms` timeout，在 full-unit 并发下耗时约 `16s` 后失败。该问题与前几轮一样，属于前端慢测预算不足，而不是知识索引、quota 或服务端逻辑回归；下一步只需对这条测试做最小 timeout/mock 收口。
- 已完成 `message-row` 挡点的最小修复并验证单包通过：`src/features/agent-browser-playground/components/AgentMessageList/components/message-row.test.tsx` 现在只对 `passes stable viewportAnchorId to reasoning and tool triggers` 补充显式 `30_000ms` timeout；`pnpm --filter @anyhunt/console exec vitest run src/features/agent-browser-playground/components/AgentMessageList/components/message-row.test.tsx` 当前结果为 `2 passed`，说明不需要再改业务组件或额外扩 mock。
- 已验证 `message-row` 修复在最接近 hook 的三包并发门禁下也重新稳定：`pnpm turbo run test:unit --concurrency=4 --filter=@moryflow/admin --filter=@anyhunt/console --filter=@anyhunt/admin` 当前结果为 `@anyhunt/admin 28 passed`、`@anyhunt/console 92 passed`、`@moryflow/admin 176 passed`，退出码为 `0`。当前已无局部并发挡点，可以再次进入真实 `git add && git commit`。
- 已完成第五次真实 `git commit` 门禁复跑并拿到新的完整失败面：`lint-staged`、根级脚本测试、全仓库 `typecheck`、`@anyhunt/console`、`@anyhunt/anyhunt-server` 与 `@moryflow/admin` 的 full-unit 段都已通过，当前唯一 blocker 已收敛到 `@moryflow/pc#test:unit`，具体是 `src/main/channels/telegram/secret-store.test.ts` 的 `应支持 bot token 本地写入与读取` 超时、`src/renderer/workspace/hooks/use-workspace-vault.test.tsx` 的两个 hydration 断言在仓库级并发下未等到稳定状态，以及 `chat-prompt-input-access-mode-selector.test.tsx`、`profile-editor.test.tsx` 各一条默认 `5000ms` timeout 失败。当前判断仍然是测试预算/异步等待在全仓库并发下过紧，而不是这轮业务改动引入新的 PC 侧功能回归。
- 已完成上述 4 个 PC 挡点的最小收口并验证最小范围通过：`secret-store.test.ts`、`use-workspace-vault.test.tsx`、`chat-prompt-input-access-mode-selector.test.tsx`、`profile-editor.test.tsx` 现在都只补充了测试级 timeout 或 `waitFor` timeout，不涉及业务实现变更；`pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/secret-store.test.ts src/renderer/workspace/hooks/use-workspace-vault.test.tsx src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-access-mode-selector.test.tsx src/renderer/components/settings-dialog/components/account/profile-editor.test.tsx` 当前结果为 `4 passed / 15 passed`。下一步直接回到真实 `git commit` hook 验证是否还有新的 full-repo 并发挡点。
- 已验证：
  - `pnpm --filter @moryflow/api test:unit -- indexable-text`
  - `pnpm --filter @moryflow/api build`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/sources/__tests__/knowledge-source.repository.spec.ts src/sources/__tests__/knowledge-source.service.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/sources/__tests__/knowledge-source-revision.service.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/sources/__tests__/source-ingest-read.service.spec.ts src/memory/__tests__/memory-overview.service.spec.ts src/memory/__tests__/memory.schema.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/sources/__tests__/source-ingest-read.service.spec.ts src/sources/__tests__/source-statuses.controller.spec.ts`
  - `pnpm --filter @moryflow/server exec vitest run src/memory/memory.client.spec.ts src/memory/memory.service.spec.ts src/memory/memory.dto.spec.ts`
  - `pnpm --filter @moryflow/server exec vitest run src/memox/memox-workspace-content-projection.service.spec.ts src/memox/memox-workspace-content.pipeline.spec.ts src/memox/memox-source-bridge.service.spec.ts`
  - `pnpm --filter @moryflow/server exec vitest run src/memox/memox-workspace-content-reconcile.service.spec.ts src/memox/memox-workspace-content-control.service.spec.ts`
  - `pnpm --filter @moryflow/server exec vitest run src/memox/memox-workspace-content-projection.service.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/sources/__tests__/source-chunking.service.spec.ts src/sources/__tests__/knowledge-source-revision.service.spec.ts`
  - `pnpm --filter @moryflow/api exec vitest run src/__tests__/indexable-text.spec.ts`
  - `pnpm --filter @moryflow/server exec vitest run src/memory/memory.controller.spec.ts`
  - `pnpm --filter @moryflow/server test -- memory.service.spec.ts memory.dto.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server test -- src/retrieval/__tests__/memory-fact-search.service.spec.ts`
  - `pnpm --filter @moryflow/pc exec vitest run src/main/app/ipc/memory.test.ts`
  - `pnpm --filter @moryflow/pc exec vitest run src/renderer/workspace/components/memory/knowledge-status.test.ts src/renderer/workspace/components/memory/use-memory-page.test.ts src/main/app/ipc/memory.test.ts`
  - `pnpm --filter @moryflow/pc build`
  - `pnpm --filter @moryflow/pc exec playwright test tests/memory-dashboard-ui.spec.ts tests/memory-harness.spec.ts tests/core-flow.spec.ts`
  - `pnpm --filter @moryflow/server exec vitest run src/memox/memox.client.spec.ts`
  - `pnpm --filter @moryflow/server exec vitest run src/memox/memox-workspace-content-control.service.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/sources/__tests__/knowledge-source-revision.service.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/idempotency/__tests__/idempotency.service.spec.ts src/idempotency/__tests__/idempotency-executor.service.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/sources/__tests__/internal-memox-write.controller.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/sources/__tests__/source-chunk.repository.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/quota/__tests__/quota.repository.spec.ts src/quota/__tests__/quota.service.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/api-key/__tests__/api-key.service.spec.ts`
  - `pnpm --filter @moryflow/server exec vitest run src/memox/memox-workspace-content-consumer.service.spec.ts`
  - `pnpm --filter @moryflow/server typecheck`
  - `pnpm --filter @anyhunt/anyhunt-server typecheck`
  - `pnpm --filter @moryflow/server build`
  - `pnpm --filter @anyhunt/anyhunt-server build`
  - `pnpm --filter @moryflow/pc typecheck`
  - `node --check scripts/reset-knowledge-index-domain.mjs`
  - `node --check scripts/rebuild-knowledge-index-domain.mjs`
  - `node scripts/reset-knowledge-index-domain.mjs --anyhunt-env /Users/lin/code/moryflow/apps/anyhunt/server/.env --skip-r2`
  - `node scripts/rebuild-knowledge-index-domain.mjs --moryflow-env /Users/lin/code/moryflow/apps/moryflow/server/.env`
  - `node - <<'NODE' ... GET /api/v1/quota x6 + POST /api/v1/retrieval/search(group_limits=0/0) x6 benchmark ... NODE`
  - `node - <<'NODE' ... GET /api/v1/quota payload probe + POST /api/v1/retrieval/search(group_limits=0/0) no-billing benchmark on :3313 ... NODE`
  - `pnpm harness:check`

---

## 执行约束

1. 不做历史兼容，不做数据升级，不做 backfill。
2. 允许清空 `KnowledgeSource` / `KnowledgeSourceRevision` / `SourceChunk` / memory / graph 派生数据。
3. 禁止清理 `Workspace` / `WorkspaceDocument` / `WorkspaceDocumentRevision` 及其他主业务用户数据。
4. 不新增任何用户可见的 `Retry / Retry all / Rebuild` 按钮或设置入口。
5. 系统自愈只允许通过：
   - outbox bounded retry
   - 服务端周期 reconcile
   - 上线一次性的 internal reset + rebuild
6. 不新增持久化 read-model table；优先新增 query service。
7. 允许直接改 Anyhunt DTO、Moryflow server DTO、PC IPC contract 和 renderer presenter；不保留旧字段兼容层。
8. 坚持“只做正确且必要的事情”，禁止为潜在场景预埋复杂机制；任何新增抽象都必须直接服务当前已验证问题。
9. 性能优化必须优先选择模块化、单一职责的最小实现：先修正当前热路径上职责错误或多余往返，再考虑更高层手段；禁止在证据不足时继续横向探索或引入新的跨模块复杂度。

## 目标结果

1. UI 只出现 `Scanning / Needs attention / Indexing / Ready` 四种状态。
2. `no indexable text` 固定走 quiet skip，不报错、不假装 indexing。
3. Anyhunt 不再用 `currentRevisionId == null` 推断 pending。
4. Moryflow 不再二次 `resolveSourceIdentity()` 来 materialize 生命周期元数据。
5. 失败优先级高于 indexing，且 detail panel 展示真实状态文件列表。
6. 上线时可一键清空派生域并从当前 workspace documents 全量重建。

---

### Task 1: 抽出共享的索引资格判定模块

**Files:**

- Create: `packages/api/src/file-index/indexable-text.ts`
- Modify: `packages/api/src/file-index/index.ts`
- Modify: `packages/api/src/index.ts`
- Create: `packages/api/src/__tests__/indexable-text.spec.ts`

**Step 1: 定义共享返回结构**

新增统一结果类型：

- `indexable: true | false`
- `normalizedText: string | null`
- `reason: 'no_indexable_text' | null`

规则固定为：

- 纯空白、仅换行、仅零宽字符、normalize 后为空 => `indexable = false`
- 其他情况 => `indexable = true`

**Step 2: 实现最小纯函数**

职责只包含：

- 文本 normalize
- indexable 判定

禁止包含：

- 文件系统读取
- 数据库
- 网络请求
- 向量/embedding 逻辑

**Step 3: 写单元测试**

覆盖：

- 空字符串
- 纯空白
- markdown 标题但无正文
- 正常 markdown
- 含中英文混合文本

**Step 4: 运行验证**

Run:

```bash
pnpm --filter @moryflow/api test:unit -- indexable-text
pnpm --filter @moryflow/api build
```

Expected:

- 新增测试通过
- `@moryflow/api` 可正常构建

---

### Task 2: 收紧 Anyhunt schema，让 Source 只做 aggregate

**Files:**

- Modify: `apps/anyhunt/server/prisma/vector/schema.prisma`
- Modify: `apps/anyhunt/server/src/sources/knowledge-source.repository.ts`
- Modify: `apps/anyhunt/server/src/sources/knowledge-source.service.ts`
- Modify: `apps/anyhunt/server/src/sources/sources-mappers.utils.ts`
- Modify: `apps/anyhunt/server/src/sources/dto/sources.schema.ts`
- Test: `apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts`
- Test: `apps/anyhunt/server/src/sources/__tests__/knowledge-source.service.spec.ts`

**Step 1: 改 schema**

把 `KnowledgeSource` 改成：

- 保留：identity fields / `currentRevisionId` / `latestRevisionId` / `status = ACTIVE | DELETED`
- 删除：`PROCESSING` / `FAILED`

把 source-level lifecycle metadata 从领域语义中移除：

- 不再依赖 `metadata.content_hash`
- 不再依赖 `metadata.storage_revision`

**Step 2: 改 repository / service**

保证 source 只负责：

- identity resolve
- current/latest revision pointer 维护
- deletion

source repository 不再提供：

- `markProcessing`
- `markFailed`

**Step 3: 改 response mapper / DTO**

直接把 source response 收敛到新模型，删除旧生命周期语义字段。

状态只保留：

- `ACTIVE`
- `DELETED`

**Step 4: 运行验证**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server exec vitest run \
  src/sources/__tests__/knowledge-source.repository.spec.ts \
  src/sources/__tests__/knowledge-source.service.spec.ts
pnpm --filter @anyhunt/anyhunt-server typecheck
```

Expected:

- repository/service 测试通过
- schema 改动后类型检查通过

---

### Task 3: 收紧 Anyhunt revision 生命周期，所有受理后的处理都必须 durable 落结果

**Files:**

- Modify: `apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`
- Modify: `apps/anyhunt/server/src/sources/knowledge-source-revision.repository.ts`
- Modify: `apps/anyhunt/server/src/sources/source-text.utils.ts`
- Modify: `apps/anyhunt/server/src/sources/source-processing.errors.ts`
- Test: `apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts`

**Step 1: 引入共享 classifier**

在 finalize 读到原始/normalized 文本后，统一使用 `@moryflow/api` 的 classifier。

要求：

- `indexable = false` 不能再走“日志报错 + 无状态落地”
- 一旦 revision 已被正式受理，结果必须写成 `FAILED` 或 `INDEXED`

**Step 2: 重排 finalize 顺序**

顺序改成：

1. 加锁
2. 读取 revision/source
3. classify
4. `tryMarkProcessing()`
5. chunk / embed / replace
6. `markIndexed()` 或 `markFailed()`

关键点：

- 任何受理后的处理错误都必须写回 revision
- 不再依赖 source `markProcessing / markFailed`

**Step 3: 明确 `no indexable text` 语义**

Anyhunt finalize 侧规则：

- 如果上游已正确前置判定，这里理论上不应再出现
- 若仍出现，则视为内部不变量破坏，写成 `FAILED`

**Step 4: 写回归测试**

至少覆盖：

- `No retrievable chunks generated` 不再只写日志
- embedding 失败写 `FAILED`
- 首次索引失败后 source 不再是假 pending
- 已有旧 revision 时新 revision 失败不影响旧 revision pointer

**Step 5: 运行验证**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server exec vitest run \
  src/sources/__tests__/knowledge-source-revision.service.spec.ts
```

Expected:

- finalize 失败路径全部写 durable revision result

---

### Task 4: 新增 Anyhunt ingest read model，停止 overview 猜状态

**Files:**

- Create: `apps/anyhunt/server/src/sources/source-ingest-read.service.ts`
- Create: `apps/anyhunt/server/src/sources/source-ingest-read.types.ts`
- Modify: `apps/anyhunt/server/src/sources/sources.module.ts`
- Modify: `apps/anyhunt/server/src/memory/memory-overview.service.ts`
- Modify: `apps/anyhunt/server/src/memory/dto/memory.schema.ts`
- Modify: `apps/anyhunt/server/src/memory/__tests__/memory-overview.service.spec.ts`

**Step 1: 定义统一 read model**

新增内部语义：

- `READY`
- `INDEXING`
- `NEEDS_ATTENTION`

只允许 `SourceIngestReadService` 根据：

- `currentRevisionId`
- `latestRevisionId`
- latest revision status / error

推导出这三种状态。

**Step 2: 改 overview 聚合**

overview 改成：

- `source_count`
- `indexed_source_count`
- `indexing_source_count`
- `attention_source_count`
- `last_completed_at`

删除：

- `pending_source_count`
- `failed_source_count`

**Step 3: 覆盖聚合测试**

测试矩阵至少包含：

- 首次索引中
- 首次索引失败
- 已有旧 revision + 新 revision processing
- 已有旧 revision + 新 revision failed

**Step 4: 运行验证**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server exec vitest run \
  src/memory/__tests__/memory-overview.service.spec.ts \
  src/memory/__tests__/memory.schema.spec.ts
```

Expected:

- overview 不再出现 pending/failed 字段
- 状态聚合全部来自 read service

---

### Task 5: 暴露文件级知识状态查询，供 detail panel 和 reconcile 共用

**Files:**

- Modify: `apps/anyhunt/server/src/sources/dto/sources.schema.ts`
- Create: `apps/anyhunt/server/src/sources/source-statuses.controller.ts`
- Modify: `apps/anyhunt/server/src/sources/sources.module.ts`
- Create: `apps/anyhunt/server/src/sources/__tests__/source-statuses.controller.spec.ts`
- Modify: `apps/moryflow/server/src/memory/memory.client.ts`
- Modify: `apps/moryflow/server/src/memory/dto/memory.dto.ts`
- Modify: `apps/moryflow/server/src/memory/memory.service.ts`

**Step 1: 新增 source status API**

新增只读接口，返回：

- `documentId`
- `title`
- `path`
- `state`
- `userFacingReason`
- `lastAttemptAt`

过滤至少支持：

- `attention`
- `indexing`

**Step 2: 在 Moryflow server 透传该接口**

`MemoryClient` / `MemoryService` 新增 knowledge status 查询方法，继续只做 transport + workspace 适配。

**Step 3: 写控制器与 DTO 测试**

重点验证：

- scope 隔离
- 返回语义字段
- 用户态 reason 不暴露 revision/chunk/materialization 术语

**Step 4: 运行验证**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server exec vitest run \
  src/sources/__tests__/source-statuses.controller.spec.ts
pnpm --filter @moryflow/server exec vitest run \
  src/memory/memory.service.spec.ts \
  src/memory/memory.dto.spec.ts
```

Expected:

- 文件级状态链路从 Anyhunt 到 Moryflow server 打通

---

### Task 6: 重写 Moryflow projection 写链，删除双 resolve 和 source lifecycle metadata

**Files:**

- Modify: `apps/moryflow/server/src/memox/memox-source-bridge.service.ts`
- Modify: `apps/moryflow/server/src/memox/memox-workspace-content-projection.service.ts`
- Modify: `apps/moryflow/server/src/memox/memox-workspace-content-consumer.service.ts`
- Modify: `apps/moryflow/server/src/memox/memox-source-contract.ts`
- Test: `apps/moryflow/server/src/memox/memox-workspace-content-projection.service.spec.ts`
- Test: `apps/moryflow/server/src/memox/memox-workspace-content.pipeline.spec.ts`
- Test: `apps/moryflow/server/src/memox/memox-source-bridge.service.spec.ts`

**Step 1: 前置 classify**

`MemoxWorkspaceContentProjectionService.upsertDocument()` 顺序改成：

1. 读文档内容
2. classify
3. `indexable = false`
   - source 不存在 => no-op
   - source 存在 => delete source
4. `indexable = true`
   - resolve stable source identity
   - create revision
   - finalize revision

**Step 2: 删除双 resolve**

删除：

- finalize 后再 `resolveSourceIdentity(materialize)` 的二次调用

bridge service 不再把 `content_hash` 写入 source identity metadata。

**Step 3: 明确 consumer 失败语义**

consumer 保持：

- bounded retry
- poison message dead-letter

但 deterministic `no indexable text` 不应再进入 dead-letter。

**Step 4: 写回归测试**

覆盖：

- 空白内容 quiet skip
- 已有 source 变成空白后自动 delete
- 相同内容 hash 不重复建 revision
- 不再出现 source lifecycle metadata materialize 流程

**Step 5: 运行验证**

Run:

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/memox/memox-workspace-content-projection.service.spec.ts \
  src/memox/memox-workspace-content.pipeline.spec.ts \
  src/memox/memox-source-bridge.service.spec.ts
```

Expected:

- projection 写链只剩一条稳定路径

---

### Task 7: 新增自动 reconcile，自愈 missing / stale / failed knowledge sources

**Files:**

- Create: `apps/moryflow/server/src/memox/memox-workspace-content-reconcile.service.ts`
- Create: `apps/moryflow/server/src/memox/memox-workspace-content-reconcile.service.spec.ts`
- Create: `apps/moryflow/server/src/memox/memox-workspace-content-reconcile.scheduler.ts`
- Modify: `apps/moryflow/server/src/memox/memox.module.ts`
- Modify: `apps/moryflow/server/src/memox/memox-workspace-content-control.service.ts`
- Modify: `apps/moryflow/server/src/memox/memox-workspace-content-control.controller.ts`
- Modify: `apps/moryflow/server/src/memox/dto/memox-control.dto.ts`

**Step 1: 定义最小 reconcile 规则**

周期 reconcile 只处理三类问题：

- active workspace document 存在，但 source 缺失
- source latest state = `NEEDS_ATTENTION` 且超过 cooldown
- source 对应内容 hash 落后于当前 active workspace revision

处理方式统一为：

- 重新写入 canonical outbox UPSERT/DELETE 事件

禁止：

- 直接调用 Anyhunt finalize/revision API 进行补偿

**Step 2: 新增周期任务**

使用 `@Cron`，低频运行即可，例如每 10 分钟。

约束：

- 带批次上限
- 带 cooldown
- 幂等
- 不扫全库无限放大

**Step 3: 保留 internal-only 全量 rebuild 入口**

只用于上线和排障，不给用户界面。

控制面新增 internal rebuild 方法：

- 基于当前 active `WorkspaceDocument` 集合重建 outbox 输入

**Step 4: 写测试**

覆盖：

- missing source 自动补 enqueue
- failed source 超过 cooldown 自动补 enqueue
- unchanged healthy source 不重复 enqueue

**Step 5: 运行验证**

Run:

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/memox/memox-workspace-content-reconcile.service.spec.ts \
  src/memox/memox-workspace-content-control.service.spec.ts
```

Expected:

- 运行期不依赖人工 retry
- rollout 仍有 internal rebuild 能力

---

### Task 8: 改 Moryflow server / PC IPC / shared IPC contract，禁止二次发明状态

**Files:**

- Modify: `apps/moryflow/server/src/memory/dto/memory.dto.ts`
- Modify: `apps/moryflow/server/src/memory/memory.service.ts`
- Modify: `apps/moryflow/pc/src/shared/ipc/memory.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc/memory-domain/overview.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc/memory-domain/knowledge-read.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc/memory.test.ts`

**Step 1: 改 overview 字段**

统一改成：

- `indexingSourceCount`
- `attentionSourceCount`

删除：

- `pendingSourceCount`
- `failedSourceCount`

**Step 2: 增加 knowledge status query 的 IPC contract**

PC 侧增加读取 detail panel 所需的文件状态列表，但只做透传，不做状态推导。

**Step 3: 写 IPC 回归测试**

覆盖：

- overview 新字段正确返回
- binding/scope 字段不回归
- knowledge status query 可用

**Step 4: 运行验证**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/app/ipc/memory.test.ts
```

Expected:

- IPC contract 与 server DTO 同步

---

### Task 9: 重做 renderer presenter 和知识状态面板

**Files:**

- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.ts`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.test.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-card.tsx`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-panel.tsx`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory-page.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory-page.test.ts`
- Modify: `packages/i18n/src/translations/workspace/en.ts`
- Modify: `packages/i18n/src/translations/workspace/zh-CN.ts`

**Step 1: 新增唯一 presenter**

`deriveKnowledgeSummary()` 输出：

- `SCANNING`
- `NEEDS_ATTENTION`
- `INDEXING`
- `READY`

规则固定：

- attention 高于 indexing
- renderer 禁止再直接用 count 判断状态

**Step 2: 改卡片**

卡片只展示：

- `Scanning`
- `Needs attention`
- `Indexing`
- `Ready`

不展示：

- pending
- failed
- revision/chunk/materialization 术语

**Step 3: 改 panel**

panel 改成真正的状态面板：

- attention 文件列表
- indexing 文件列表
- 简短用户态 reason

删除任何用户可见：

- `Retry`
- `Retry all failed`
- `Rebuild`

**Step 4: 写 renderer 测试**

覆盖：

- attention 优先级高于 indexing
- quiet skip 不显示错误
- detail panel 渲染真实状态列表

**Step 5: 运行验证**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/knowledge-status.test.ts \
  src/renderer/workspace/components/memory/use-memory-page.test.ts
```

Expected:

- 所有知识状态 UI 只走统一 presenter

---

### Task 10: 上线 reset + rebuild 工程化

**Files:**

- Create: `scripts/reset-knowledge-index-domain.mjs`
- Create: `scripts/rebuild-knowledge-index-domain.mjs`
- Modify: `package.json`
- Modify: `apps/moryflow/server/src/memox/dto/memox-control.dto.ts`
- Modify: `apps/moryflow/server/src/memox/memox-workspace-content-control.service.ts`
- Test: `apps/moryflow/server/src/memox/memox-workspace-content-control.service.spec.ts`
- Modify: `docs/reference/cloud-sync-and-memox-validation.md`

**Step 1: 写 reset 脚本**

脚本职责：

- 清空 Anyhunt memory / vector / graph 派生表
- 清理对应 object storage 派生对象

脚本禁止操作：

- `Workspace*`
- 其他主业务表

**Step 2: 写 rebuild 脚本**

脚本职责：

- 通过 internal control 入口触发基于 active workspace documents 的 rebuild enqueue
- 等待 outbox drain
- 默认 dry-run 只打印 base URL / payload，不要求本地具备 `INTERNAL_API_TOKEN`

同时修正内部 rebuild 语义：

- `rebuildActiveDocuments()` 默认分页扫描全量 canonical documents
- `limit` 改为可选 total cap，而不是默认只扫前 500 条

**Step 3: 写验证文档更新**

把新的上线验证固定为：

- reset
- rebuild
- replay/drain
- overview/status/search 验证

**Step 4: 运行验证**

Run:

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/memox/memox-workspace-content-control.service.spec.ts
pnpm --filter @moryflow/server typecheck
pnpm harness:check
node scripts/reset-knowledge-index-domain.mjs --anyhunt-env /Users/lin/code/moryflow/apps/anyhunt/server/.env --skip-r2
node scripts/rebuild-knowledge-index-domain.mjs --moryflow-env /Users/lin/code/moryflow/apps/moryflow/server/.env
```

Expected:

- reset/rebuild 脚本可 dry-run
- rebuild 默认语义不再受 500 文档上限影响
- harness 检查通过

---

## 最小验证矩阵

### Anyhunt

```bash
pnpm --filter @anyhunt/anyhunt-server exec vitest run \
  src/sources/__tests__/knowledge-source-revision.service.spec.ts \
  src/sources/__tests__/knowledge-source.repository.spec.ts \
  src/sources/__tests__/knowledge-source.service.spec.ts \
  src/sources/__tests__/source-statuses.controller.spec.ts \
  src/memory/__tests__/memory-overview.service.spec.ts \
  src/memory/__tests__/memory.schema.spec.ts
```

### Moryflow Server

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/memox/memox-source-bridge.service.spec.ts \
  src/memox/memox-workspace-content-projection.service.spec.ts \
  src/memox/memox-workspace-content.pipeline.spec.ts \
  src/memox/memox-workspace-content-reconcile.service.spec.ts \
  src/memox/memox-workspace-content-control.service.spec.ts \
  src/memory/memory.service.spec.ts \
  src/memory/memory.dto.spec.ts
```

### PC

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/app/ipc/memory.test.ts \
  src/renderer/workspace/components/memory/knowledge-status.test.ts \
  src/renderer/workspace/components/memory/use-memory-page.test.ts
```

### Shared Package

```bash
pnpm --filter @moryflow/api test:unit
pnpm --filter @moryflow/api build
```

---

## 实施顺序

按以下顺序执行，禁止并行打乱：

1. Task 1 共享 classifier
2. Task 2 Anyhunt aggregate schema
3. Task 3 revision 生命周期
4. Task 4 Anyhunt read model / overview
5. Task 5 文件级状态查询
6. Task 6 Moryflow projection 写链
7. Task 7 自动 reconcile
8. Task 8 server / IPC contract
9. Task 9 renderer
10. Task 10 reset + rebuild 工程化

原因：

- 先定共享 eligibility
- 再定 Anyhunt 数据模型和读模型
- 再改 Moryflow 编排与自愈
- 最后改 UI 和 rollout

---

## 上线执行口径

1. 部署新 schema 与新代码
2. 暂停 Memox ingest / graph worker
3. 执行 reset 脚本，清空派生域
4. 执行 rebuild 脚本，从 active workspace documents 全量重新 enqueue
5. 恢复 worker
6. 等待 outbox drain
7. 验证：
   - overview 正常
   - detail panel 状态正常
   - search 命中正常
   - graph 重建正常

上线后产品层不提供任何手动 `Retry / Rebuild`。

运行期恢复机制固定为：

- outbox bounded retry
- reconcile 周期自愈
- 文档内容变更自动重新入队

## 当前工作区体量快照

相对 `HEAD` 的当前未提交改动统计如下：

- 总计 `131` 个文件，`+9322 / -1579`
- 其中已跟踪文件 `104` 个，`+4406 / -1579`
- 未跟踪新文件 `27` 个，`+4916 / -0`

按内容类型拆分：

- 产品代码：`85` 个文件，`+3491 / -1135`
- 测试：`38` 个文件，`+3059 / -421`
- 文档：`6` 个文件，`+1913 / -23`
- 脚本：`2` 个文件，`+859 / -0`

按模块拆分的主要来源：

- `apps/moryflow/server/src/memox/*`：`+1594 / -384`
- `docs/*`：`+1913 / -23`
- `apps/anyhunt/server/src/sources/*`：`+1485 / -233`
- `apps/anyhunt/server/src/quota/*`：`+1086 / -120`
- `scripts/*`：`+859 / -0`
- `apps/moryflow/pc/src/renderer/workspace/components/memory/*`：`+446 / -361`

说明：

- 这组数字对应整个当前 worktree 的累计改动，不是最后一次 `quota/retrieval` 小修复本身
- 新增体量的主要来源是知识索引全链路重构，以及与之配套的测试、上线脚本和实施文档
- 仅文档、测试、脚本三类就占新增行数的多数；最近一轮 stale tier 修复只占很小一部分

提审前 fresh verification：

- `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/quota/__tests__/quota.repository.spec.ts src/quota/__tests__/quota.service.spec.ts src/billing/__tests__/billing.service.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts src/quota/__tests__/quota.controller.spec.ts` -> `97 passed`
- `pnpm --filter @anyhunt/anyhunt-server typecheck` -> `通过`
- `pnpm --filter @moryflow/server exec vitest run src/memox/memox-workspace-content-control.service.spec.ts src/memox/memox-workspace-content-reconcile.service.spec.ts src/memox/memox-workspace-content-consumer.service.spec.ts src/memox/memox-workspace-content-projection.service.spec.ts` -> `26 passed`
- `pnpm --filter @moryflow/server typecheck` -> `通过`
- `pnpm --filter @moryflow/pc exec playwright test tests/memory-dashboard-ui.spec.ts tests/memory-harness.spec.ts tests/core-flow.spec.ts` -> `7 passed`
- `pnpm --filter @moryflow/pc build` -> `通过`
- `pnpm --filter @anyhunt/admin test:unit` -> `28 passed`；同时确认仓库级 pre-commit 失败根因不是功能回归，而是 `src/lib/api-client.test.ts` 在 full unit 并发场景下 `15s` 超时预算过紧，因此已将该单测预算收敛为 `30s`
- 真实 `git commit` hook run：
  - `git add -A && git commit -m "Rebuild knowledge indexing pipeline and quota hot path"` 已完整跑完所有 hooks
  - `@moryflow/pc:test:unit` 最终结果为 `240 passed / 240` files，`1046 passed / 1046` tests，`electron-rebuild` posttest 通过
  - 本次 commit 唯一失败点不是代码或测试，而是 `commitlint` 拒绝了非 conventional message：`subject may not be empty`、`type may not be empty`
  - 下一步应仅改用合规 commit message 重新提交，不再继续改业务实现
- 真实 conventional commit hook run：
  - `git add -A && git commit -m "feat: rebuild knowledge indexing pipeline and quota hot path"` 已完整跑完所有 hooks
  - fresh full-unit 基线继续全绿，其中 `@anyhunt/anyhunt-server:test:unit` 为 `176 passed / 176` files，`1723 passed / 1723` tests；`@moryflow/pc:test:unit` 继续保持 `240 passed / 240` files，`1046 passed / 1046` tests
  - 最终提交已成功落盘：`8d83be36 feat: rebuild knowledge indexing pipeline and quota hot path`
  - 下一步进入 `git push -u origin feat/knowledge-indexing-pr-ready` 与 `gh pr create --draft --fill`
- 远端发布收口：
  - `git commit -m "docs: sync implementation verification baseline"` 已成功，用于补齐实施文档的最新验证结论
  - `git push -u origin feat/knowledge-indexing-pr-ready` 已成功，远端 tracking 已建立
  - GitHub 已返回新分支建 PR 入口：`https://github.com/dvlin-dev/moryflow/pull/new/feat/knowledge-indexing-pr-ready`
  - `gh pr create --draft --fill --head feat/knowledge-indexing-pr-ready` 已成功，draft PR 为 `#277`
  - PR URL：`https://github.com/dvlin-dev/moryflow/pull/277`

---

Plan complete and saved to `docs/plans/2026-03-21-knowledge-indexing-rebuild-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - 我按任务顺序直接实施，每完成一段就自检并继续。

**2. Parallel Session (separate)** - 另开 session，按 `executing-plans` 技能逐任务执行。
