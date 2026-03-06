# Graph Module

> Warning: When this folder structure changes, you MUST update this document

## Position

`graph/` 负责 Memox 内部 graph projection 与 graph context，不公开 graph query API。

## Responsibilities

**Does:**

- graph projection queue processing
- memory_fact / source_revision 证据投影
- canonical entity / relation upsert
- graph observation 写入
- retrieval result graph context 读取
- observation-first cleanup 与 orphan prune

**Does NOT:**

- 对外 graph CRUD / query API
- source 摄入与 chunk 检索
- memory CRUD

## Notes

- graph 只作为一期内部增强能力，不开放独立 API。
- source 删除、memory 删除必须同步清理 graph evidence，否则 graph 会脏。
- memory_fact projection 只基于正文异步抽取，不再依赖主表 `entities/relations` JSON 快照。
- `GraphRelation` 不再自己承载 evidence 字段；证据一律进入 `GraphObservation`。
- 低置信度 observation 不得直接升格为 canonical entity / relation。
- graph context 读取已支持 memory/source 批量读取，避免 retrieval N+1。
