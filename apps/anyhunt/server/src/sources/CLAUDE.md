# Sources Module

> Warning: When this folder structure changes, you MUST update this document

## Position

`sources/` 负责 **KnowledgeSource / KnowledgeSourceRevision / SourceChunk** 这一组文档检索事实源。

目标边界：

- `memory/`：长期记忆、history、feedback、export
- `sources/`：知识源身份、revision 生命周期、normalized text、chunk 化检索材料
- `scope-registry/`：`user / agent / app / run` 作用域投影
- `graph/`：图谱 canonical projection（后续独立域）

`sources/` 不应该回退成 `memory/` 的子功能，也不应该直接承担平台级统一检索编排；平台级检索应由后续 `retrieval/` 域统一完成。

## Responsibilities

**Does:**

- `KnowledgeSource` 身份资源创建与读取
- `source-identities` 公开 resolve / upsert（按 `apiKeyId + sourceType + externalId` 解析稳定 `source_id`）
- 已存在 `source-identities` 的 scope 字段（`user_id / agent_id / app_id / run_id / org_id / project_id`）固定不可变；后续 resolve / upsert 必须重复证明所有已持久化的非空 scope，缺失或不一致都返回 `SOURCE_IDENTITY_SCOPE_MISMATCH`；只允许更新 title / displayPath / mimeType / metadata
- `source-identities` 在“缺 title 且需要新建 source”场景返回结构化 `SOURCE_IDENTITY_TITLE_REQUIRED`，供 Moryflow delete no-op / replay 使用
- `source-identities` 在命中已删除 source 时返回结构化 `SOURCE_IDENTITY_DELETED`，禁止借 resolve / upsert 直接 revive cleanup 中的 source
- `KnowledgeSourceRevision` `inline_text` / `upload_blob` revision 创建
- `sources/` 公开 API（当前已开放 `inline_text` + `upload_blob` 写路径）
- normalized text 与 raw blob 存储到 R2
- 结构优先 chunking（heading/paragraph/code fence）
- chunk 向量化与 revision 级 replace 写入
- source currentRevision 更新
- source 删除异步清理（cleanup queue + recovery scan + storage object purge + hard delete）
- source/revision 状态流转（`READY_TO_FINALIZE|PENDING_UPLOAD -> PROCESSING -> INDEXED/FAILED`）
- 写路径统一接入 `Idempotency-Key`
- source ingest guardrail 运行时 enforcement（finalize/reindex 窗口 + concurrent processing slot）
- source ingest 结构化错误契约（`413/429/503/409` + RFC7807 details）
- 过期 `PENDING_UPLOAD` revision 小时级 zombie cleanup
- `reindex()` 只消耗 reindex 窗口，不再额外消耗 finalize 窗口
- source ingest 成功语义不再依赖 graph projection 入队；graph queue 短暂故障只记 warn，不回滚已 indexed revision/source
- Source graph projection 默认关闭（canonical entity 按 apiKeyId 归并，尚未实现用户级隔离）；只有 `MEMOX_SOURCE_GRAPH_PROJECTION_ENABLED=true` 时才 enqueue graph projection / cleanup

**Does NOT:**

- 平台级统一检索 API
- graph canonical merge 与 graph query
- Moryflow 专用协议

## Member List

| File                                                  | Type       | Description                                     |
| ----------------------------------------------------- | ---------- | ----------------------------------------------- |
| `knowledge-source.repository.ts`                      | Repository | Source 身份资源数据访问                         |
| `knowledge-source-revision.repository.ts`             | Repository | Revision 生命周期数据访问                       |
| `source-chunk.repository.ts`                          | Repository | Chunk replace 写入                              |
| `knowledge-source.service.ts`                         | Service    | Source 身份资源业务逻辑                         |
| `knowledge-source-deletion.service.ts`                | Service    | Source 删除编排与 cleanup 投递                  |
| `knowledge-source-revision.service.ts`                | Service    | Revision 编排与 finalize/reindex                |
| `source-chunking.service.ts`                          | Service    | 结构化切块                                      |
| `source-storage.service.ts`                           | Service    | normalized text / blob R2 存储与 upload session |
| `source-revision-cleanup.service.ts`                  | Service    | 过期 pending-upload revision 扫描与清理         |
| `source-cleanup.processor.ts`                         | Processor  | Source 删除异步清理                             |
| `source-revision-cleanup.processor.ts`                | Processor  | 过期 revision 异步清理                          |
| `sources.errors.ts`                                   | Errors     | source ingest 结构化错误契约                    |
| `source-text.utils.ts`                                | Utils      | normalize/token/checksum/keywords               |
| `dto/sources.schema.ts`                               | Schema     | Sources 公开 API schema                         |
| `dto/index.ts`                                        | Export     | DTO 导出                                        |
| `sources.controller.ts`                               | Controller | Source identity 公开 API                        |
| `source-identities.controller.ts`                     | Controller | Source identity resolve/upsert 公开 API         |
| `source-revisions.controller.ts`                      | Controller | Revision 生命周期公开 API                       |
| `sources-mappers.utils.ts`                            | Utils      | snake_case 响应映射                             |
| `sources-http.utils.ts`                               | Utils      | 幂等响应描述 / 请求路径辅助                     |
| `sources.types.ts`                                    | Types      | 内部领域输入输出类型                            |
| `sources.module.ts`                                   | Module     | NestJS 模块                                     |
| `__tests__/source-chunking.service.spec.ts`           | Test       | chunking 回归                                   |
| `__tests__/knowledge-source.service.spec.ts`          | Test       | source identity 单元测试                        |
| `__tests__/knowledge-source-revision.service.spec.ts` | Test       | revision 编排单元测试                           |
| `__tests__/source-revision-cleanup.service.spec.ts`   | Test       | zombie revision cleanup 回归                    |
| `__tests__/sources.controller.spec.ts`                | Test       | source controller 幂等回归                      |
| `__tests__/source-revisions.controller.spec.ts`       | Test       | revision controller 幂等回归                    |
| `index.ts`                                            | Export     | 公共导出                                        |

## Lifecycle

1. 创建 `KnowledgeSource`
2. 创建 `inline_text` 或 `upload_blob` revision
3. 上传 normalized text，或生成 `uploadSession` 后由客户端上传 raw blob；`upload_blob` revision 同时写入 `pendingUploadExpiresAt`
4. `finalize` 读取 normalized text / blob → normalize → chunking → embedding → replace chunks；如果 `pendingUploadExpiresAt` 已过则返回 `409 SOURCE_UPLOAD_WINDOW_EXPIRED`
5. source 更新 `currentRevisionId`
6. `DELETE /sources/:id` 先把 source 标记为 `DELETED`，再尽力投递 cleanup queue；若入队瞬时失败，则由 recovery scan 继续补投，processor 最终清理对象存储并硬删除 source
7. 小时级 cleanup job 扫描超时 `PENDING_UPLOAD` revision，删除残留对象后硬删除 revision

## Invariants

1. `KnowledgeSource.status = DELETED` 后，`source-identities` resolve / upsert 必须返回 `409 SOURCE_IDENTITY_DELETED`；删除态 source 只能等待 cleanup，不能被同一 identity revive。
2. `createSource()` 在 preflight 命中既有 source 与数据库唯一键并发冲突两种路径下，都必须返回同一个结构化 `409 KNOWLEDGE_SOURCE_ALREADY_EXISTS`，不能把 `P2002` 或纯文本冲突泄漏到公开合同。
3. object 型 `metadata` 更新固定做 merge；只有显式传 `metadata = null` 才允许清空。identity refresh 不得覆盖已持久化的 `content_hash / storage_revision`。
4. `finalize()` / `reindex()` 的 source 级并发控制固定为“双闸门”：revision 状态 CAS（`tryMarkProcessing()`）+ Redis per-source lease（`memox:source-processing-lock:${apiKeyId}:${sourceId}`）；lease release 只能通过原子 compare-and-delete（当前实现为 `RedisService.compareAndDelete()`）在 owner compare 成功后删除。
5. 若 source 已有 `currentRevisionId`，后续新 revision 失败只能把该 revision 标为 `FAILED`；source 必须继续保留 last-good `ACTIVE/currentRevisionId`，不能因为一次坏 revision 掉出可检索状态。

## Refactor Notes

- 不要把 `SourceChunk` 再塞回 `memory/` 主表。
- 不要在 `sources/` 里直接实现平台级 `retrieval/search` 聚合；后续必须走独立编排层。
- `source-identities` 是二期 Moryflow bridge 的首选写入口；它只允许更新 identity 层字段，不得偷偷承载 revision / finalize 语义。
- `source-identities` 一旦创建，scope 字段必须保持冻结；若同一 `(apiKeyId, sourceType, externalId)` 被尝试改绑到其他 `project_id/user_id`，或调用方省略了已持久化 scope 仍想更新 identity，必须返回结构化 `SOURCE_IDENTITY_SCOPE_MISMATCH`，不能静默迁移。
- `SOURCE_IDENTITY_TITLE_REQUIRED` 是跨产品桥接合同的一部分，不能回退成仅靠 message 文本识别的普通 `BadRequestException`。
- `source-identities` 的公开 DTO 必须允许 `metadata = null` 显式清空；不能让 schema 把 repository 已支持的 metadata clear 合同提前拦掉。
- `upload_blob`/`uploadSession` 必须继续挂在 `KnowledgeSourceRevision` 资源边界下，不要把 blob 生命周期挂回 `KnowledgeSource`。
- source 删除不能退化成同步“删库完事”；对象存储清理必须走 durable queue + recovery scan，避免 `DELETED` source 长期悬挂或留下 R2 孤儿对象。
- `MemoxPlatformService` 里的 guardrail 不能只停留在配置模型；`KnowledgeSourceRevisionService` 必须在运行时真正 enforce。
- `sources.errors.ts` 中的 guardrail/lifecycle 错误契约必须保持结构化，不能回退成通用 `BadRequestException`。
- `pendingUploadExpiresAt` 与 `uploadSession.expiresAt` 不是同一个概念；前者约束 revision 生命周期，后者只约束上传 URL。
- `finalize()` 的 processing slot 必须覆盖从 `acquireProcessingSlot()` 之后的整个 preflight + processing 生命周期；任何 preflight 异常都必须走 `finally` 释放 slot。
- `finalize()` 只有在 source/revision 已经真正进入 `PROCESSING` 后，才允许写 `FAILED` 终态；preflight 拒绝不能污染状态机。
- 已删除 source 的 resolve / upsert 必须继续返回结构化 `SOURCE_IDENTITY_DELETED`；不要重新引入“按同 identity 自动 revive”的隐式兼容语义。
- `reindex()` 不能通过调用 `finalize()` 复用限流逻辑，否则会把 finalize/reindex 两套 guardrail 重新耦合。
- `finalize()` 只允许 `READY_TO_FINALIZE | PENDING_UPLOAD` 进入；`INDEXED` revision 若要重跑，只能走公开 `reindex()` 契约。
- graph projection 是 source ingest 的异步后处理，不得把 queue 短暂不可用升级成 revision/source 的假失败终态。
- `KnowledgeSourceRevisionService.finalize()` 默认不得 enqueue source graph projection queue；只有 `MemoxPlatformService.isSourceGraphProjectionEnabled()` 明确返回 `true` 时才允许投递 `project_source_revision/cleanup_source`。但 `KnowledgeSourceDeletionService.deleteSource()` 仍必须无条件投递 `cleanup_memory_fact`，因为 source-derived facts 始终会进入 memory-based graph projection。

---

_See [apps/anyhunt/server/CLAUDE.md](../../CLAUDE.md) for server conventions._
