# Memox Freeze Follow-up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 收掉 Memox 二期最后一轮总复盘暴露的冻结尾巴，使代码、runbook、架构文档重新回到同一份可执行事实。

**Architecture:** 本轮只修 review 已确认成立的阻塞项，不扩散需求。实现分 4 块：先修 Moryflow 文件投影与 skip-revision 合同，再修 Anyhunt source 写侧的一致性和删除语义，然后把 Vault 删除统一回收到正式生命周期入口，最后统一 rollback/runbook/rehearsal 文档口径并清理陈旧引用。

**Tech Stack:** NestJS, Prisma, BullMQ, Vitest, Markdown docs

---

### Task 1: 冻结执行范围与验证口径

**Files:**

- Modify: `docs/plans/2026-03-07-memox-freeze-followup-plan.md`
- Modify: `docs/design/anyhunt/runbooks/memox-phase2-code-review-plan.md`

**Steps:**

1. 记录本轮只处理的 blocker：Moryflow skip-revision、Anyhunt sources 三个 P0、Vault 删除统一入口、rollback/runbook/rehearsal 口径收口。
2. 固定验证命令：Moryflow memox/sync/vault/admin-storage 定向 Vitest，Anyhunt sources/retrieval 定向 Vitest，必要 typecheck。
3. 完成每个块后回写本计划或 review runbook 的状态，避免口头推进。

### Task 2: 修正 Moryflow skip-revision 合同

**Files:**

- Modify: `apps/moryflow/server/src/memox/memox-file-projection.service.ts`
- Modify: `apps/moryflow/server/src/memox/memox-file-projection.service.spec.ts`
- Modify: `apps/moryflow/server/src/memox/memox-source-bridge.service.ts`（若需要最小协议调整）
- Modify: `apps/anyhunt/server/src/sources/knowledge-source.repository.ts`（如需 metadata merge 才能保住代际元数据）
- Modify: `apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts`

**Steps:**

1. 先补 failing tests：覆盖 identity refresh 不得抹掉 `content_hash/storage_revision`，以及 generation 已对齐时不应下载正文、不应创建 revision。
2. 实现最小修复：保住 source metadata 的代际字段，并把正文下载移动到“确实需要 finalize 或 legacy mirror”分支里。
3. 跑定向测试，确认 rename-only / duplicate upsert 不再无意义重建 revision。

### Task 3: 修正 Anyhunt sources 写侧一致性

**Files:**

- Modify: `apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`
- Modify: `apps/anyhunt/server/src/sources/knowledge-source-revision.repository.ts`
- Modify: `apps/anyhunt/server/src/sources/knowledge-source.repository.ts`
- Modify: `apps/anyhunt/server/src/sources/knowledge-source-deletion.service.ts`
- Modify: `apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts`
- Modify: `apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts`

**Steps:**

1. 先补 failing tests：并发 finalize/reindex 只能有一个 processing winner；已有 `currentRevisionId` 的 source 在新 revision 失败时必须保留 last-good；`DELETED` source 不得被 resolve revive 旧内容。
2. 实现 revision 级 CAS/状态迁移，避免并发双跑。
3. 调整 source 状态语义：last-good revision 存在时，processing/failure 不得把 source 从可检索状态摘掉。
4. 收紧 delete 语义：删除后的 source 不能被同 identity 直接 revive；保留 cleanup 流程的一致性。
5. 跑 sources / retrieval 定向测试，确保读侧仍只读 current revision。

### Task 4: 把 Vault 删除统一回到正式生命周期入口

**Files:**

- Modify: `apps/moryflow/server/src/vault/vault.service.ts`
- Modify: `apps/moryflow/server/src/admin-storage/admin-storage.service.ts`
- Modify: `apps/moryflow/server/src/sync/file-lifecycle-outbox-writer.service.ts`（若需要复用 helper）
- Create or Modify tests for vault/admin-storage deletion behavior

**Steps:**

1. 先补 failing tests：删除 vault 时必须产生 `file_deleted` outbox 事件，并回算 storage usage。
2. 在用户侧和 admin 侧删除路径统一做：收集 live files → 写入 `file_deleted` outbox → 删除存储对象/DB 记录 → 回算 quota。
3. 确认删除后 Memox consumer 不依赖残留 `SyncFile` 行也能完成 source delete。

### Task 5: 收口 rollback / rehearsal / 文档事实源

**Files:**

- Modify: `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- Modify: `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- Modify: `docs/design/anyhunt/runbooks/memox-phase2-code-review-plan.md`
- Modify: `apps/moryflow/server/scripts/memox-phase2-local-rehearsal.ts`（如需 fail-fast 前置断言）
- Modify: `apps/moryflow/server/src/memox/memox-outbox-drain.service.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-drain.service.spec.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.processor.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.processor.spec.ts`

**Steps:**

1. 二选一收口 rollback 策略，并让 feature doc / runbook / code 三处一致。
2. 明确 rehearsal 最低环境变量，若脚本确实依赖 legacy baseline，就在脚本入口 fail-fast。
3. 提高 outbox drain 吞吐或修改 runbook SLO，使实现和闸门一致，不再“健康实现天然超阈值”。
4. 清理 code review plan 中已删除文件和陈旧背景引用。

### Task 6: 验证与回写

**Files:**

- Modify: `docs/design/anyhunt/runbooks/memox-phase2-code-review-plan.md`
- Modify: `docs/CLAUDE.md` / 相关模块 `CLAUDE.md`（仅在事实发生变化时）

**Steps:**

1. 运行本轮受影响测试与必要 typecheck。
2. 回写本轮修复结论、剩余风险、未完成项（若有）。
3. 确认工作树状态，再准备下一轮 review 或提交。
