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
- `__tests__/source-search.repository.integration.spec.ts`
- `retrieval-score.utils.ts`
- `dto/retrieval.schema.ts`

## Notes

- Public API 路由使用 `ApiKeyGuard`，`RetrievalModule` 必须显式导入 `ApiKeyModule`，否则 Nest 启动会因缺少 `ApiKeyService` 依赖而失败。
- 当前阶段不做模型级 rerank；统一检索只实现 hybrid retrieval + merge。
- `score` 只保证同一次响应内可比较，客户端应以返回顺序和 `rank` 为准。
- `sources/search` 的聚合语义由 Anyhunt 持有，不能下放给 Moryflow Server。
- `retrieval.controller.ts` 的成功响应 schema 必须继续直接由 `dto/retrieval.schema.ts` 派生到 OpenAPI；Step 7 gate 会同时检查 documented schema 与 runtime payload。
- source 结果的稳定文件身份固定包含 `source_id + project_id + external_id + display_path`；不得要求调用方从 `title/snippet` 反推文件身份。
- `include_graph_context` 是显式可选输入；默认不附带 graph context。
- `include_graph_context=true` 时必须提供 `scope.project_id`，并先解析单一 `GraphScope`；缺失 `project_id` 必须 fail-closed。
- graph context 必须按单一 `graphScopeId` 批量加载，不允许按 item N+1 查询。
- `source-search.repository.ts` 里的 chunk window CTE 必须沿用当前 schema 的 `String`/text `revisionId` 语义，并把候选 `centerChunkIndex` 固定成 `int`；禁止把候选 `revisionId` 强转成 `uuid` 或依赖 PostgreSQL 自行推断数字类型，否则会触发 `text = uuid` 或 `text - unknown` 的原始 SQL 错误。
- `source-search.repository` 的 SQL 类型约束必须同时由单元测试和真实 PostgreSQL 集成测试覆盖，避免只验证模板字符串而漏掉数据库类型推断回归。
