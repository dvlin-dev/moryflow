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

## Execution Status（2026-03-07）

**Overall Status:** completed

**Execution Result:** 本轮 freeze follow-up 计划中的 blocker 已全部落地，代码、runbook、feature doc、code review fact source 与模块 `CLAUDE.md` 已重新对齐；本次收尾额外补齐了 lockfile stale importer 清理记录，并把默认热路径与 legacy baseline 的冷恢复口径统一到同一份事实。

### Task Results

1. Task 1 completed：冻结了本轮只处理的 blocker 范围，并把验证口径固定为 Moryflow/Anyhunt 定向 Vitest + 必要 typecheck + 最终 diff 校验。
2. Task 2 completed：Moryflow skip-revision 合同已按代码事实收口，aligned generation 不再下载正文、不再无意义重建 revision，identity refresh 也不再抹掉 `content_hash / storage_revision`。
3. Task 3 completed：Anyhunt `sources` 写侧已补上 revision 状态 CAS、per-source lease、`SOURCE_IDENTITY_DELETED` 与 last-good 保持可检索语义；object 型 `metadata` 更新改为 merge，`null` 仍表示显式清空。
4. Task 4 completed：Vault 删除已统一切到 `VaultDeletionService`，用户侧与管理侧都走“`file_deleted` outbox -> vault(DB) -> R2 -> quota”正式 teardown 链路。
5. Task 5 completed：rollback / rehearsal / outbox drain / feature doc 口径已统一为“Memox 默认热路径 + legacy baseline 冷恢复”；full rehearsal 显式要求 `MEMOX_API_KEY + VECTORIZE_API_URL`；drain 吞吐固定为单 job 最多连续处理 `10` 个 batch、每 batch `20` 条。
6. Task 6 completed：code review plan、feature doc、runbook、模块 `CLAUDE.md` 与 `pnpm-lock.yaml` 都已回写；`apps/moryflow/vectorize` stale importer 已清理，本地空目录 `apps/moryflow/server/src/vectorize/` 也已删除。

## Verification Record

**同工作树代码验证证据（2026-03-07，执行于本轮 follow-up 代码修复完成后）：**

- PASS：`pnpm --filter @moryflow/server typecheck`
- PASS：`pnpm --filter @anyhunt/anyhunt-server typecheck`
- PASS：`pnpm exec vitest run apps/moryflow/server/src/memox/memox-file-projection.service.spec.ts apps/moryflow/server/src/memox/memox-outbox-consumer.processor.spec.ts apps/moryflow/server/src/memox/memox-outbox-drain.service.spec.ts apps/moryflow/server/src/vault/vault-deletion.service.spec.ts apps/moryflow/server/src/admin-storage/admin-storage.service.spec.ts apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts apps/anyhunt/server/src/retrieval/__tests__/source-search.service.spec.ts apps/anyhunt/server/src/retrieval/__tests__/retrieval.service.spec.ts`
- PASS：`git diff --check`
- PASS：`git diff --cached --check`

**本次事实源收尾 fresh 验证（2026-03-07 22:21 CST）：**

- PASS：`git diff --check`
- PASS：`git diff --cached --check`
- PASS：`rg -n "rollback window 内仍会继续刷新 legacy baseline 镜像" docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md` 返回空结果
- PASS：`rg -n "apps/moryflow/vectorize" pnpm-lock.yaml` 返回空结果
- PASS：`test -d apps/moryflow/server/src/vectorize && echo exists || echo missing` 返回 `missing`

**本次完整 fresh 验证（2026-03-07 22:32 CST）：**

- PASS：`pnpm --filter @moryflow/server typecheck`
- PASS：`pnpm --filter @anyhunt/anyhunt-server typecheck`
- PASS：`pnpm exec vitest run apps/moryflow/server/src/memox/memox-file-projection.service.spec.ts apps/moryflow/server/src/memox/memox-outbox-consumer.processor.spec.ts apps/moryflow/server/src/memox/memox-outbox-drain.service.spec.ts apps/moryflow/server/src/vault/vault-deletion.service.spec.ts apps/moryflow/server/src/admin-storage/admin-storage.service.spec.ts apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts apps/anyhunt/server/src/retrieval/__tests__/source-search.service.spec.ts apps/anyhunt/server/src/retrieval/__tests__/retrieval.service.spec.ts`
- PASS：Vitest 汇总结果为 `9 passed` / `39 passed (39)`
- PASS：`git diff --check`
- PASS：`git diff --cached --check`

## Remaining Risks

- 外部 staging cutover rehearsal 仍未恢复：`https://server.anyhunt.app` 在 2026-03-07 实测不可达/返回 `502`，外部 legacy baseline 也不可用；因此当前只能确认本地可控环境与工作树事实源已收口，不能把 staging 演练视为已完成。
- 两个低优先级清理点已判定为非 blocker，但本轮未扩散到代码层：`knowledge-source.repository.ts` 中的 `revive` 选项已退化为死参数，`admin-storage.module.ts` 中的 `StorageModule` import 也看起来可删；建议留在下一轮独立 cleanup，而不是混入 freeze 收口。

## Handoff

当前 follow-up 已达到“事实源完全一致、可以进入下一步执行”的状态。下一步应等待外部 staging / legacy baseline 恢复后，再按 runbook 执行真实环境 rehearsal 与 cutover gate。
