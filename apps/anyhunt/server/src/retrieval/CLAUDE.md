# Retrieval Module

> Warning: When this folder structure changes, you MUST update this document

## Position

`retrieval/` 负责 Memox 平台级检索语义：

- `POST /api/v1/sources/search`
- `POST /api/v1/retrieval/search`

目标边界：

- `memory/`：长期记忆 CRUD、history、feedback、export
- `sources/`：source/revision/chunk 摄入与生命周期
- `retrieval/`：跨 `memory_fact` 与 `source` 的检索编排、聚合与排序
- `graph/`：后续 graph context / canonical merge

## Responsibilities

**Does:**

- source chunk hybrid retrieval（semantic + keyword）
- source/file 聚合
- chunk expansion 与 snippet 生成
- memory fact 子域检索编排
- unified retrieval merge + rank
- retrieval/search 对外公开契约
- retrieval 结果 graph_context 按需附着

**Does NOT:**

- source 摄入与 revision 生命周期
- memory CRUD / export / feedback
- graph canonical merge
- Moryflow 专用协议

## Key Files

- `retrieval.controller.ts`
- `retrieval.service.ts`
- `memory-fact-search.service.ts`
- `source-search.service.ts`
- `source-search.repository.ts`
- `retrieval-score.utils.ts`
- `dto/retrieval.schema.ts`

## Notes

- 2026-03-07：`RetrievalModule` 已补齐 `ApiKeyModule` 显式导入，修复 `ApiKeyGuard` 依赖缺失导致的 Nest 启动失败。
- Public API 路由使用 `ApiKeyGuard`，`RetrievalModule` 必须显式导入 `ApiKeyModule`，否则 Nest 启动会因缺少 `ApiKeyService` 依赖而失败。
- 当前阶段不做模型级 rerank；统一检索只实现 hybrid retrieval + merge。
- `score` 只保证同一次响应内可比较，客户端应以返回顺序和 `rank` 为准。
- `sources/search` 的聚合语义由 Anyhunt 持有，不能下放给 Moryflow Server。
- `retrieval.controller.ts` 的成功响应 schema 必须继续直接由 `dto/retrieval.schema.ts` 派生到 OpenAPI；Step 7 gate 会同时检查 documented schema 与 runtime payload。
- source 结果的稳定文件身份固定包含 `source_id + project_id + external_id + display_path`；不得要求调用方从 `title/snippet` 反推文件身份。
- `include_graph_context` 是显式可选输入；默认不附带 graph context。
- graph context 必须按域批量加载，不允许按 item N+1 查询。
