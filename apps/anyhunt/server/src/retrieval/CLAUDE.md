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

- 当前阶段不做模型级 rerank；统一检索只实现 hybrid retrieval + merge。
- `score` 只保证同一次响应内可比较，客户端应以返回顺序和 `rank` 为准。
- `sources/search` 的聚合语义由 Anyhunt 持有，不能下放给 Moryflow Server。
- `include_graph_context` 是显式可选输入；默认不附带 graph context。
- graph context 必须按域批量加载，不允许按 item N+1 查询。
