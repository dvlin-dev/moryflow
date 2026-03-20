# Graph Module

> Warning: When this folder structure changes, you MUST update this document

## Position

`graph/` 负责 Memox 的 `GraphScope`、memory-based graph projection、graph context、read/query，以及 scope 级 rebuild/status 运维面。

## Responsibilities

**Does:**

- graph projection queue processing
- memory_fact 证据投影
- canonical entity / relation upsert
- graph observation 写入
- retrieval result graph context 读取
- graph read/query 读模型
- observation-first cleanup 与 orphan prune
- graph scope rebuild / status

**Does NOT:**

- graph write CRUD
- source 摄入与 chunk 检索
- memory CRUD
- source direct graph projection

## Notes

- 当 relation 两端实体因低置信或未升格而无法解析到 canonical entity 时，仍必须写入 `GraphObservation`（`graphRelationId=null`），禁止直接 `continue` 丢弃 relation evidence。
- graph 的公开边界只允许 read/query，不允许 edit/merge/split。
- source 删除、memory 删除必须同步清理 graph evidence，否则 graph 会脏。
- memory_fact projection 只基于正文异步抽取，不再依赖主表 `entities/relations` JSON 快照。
- graph canonical merge 固定按 `graphScopeId`，所有 graph read/write/rebuild 必须先解析 `GraphScope`。
- `GraphRelation` 不再自己承载 evidence 字段；证据一律进入 `GraphObservation`。
- 低置信度 observation 不得直接升格为 canonical entity / relation。
- graph context 读取已支持 memory/source 批量读取，避免 retrieval N+1。
- rebuild/status 的唯一事实源固定为 `GraphProjectionRun + GraphScope`，不再依赖 Bull 临时状态或 source/fact 数量猜测。
