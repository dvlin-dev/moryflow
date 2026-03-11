# Graph Module

> Warning: When this folder structure changes, you MUST update this document

## Position

`graph/` 负责 Memox 的 graph projection、graph context，以及后续面向 Moryflow Memory Workbench 的只读 graph query 能力。

## Responsibilities

**Does:**

- graph projection queue processing
- memory_fact / source_revision 证据投影
- canonical entity / relation upsert
- graph observation 写入
- retrieval result graph context 读取
- graph read/query 读模型
- observation-first cleanup 与 orphan prune

**Does NOT:**

- graph write CRUD
- source 摄入与 chunk 检索
- memory CRUD

## Notes

- 当 relation 两端实体因低置信或未升格而无法解析到 canonical entity 时，仍必须写入 `GraphObservation`（`graphRelationId=null`），禁止直接 `continue` 丢弃 relation evidence。
- graph 的公开边界只允许 read/query，不允许 edit/merge/split。
- source 删除、memory 删除必须同步清理 graph evidence，否则 graph 会脏。
- memory_fact projection 只基于正文异步抽取，不再依赖主表 `entities/relations` JSON 快照。
- `GraphRelation` 不再自己承载 evidence 字段；证据一律进入 `GraphObservation`。
- 低置信度 observation 不得直接升格为 canonical entity / relation。
- graph context 读取已支持 memory/source 批量读取，避免 retrieval N+1。
- source graph projection 默认只作为增强，不是 Moryflow Memory Workbench 上线前置；首期 Graph 视图的必达路径固定建立在 fact-derived projection 上。
