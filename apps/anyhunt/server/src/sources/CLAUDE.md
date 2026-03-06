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
- `KnowledgeSourceRevision` `inline_text` / `upload_blob` revision 创建
- `sources/` 公开 API（当前已开放 `inline_text` + `upload_blob` 写路径）
- normalized text 与 raw blob 存储到 R2
- 结构优先 chunking（heading/paragraph/code fence）
- chunk 向量化与 revision 级 replace 写入
- source currentRevision 更新
- source 删除异步清理（cleanup queue + storage object purge + hard delete）
- source/revision 状态流转（`READY_TO_FINALIZE|PENDING_UPLOAD -> PROCESSING -> INDEXED/FAILED`）
- 写路径统一接入 `Idempotency-Key`
- source ingest guardrail 运行时 enforcement（finalize/reindex 窗口 + concurrent processing slot）
- source ingest 结构化错误契约（`413/429/503/409` + RFC7807 details）
- 过期 `PENDING_UPLOAD` revision 小时级 zombie cleanup

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
6. `DELETE /sources/:id` 标记删除并投递 cleanup queue，processor 清理对象存储后硬删除 source
7. 小时级 cleanup job 扫描超时 `PENDING_UPLOAD` revision，删除残留对象后硬删除 revision

## Refactor Notes

- 不要把 `SourceChunk` 再塞回 `memory/` 主表。
- 不要在 `sources/` 里直接实现平台级 `retrieval/search` 聚合；后续必须走独立编排层。
- `upload_blob`/`uploadSession` 必须继续挂在 `KnowledgeSourceRevision` 资源边界下，不要把 blob 生命周期挂回 `KnowledgeSource`。
- source 删除不能退化成同步“删库完事”；对象存储清理必须走 durable queue，避免留下 R2 孤儿对象。
- `MemoxPlatformService` 里的 guardrail 不能只停留在配置模型；`KnowledgeSourceRevisionService` 必须在运行时真正 enforce。
- `sources.errors.ts` 中的 guardrail/lifecycle 错误契约必须保持结构化，不能回退成通用 `BadRequestException`。
- `pendingUploadExpiresAt` 与 `uploadSession.expiresAt` 不是同一个概念；前者约束 revision 生命周期，后者只约束上传 URL。
- `finalize()` 的 processing slot 必须覆盖从 `acquireProcessingSlot()` 之后的整个 preflight + processing 生命周期；任何 preflight 异常都必须走 `finally` 释放 slot。
- `finalize()` 只有在 source/revision 已经真正进入 `PROCESSING` 后，才允许写 `FAILED` 终态；preflight 拒绝不能污染状态机。

---

_See [apps/anyhunt/server/CLAUDE.md](../../CLAUDE.md) for server conventions._
