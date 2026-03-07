---
title: Memox 二期代码审查执行计划
date: 2026-03-07
scope: docs/design/anyhunt/runbooks/memox-phase2-code-review-plan.md
status: completed
---

# Memox 二期代码审查执行计划

本文件是本轮大改动的唯一 code review 事实源。目标不是只看 staged diff，而是按链路把当前 `main` 语义、相邻实现、测试、数据库合同、文档事实源一起看完，并在每个 review block 完成后立即回写结论。

## 1. 审查目标

- 以最佳实践为准绳，审查当前暂存区对应改动是否符合：模块化、单一职责、根因治理、less is more。
- 不受历史兼容束缚；如果现状不符合最佳实践，允许直接给出重构建议，不为旧栈保留冗余层。
- 审查输出固定为 `P0 / P1 / P2`，并给出每个 block 的 `pass / pass with follow-ups / rewrite required` 判定。
- 最终在所有 block 完成后，再做一次跨模块整体复核，确认没有“局部正确、整体漂移”。

## 2. 审查方法（强制）

每个 block 必须同时完成以下四层阅读，禁止只看 diff：

1. 读取本 block 的 staged 文件。
2. 读取本 block 的相邻链路文件，包括调用方、被调用方、DTO/schema、测试、模块注册、配置入口。
3. 读取本 block 关联的设计文档 / runbook / CLAUDE.md，确认代码与事实源一致。
4. 若本 block 涉及数据库、消息队列、对外 API 或 generated 文件，必须补看 schema/migration/OpenAPI/队列消费者，而不是只看表面调用点。

固定审查问题：

- 职责是否清晰，是否出现“一个服务承担多个边界”的情况。
- 数据真相源是否唯一，是否有重复映射、重复状态、重复协议。
- 模块边界是否稳定，是否把旧栈语义偷偷带回新栈。
- 测试是否真的锁住新合同，而不是只覆盖 happy path。
- 文档事实是否与代码一致，是否还能作为实施事实源。

## 3. 总执行计划

本轮 code review 固定按下面 10 个步骤推进，不跳步、不并行写多份临时结论：

1. 建立 review 事实源：以本文件作为唯一记录点，不再额外开散落 TODO。
2. 完成 Block A：先冻结文档边界、实施范围、非目标与 rollback 定义。
3. 完成 Block B：审查 Anyhunt 写侧合同，确认 source identity / ingest / finalize / delete 的单一事实源。
4. 完成 Block C：审查 Anyhunt 读侧合同与 Step 7 gate，确认对外 API 和 hard gate 真实有效。
5. 完成 Block D：审查 Moryflow 读链，确认 Memox gateway 是主路径，legacy 仅保留最小 rollback baseline。
6. 完成 Block E：审查 Moryflow 写链，确认 `sync -> outbox -> bridge -> drain -> cutover` 真正闭环。
7. 完成 Block F：审查 Prisma / migration / vectorize 下线，确认旧栈删除是系统性闭环。
8. 完成 Block G：审查 PC / Admin / shared 消费方，确认下游合同已跟随新事实源收口。
9. 完成 Block H：审查环境变量、测试基线、运行时装配，确认本地与线上前提明确。
10. 完成 Block Z：做整体回顾，只在此时给出全局“能否放心继续”的最终结论。

## 4. Block 依赖与交付物

| 顺序 | Block | 为什么先看                                          | 交付物                                     | 若失败怎么办                              |
| ---- | ----- | --------------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| 1    | A     | 先固定事实源，避免后续按错前提 review               | 文档边界结论 + 非目标清单                  | 暂停后续 block，先修正文档事实源          |
| 2    | B     | 写侧合同是二期的源头                                | source identity / ingest / delete 根因结论 | 若写侧不稳，C~H 结论都降级为暂定          |
| 3    | C     | 读侧对外合同和上线 hard gate 直接影响可交付性       | API 合同结论 + Step 7 gate 可信度结论      | 若 gate 有洞，必须先补 gate 再继续        |
| 4    | D     | Moryflow 读链决定用户真实体验                       | search gateway / rollback 边界结论         | 若读链边界不清，暂停 G/H                  |
| 5    | E     | 写链决定 cutover / backfill / rollback 是否真可落地 | outbox/cutover 结论 + 风险清单             | 若写链不闭环，F/G 的结论不能算 ready      |
| 6    | F     | 旧栈下线是最佳实践的硬要求                          | schema/migration/vectorize 删除闭环结论    | 若发现半删半留，必须标记 rewrite required |
| 7    | G     | 下游消费者会暴露协议漂移                            | PC/Admin/shared 合同一致性结论             | 若客户端协议漂移，回跳 D/F 联查           |
| 8    | H     | 运行时与测试基线决定“纸面正确”能否落地              | env/test/runtime 装配结论                  | 若缺运行前提，必须补文档和脚本            |
| 9    | Z     | 最后收敛跨块矛盾                                    | 全局 go/no-go 结论                         | 若存在系统性矛盾，回跳对应 block          |

## 5. 每个 Block 的固定动作

每个 block 一律按同一套动作执行，减少主观随意性：

1. 列出本 block 的 staged 文件。
2. 列出至少一层上下游背景文件。
3. 阅读设计文档 / runbook / CLAUDE.md，确认当前事实源。
4. 阅读实现、测试、schema/migration/OpenAPI/运行脚本。
5. 先写 `Findings first`，再给 `结论`。
6. 若发现问题，明确写出它属于 `P0 / P1 / P2` 中哪一级，以及它污染了哪些后续 block。
7. 只有在本 block 已回写到本文件后，才允许进入下一个 block。

## 6. Block 完成定义

一个 block 只有同时满足以下条件才算完成：

- `状态` 已从 `pending` 改为 `completed`。
- `结论` 已明确写成 `pass / pass with follow-ups / rewrite required` 之一。
- `Findings` 已按 `P0 / P1 / P2` 写完，允许写“无”。
- 已补记“本次实际补看的背景文件”。
- 已补记“下一块是否允许继续：yes / no”。
- 若发现需要改文档、改代码、补测试，也已经把动作指向具体文件，而不是泛泛而谈。

## 7. 审查顺序

顺序按“先固定事实源与核心合同，再审查写链路、读链路、迁移/下线、下游消费者，最后整体回顾”执行。任一 block 若发现会污染后续判断的架构问题，允许回跳并重审之前 block。

## 8. Review Blocks

### Block A - 事实源与边界冻结

**目标**：先冻结本轮改动的系统边界、实施范围和非目标，避免后续 review 在错误前提上展开。

**主审文件**：

- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- `docs/design/anyhunt/core/system-boundaries-and-identity.md`
- `docs/design/anyhunt/core/quota-and-api-keys.md`
- `docs/design/anyhunt/core/request-and-state-unification.md`

**必须补看的背景文件**：

- `docs/design/anyhunt/features/index.md`
- `docs/design/anyhunt/runbooks/index.md`
- `docs/index.md`
- `docs/CLAUDE.md`
- `apps/anyhunt/server/CLAUDE.md`
- `apps/moryflow/server/CLAUDE.md`

**必须回答的问题**：

- 二期现在的唯一事实源到底是哪几份文档，彼此职责是否清楚。
- “Memox 替代什么、保留什么 rollback 能力、绝不再恢复什么旧栈”是否写清楚。
- 文档里的实施顺序、闸门、回滚条件是否已经足够指导后续 code review 与实现。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。主文档已冻结架构边界，cutover runbook 只负责 `backfill / replay / drift check / cutover / rollback`，`system-boundaries-and-identity.md` 也明确了 Moryflow -> Memox 的隔离和 scope 映射，没有发现互相打架的事实源。
- `P1`：无。
- `P2`：无。
  **补看的背景文件**：`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`、`docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`、`docs/design/anyhunt/core/system-boundaries-and-identity.md`、`docs/design/anyhunt/core/quota-and-api-keys.md`、`docs/design/anyhunt/core/request-and-state-unification.md`、`docs/design/anyhunt/runbooks/index.md`、`docs/index.md`、`docs/CLAUDE.md`、`apps/anyhunt/server/CLAUDE.md`、`apps/moryflow/server/CLAUDE.md`
  **下一块是否允许继续**：yes

### Block B - Anyhunt 写侧合同：source identity / source ingest / finalize / delete

**目标**：确认 Memox 平台写侧合同是否稳定、可组合、无历史兼容包袱。

**主审文件**：

- `apps/anyhunt/server/src/sources/source-identities.controller.ts`
- `apps/anyhunt/server/src/sources/knowledge-source.repository.ts`
- `apps/anyhunt/server/src/sources/knowledge-source.service.ts`
- `apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`
- `apps/anyhunt/server/src/sources/knowledge-source-deletion.service.ts`
- `apps/anyhunt/server/src/sources/source-chunk.repository.ts`
- `apps/anyhunt/server/src/sources/sources-http.utils.ts`
- `apps/anyhunt/server/src/sources/sources-mappers.utils.ts`
- `apps/anyhunt/server/src/sources/dto/sources.schema.ts`
- `apps/anyhunt/server/src/sources/sources.types.ts`
- `apps/anyhunt/server/src/sources/sources.module.ts`
- `apps/anyhunt/server/src/memox-platform/memox-platform.service.ts`
- `apps/anyhunt/server/src/api-key/api-key.module.ts`
- `apps/anyhunt/server/src/quota/__tests__/quota.service.integration.spec.ts`

**必须补看的背景文件**：

- `apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts`
- `apps/anyhunt/server/src/sources/__tests__/knowledge-source.service.spec.ts`
- `apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts`
- `apps/anyhunt/server/src/sources/__tests__/knowledge-source-deletion.service.spec.ts`
- `apps/anyhunt/server/src/sources/__tests__/source-identities.controller.spec.ts`
- `apps/anyhunt/server/src/memox-platform/__tests__/memox-platform.service.spec.ts`
- `apps/anyhunt/server/src/api-key/__tests__/api-key.module.spec.ts`
- `apps/anyhunt/server/src/app.module.ts`
- `apps/anyhunt/server/src/openapi/openapi-modules.ts`

**必须回答的问题**：

- `source-identities` 是否已经成为唯一稳定的 source resolve/upsert 入口。
- source write/delete/finalize 是否仍混入 graph、legacy、控制器兜底等非必要职责。
- 限流、幂等、scope 冻结、delete no-op、title 必填等关键合同是否真的在事实源处收口。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。`PUT /source-identities/:sourceType/:externalId` 已成为稳定的 resolve/upsert 入口，scope invariant、title 必填、幂等、delete no-op、graph 默认关闭时的 finalize/delete 侧边界都已在 controller/repository/service 收口，没有看到历史兼容补丁重新渗回写侧主链。
- `P1`：无。
- `P2`：无。
  **补看的背景文件**：`apps/anyhunt/server/src/sources/sources.controller.ts`、`apps/anyhunt/server/src/sources/source-revisions.controller.ts`、`apps/anyhunt/server/src/sources/knowledge-source.repository.ts`、`apps/anyhunt/server/src/sources/knowledge-source.service.ts`、`apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`、`apps/anyhunt/server/src/sources/knowledge-source-deletion.service.ts`、`apps/anyhunt/server/src/sources/sources-mappers.utils.ts`、`apps/anyhunt/server/src/sources/sources-http.utils.ts`、`apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts`、`apps/anyhunt/server/src/sources/__tests__/knowledge-source.service.spec.ts`、`apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts`、`apps/anyhunt/server/src/sources/__tests__/knowledge-source-deletion.service.spec.ts`、`apps/anyhunt/server/src/sources/__tests__/source-identities.controller.spec.ts`、`apps/anyhunt/server/src/memox-platform/memox-platform.service.ts`、`apps/anyhunt/server/src/memox-platform/__tests__/memox-platform.service.spec.ts`、`apps/anyhunt/server/src/api-key/api-key.module.ts`、`apps/anyhunt/server/src/api-key/__tests__/api-key.module.spec.ts`
  **下一块是否允许继续**：yes

### Block C - Anyhunt 读侧合同：sources search / retrieval / export / Step 7 gate

**目标**：确认 Memox 对外读 API 语义稳定，Step 7 能真实卡住 contract drift。

**主审文件**：

- `apps/anyhunt/server/src/retrieval/retrieval.controller.ts`
- `apps/anyhunt/server/src/retrieval/source-search.service.ts`
- `apps/anyhunt/server/src/retrieval/source-search.repository.ts`
- `apps/anyhunt/server/src/retrieval/dto/retrieval.schema.ts`
- `apps/anyhunt/server/src/retrieval/retrieval.types.ts`
- `apps/anyhunt/server/src/memory/memory-export.controller.ts`
- `apps/anyhunt/server/src/memory/memory.repository.ts`
- `apps/anyhunt/server/src/memory/utils/memory-json.utils.ts`
- `apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.ts`
- `apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.utils.ts`
- `apps/anyhunt/server/test/setup.ts`

**必须补看的背景文件**：

- `apps/anyhunt/server/src/retrieval/__tests__/retrieval.controller.spec.ts`
- `apps/anyhunt/server/src/retrieval/__tests__/source-search.service.spec.ts`
- `apps/anyhunt/server/src/memory/__tests__/memory-export.controller.spec.ts`
- `apps/anyhunt/server/test/memox-phase2-openapi-load-check.utils.spec.ts`
- `apps/anyhunt/server/src/openapi/openapi.service.ts`
- `apps/anyhunt/server/src/main.ts`

**必须回答的问题**：

- 查询型/读取型 `POST` 是否统一为显式 `200 OK`，OpenAPI 与运行时是否一致。
- `sources/search`、`retrieval/search`、`exports/get` 的 payload shape 是否足够稳定，且被测试与脚本双重锁住。
- Step 7 是否还存在“脚本绿了，但真实合同已经漂移”的死角。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。查询型/幂等写型 `POST` 已显式固定为 `200 OK`，Step 7 hard gate 也已同时检查 required/forbidden paths、required operations、documented success status，并在运行时精确校验 `PUT /source-identities/*`、`POST /sources/:sourceId/revisions`、`POST /source-revisions/:revisionId/finalize`、`POST /sources/search`、`POST /retrieval/search`、`POST /exports`、`POST /exports/get`。
- `P1`：无。
- `P2`：无。
  **补看的背景文件**：`apps/anyhunt/server/src/retrieval/retrieval.controller.ts`、`apps/anyhunt/server/src/retrieval/source-search.service.ts`、`apps/anyhunt/server/src/retrieval/source-search.repository.ts`、`apps/anyhunt/server/src/retrieval/dto/retrieval.schema.ts`、`apps/anyhunt/server/src/retrieval/retrieval.types.ts`、`apps/anyhunt/server/src/memory/memory-export.controller.ts`、`apps/anyhunt/server/src/memory/memory.repository.ts`、`apps/anyhunt/server/src/memory/utils/memory-json.utils.ts`、`apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.ts`、`apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.utils.ts`、`apps/anyhunt/server/test/memox-phase2-openapi-load-check.utils.spec.ts`、`apps/anyhunt/server/src/retrieval/__tests__/retrieval.controller.spec.ts`、`apps/anyhunt/server/src/memory/__tests__/memory-export.controller.spec.ts`、`apps/moryflow/server/src/search/search.controller.ts`、`apps/moryflow/server/src/search/search.controller.spec.ts`
  **下一块是否允许继续**：yes

### Block D - Moryflow 读链路：Memox gateway / runtime config / search adapter

**目标**：确认 Moryflow 搜索读链已经以 Memox 为主，legacy 仅保留最小 rollback baseline。

**主审文件**：

- `apps/moryflow/server/src/memox/memox.client.ts`
- `apps/moryflow/server/src/memox/memox-runtime-config.service.ts`
- `apps/moryflow/server/src/memox/memox-search-adapter.service.ts`
- `apps/moryflow/server/src/memox/legacy-vector-search.client.ts`
- `apps/moryflow/server/src/memox/dto/memox.dto.ts`
- `apps/moryflow/server/src/memox/memox.module.ts`
- `apps/moryflow/server/src/search/search.service.ts`
- `apps/moryflow/server/src/search/search-result-filter.service.ts`
- `apps/moryflow/server/src/search/search.controller.ts`
- `apps/moryflow/server/src/search/dto/search.dto.ts`
- `apps/moryflow/server/src/search/search.module.ts`

**必须补看的背景文件**：

- `apps/moryflow/server/src/memox/memox.client.spec.ts`
- `apps/moryflow/server/src/memox/memox-runtime-config.service.spec.ts`
- `apps/moryflow/server/src/memox/memox-search-adapter.service.spec.ts`
- `apps/moryflow/server/src/search/search.service.spec.ts`
- `apps/moryflow/server/src/search/search.controller.spec.ts`
- `apps/moryflow/server/src/openapi/openapi.service.ts`

**必须回答的问题**：

- `SearchService` 是否真正只承担用户搜索编排，而不是再次吸收 platform/client/filter/rollback 细节。
- `legacy_vector_baseline` 是否已经被压缩成最小必要 rollback 能力，没有把旧栈读写职责带回来。
- runtime config 是否在启动期 fail-fast，把错误尽早暴露，而不是拖到首个用户请求。

**状态**：completed
**结论**：pass with follow-ups
**Findings first**：

- `P0`：无。Moryflow 搜索读链已经按 runtime backend 显式分流到 `memox` 或 `legacy_vector_baseline`，并在返回前用 `SyncFile` 活跃集做 live-filter；`MemoxRuntimeConfigService` 也会在启动期 fail-fast 校验 Memox/rollback baseline 所需配置，主读路径与 11.2 冻结合同一致。
- `P1`：无。
- `P2`：`SearchService` 目前同时承担 backend 选择、live result filter、legacy match mapping 三个职责；当前体量仍可接受，但如果搜索 contract 继续演化，最好把 legacy mapping/live filtering 再拆回独立 adapter/filter，避免 gateway 继续变胖。
  **补看的背景文件**：`apps/moryflow/server/src/search/search.service.ts`、`apps/moryflow/server/src/search/search.service.spec.ts`、`apps/moryflow/server/src/search/search.controller.ts`、`apps/moryflow/server/src/search/search.controller.spec.ts`、`apps/moryflow/server/src/memox/memox.client.ts`、`apps/moryflow/server/src/memox/memox.client.spec.ts`、`apps/moryflow/server/src/memox/memox-source-bridge.service.ts`、`apps/moryflow/server/src/memox/memox-source-bridge.service.spec.ts`、`apps/moryflow/server/src/memox/memox-search-adapter.service.ts`、`apps/moryflow/server/src/memox/memox-search-adapter.service.spec.ts`、`apps/moryflow/server/src/memox/memox-runtime-config.service.ts`、`apps/moryflow/server/src/memox/memox-runtime-config.service.spec.ts`、`apps/moryflow/server/src/memox/legacy-vector-search.client.ts`、`apps/moryflow/server/src/memox/memox.module.ts`、`apps/moryflow/server/src/memox/CLAUDE.md`
  **下一块是否允许继续**：yes

### Block E - Moryflow 写链路：sync -> outbox -> bridge -> drain -> cutover

**目标**：确认 Moryflow 文件生命周期写链路是真正的单一真相源，cutover/backfill/replay 设计可落地且不脆弱。

**主审文件**：

- `apps/moryflow/server/src/sync/file-lifecycle-outbox.service.ts`
- `apps/moryflow/server/src/memox/memox-source-bridge.service.ts`
- `apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`
- `apps/moryflow/server/src/memox/memox-outbox-consumer.processor.ts`
- `apps/moryflow/server/src/memox/memox-outbox-drain.service.ts`
- `apps/moryflow/server/src/memox/memox-cutover.service.ts`
- `apps/moryflow/server/scripts/memox-phase2-local-rehearsal.ts`
- `apps/moryflow/server/src/app.module.ts`
- `apps/moryflow/server/src/main.ts`

**必须补看的背景文件**：

- `apps/moryflow/server/src/sync/file-lifecycle-outbox.service.spec.ts`
- `apps/moryflow/server/src/sync/dto/sync.dto.spec.ts`
- `apps/moryflow/server/src/memox/memox-source-bridge.service.spec.ts`
- `apps/moryflow/server/src/memox/memox-outbox-consumer.service.spec.ts`
- `apps/moryflow/server/src/memox/memox-outbox-consumer.di.spec.ts`
- `apps/moryflow/server/src/memox/memox-outbox-consumer.processor.spec.ts`
- `apps/moryflow/server/src/memox/memox-outbox-drain.service.spec.ts`
- `apps/moryflow/server/src/memox/memox-cutover.service.spec.ts`
- `apps/moryflow/server/src/sync/*.ts`
- `apps/moryflow/server/src/testing/mocks/prisma.mock.ts`

**必须回答的问题**：

- `SyncFile` 是否仍然是唯一文件生命周期真相源，stale event / delete miss / rename no-content-change 是否都在桥接层被正确收口。
- outbox retry / DLQ / drain / ack 语义是否清楚，是否还能被误用成“补丁式兜底”。
- rehearsal 脚本是否真实覆盖 cutover、rollback、shadow compare，而不是只验证 happy path。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。`sync -> outbox -> consumer -> cutover` 闭环成立：`SyncFile` 仍是唯一文件生命周期真相源，consumer 先回查当前 `SyncFile` 代际再决定 upsert/delete，stale upsert、delete miss、scope replay、snapshot hash 校验、retry/DLQ/ack 语义都在 bridge/outbox 层收口，没有看到补丁式旁路。
- `P1`：无。
- `P2`：无。
  **补看的背景文件**：`apps/moryflow/server/src/sync/file-lifecycle-outbox.service.ts`、`apps/moryflow/server/src/sync/file-lifecycle-outbox.service.spec.ts`、`apps/moryflow/server/src/sync/sync-commit.service.ts`、`apps/moryflow/server/src/memox/memox-source-bridge.service.ts`、`apps/moryflow/server/src/memox/memox-source-bridge.service.spec.ts`、`apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`、`apps/moryflow/server/src/memox/memox-outbox-consumer.service.spec.ts`、`apps/moryflow/server/src/memox/memox-outbox-consumer.processor.ts`、`apps/moryflow/server/src/memox/memox-outbox-consumer.processor.spec.ts`、`apps/moryflow/server/src/memox/memox-outbox-drain.service.ts`、`apps/moryflow/server/src/memox/memox-outbox-drain.service.spec.ts`、`apps/moryflow/server/src/memox/memox-cutover.service.ts`、`apps/moryflow/server/src/memox/memox-cutover.service.spec.ts`、`apps/moryflow/server/scripts/memox-phase2-local-rehearsal.ts`
  **下一块是否允许继续**：yes

### Block F - 数据模型与旧栈下线：Prisma / migration / vectorize 删除

**目标**：确认“旧 vectorize 栈下线”已经在数据库、模块、部署资产三个层面闭环，而不是表面删除。

**主审文件**：

- `apps/moryflow/server/prisma/schema.prisma`
- `apps/moryflow/server/prisma/migrations/20260307060000_remove_vectorize_stack/migration.sql`
- `apps/moryflow/server/prisma/migrations/20260307100000_add_file_lifecycle_outbox_dlq/migration.sql`
- `apps/moryflow/server/generated/prisma/*`
- `apps/moryflow/server/src/vectorize/*`
- `apps/moryflow/vectorize/*`
- `apps/moryflow/server/src/quota/*`
- `apps/moryflow/server/src/admin-storage/*`

**必须补看的背景文件**：

- `apps/moryflow/server/src/memox/*`
- `apps/moryflow/server/src/search/*`
- `apps/moryflow/server/src/storage/*`
- `apps/moryflow/server/src/sync/*`
- 相关 deployment / env 文档

**必须回答的问题**：

- schema、migration、generated client 是否一致，是否还有半删半留的模型。
- `src/vectorize/*` 和独立 `apps/moryflow/vectorize/*` 是否应该全部物理删除，还是当前 staged 只是删除前的中间态。
- quota/admin-storage 是否已经从“vectorized\* 指标”切换到新的事实源，没有继续泄露旧概念。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。`VectorizedFile` / `vectorizedCount` 的 schema、migration、generated client、物理目录删除是闭环的，旧 worker/controller/reconcile 也已从主链移除。
- `P1`：无。`AdminStorageService` 已把统计真相源收口到 live `Vault / SyncFile`；`UserStorageUsage` 重新退回额度缓存角色，不再被误用成“活跃云同步用户”事实源。
- `P2`：无。`pnpm-workspace.yaml` 的 `vectorize` glob、空目录尾巴与 admin-storage 语义回归测试都已补齐/清理。
  **补看的背景文件**：`apps/moryflow/server/prisma/schema.prisma`、`apps/moryflow/server/prisma/migrations/20260307060000_remove_vectorize_stack/migration.sql`、`apps/moryflow/server/prisma/migrations/20260307100000_add_file_lifecycle_outbox_dlq/migration.sql`、`apps/moryflow/server/generated/prisma/*`、`apps/moryflow/server/src/quota/quota.service.ts`、`apps/moryflow/server/src/quota/quota.service.spec.ts`、`apps/moryflow/server/src/admin-storage/admin-storage.service.ts`、`apps/moryflow/server/src/admin-storage/dto/admin-storage.dto.ts`、`apps/moryflow/server/src/memox/memox-runtime-config.service.ts`、`apps/moryflow/server/src/search/search.service.ts`、`apps/moryflow/server/src/sync/sync-commit.service.ts`、`apps/moryflow/server/src/sync/file-lifecycle-outbox.service.ts`、`apps/moryflow/server/CLAUDE.md`、`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`、`docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`、`pnpm-workspace.yaml`
  **下一块是否允许继续**：yes

### Block G - 下游消费者合同：PC / Admin / shared package

**目标**：确认 Moryflow 下游消费方已经跟随新事实源收口，没有继续依赖旧 vectorize/search 语义。

**主审文件**：

- `apps/moryflow/pc/src/main/cloud-sync/api/client.ts`
- `apps/moryflow/pc/src/main/cloud-sync/api/types.ts`
- `apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`
- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
- `apps/moryflow/pc/src/main/cloud-sync/sync-engine/__tests__/index.spec.ts`
- `packages/api/src/cloud-sync/types.ts`
- `apps/moryflow/admin/src/features/storage/*`
- `apps/moryflow/admin/src/pages/DashboardPage.tsx`
- `apps/moryflow/admin/src/pages/DashboardPage.storage.test.tsx`

**必须补看的背景文件**：

- `apps/moryflow/server/src/admin-storage/*`
- `apps/moryflow/server/src/quota/*`
- `apps/moryflow/server/src/search/*`
- `apps/moryflow/server/src/memox/*`
- `packages/api/CLAUDE.md`
- `apps/moryflow/pc/CLAUDE.md`

**必须回答的问题**：

- PC/shared/admin 是否还携带旧 `vectorized*` 或旧搜索协议假设。
- 下游显示的数据是否来自正确的新真相源，而不是临时拼装或重复计算。
- IPC / API types 是否与 server 合同一致，是否存在“服务端已改、客户端类型滞后”的风险。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。PC/shared 已切到 file-first 搜索合同 `fileId / vaultId / title / path / snippet / score`，用量合同也已收口为 `storage + fileLimit + plan`，没有发现旧 `vectorized*` 或旧 search item 阻塞残留。
- `P1`：无。Admin 下游当前拿到的 storage 统计已来自修正后的 live `Vault / SyncFile` 事实源，不再被 `UserStorageUsage` 占位行或 soft-deleted 文件污染。
- `P2`：无。`user-storage-card.tsx` Header 已改回云存储语义；server 侧也已补上 admin-storage 语义回归测试。
  **补看的背景文件**：`packages/api/src/cloud-sync/types.ts`、`apps/moryflow/pc/src/main/cloud-sync/api/types.ts`、`apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`、`apps/moryflow/pc/src/main/cloud-sync/api/client.ts`、`apps/moryflow/pc/src/main/app/ipc-handlers.ts`、`apps/moryflow/pc/src/main/cloud-sync/sync-engine/__tests__/index.spec.ts`、`apps/moryflow/server/src/search/dto/search.dto.ts`、`apps/moryflow/server/src/admin-storage/admin-storage.service.ts`、`apps/moryflow/server/src/quota/quota.service.ts`、`apps/moryflow/admin/src/types/storage.ts`、`apps/moryflow/admin/src/features/storage/api.ts`、`apps/moryflow/admin/src/features/storage/hooks.ts`、`apps/moryflow/admin/src/features/storage/components/storage-stats-cards.tsx`、`apps/moryflow/admin/src/features/storage/components/user-storage-card.tsx`、`apps/moryflow/admin/src/pages/DashboardPage.tsx`、`apps/moryflow/admin/src/pages/DashboardPage.storage.test.tsx`、`apps/moryflow/pc/CLAUDE.md`、`packages/api/CLAUDE.md`
  **下一块是否允许继续**：yes

### Block H - 测试基线与运行时装配

**目标**：确认本轮改动在启动装配、环境变量、测试基线、E2E 支撑上是真能跑，不是只在代码层看起来合理。

**主审文件**：

- `apps/anyhunt/server/.env.example`
- `apps/moryflow/server/.env.example`
- `apps/moryflow/server/test/vitest.setup.ts`
- `apps/moryflow/server/test/ai-proxy.e2e-spec.ts`
- `apps/moryflow/server/src/auth/auth-social.controller.ts`
- `apps/moryflow/server/src/auth/CLAUDE.md`
- `apps/moryflow/server/src/app.module.ts`
- `apps/moryflow/server/src/main.ts`

**必须补看的背景文件**：

- `apps/anyhunt/server/src/main.ts`
- `apps/anyhunt/server/test/setup.ts`
- 当前 runbook 的 Step 7 执行入口与本地脚本

**必须回答的问题**：

- 环境变量、BullMQ/Redis、OpenAPI、test harness 是否与新架构一致。
- E2E/test setup 是否还在默默假设旧 vectorize 栈存在。
- 本地可控环境与 staging/production 之间是否有未记录的运行前提。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。BullMQ/Redis 装配、`trust proxy`、OpenAPI 挂载、auth social 路由与当前二期运行时装配没有发现阻塞性错误，本地测试基线也没有继续默默依赖旧 vectorize 模块。
- `P1`：无。`MORYFLOW_SEARCH_BACKEND`、Step 7 脚本官方命令与本地 gate/rehearsal 所需 env 已全部回写到 `.env.example`、package script、runbook 与主文档。
- `P2`：无。
  **补看的背景文件**：`apps/moryflow/server/.env.example`、`apps/anyhunt/server/.env.example`、`apps/moryflow/server/src/app.module.ts`、`apps/moryflow/server/src/main.ts`、`apps/anyhunt/server/src/main.ts`、`apps/moryflow/server/src/auth/auth-social.controller.ts`、`apps/moryflow/server/src/auth/__tests__/auth.social.controller.spec.ts`、`apps/moryflow/server/src/memox/memox-runtime-config.service.ts`、`apps/moryflow/server/src/memox/memox-runtime-config.service.spec.ts`、`apps/moryflow/server/scripts/memox-phase2-local-rehearsal.ts`、`apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.ts`、`apps/anyhunt/server/test/setup.ts`、`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`、`docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`、`docs/design/anyhunt/core/system-boundaries-and-identity.md`、`apps/moryflow/server/CLAUDE.md`、`apps/anyhunt/server/CLAUDE.md`
  **下一块是否允许继续**：yes

### Block Z - 整体回顾

**目标**：在所有局部 review 完成后，重新从用户体验、系统架构、实施风险三个维度做一次全局复核。

**必须完成的动作**：

- 重新检查所有 block 的 `P0 / P1 / P2` 是否存在相互矛盾。
- 重新检查“最佳实践下是否还值得重构”的系统性问题。
- 输出最终结论：`ready to continue / needs focused rework / should stop and redesign`。

**状态**：completed
**结论**：ready to continue

> 注：这是第一轮 review 的阶段性结论；当前最新有效结论以第 13 节 Round 2 Block Z 为准。
> **Findings first**：

- `P0`：无。主架构方向没有发现需要推倒重来的阻塞：source identity、source-first search、sync outbox、rollback baseline 这四个核心边界都成立。
- `P1`：无。`quota / admin-storage` 的统计真相源、rollback/rehearsal 官方入口与 Step 7 hard gate 都已按 review 结论完成收口。
- `P2`：剩余低优先级项只剩 `SearchService` 职责略宽这一类可接受的后续优化，不阻塞二期继续执行。
  **补看的背景文件**：复核 `Block A ~ H` 全部主审文件，并再次对照 `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`、`docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`、`docs/design/anyhunt/core/system-boundaries-and-identity.md`、`apps/anyhunt/server/CLAUDE.md`、`apps/moryflow/server/CLAUDE.md`
  **下一步是否允许继续**：yes（允许继续；Block F / G / H 的 P1 已完成收口，后续只剩不阻塞执行的 P2 优化项）

## 9. 每个 Block 的回写模板

每完成一个 block，必须把下面内容直接回写到本文件对应小节，不另开临时记录：

- `状态`：`completed`
- `结论`：`pass / pass with follow-ups / rewrite required`
- `Findings first`：
  - `P0`：
  - `P1`：
  - `P2`：
- `补看的背景文件`：本次实际额外阅读了哪些相邻文件
- `下一块是否允许继续`：`yes / no`

## 10. 执行纪律

- 不按文件夹机械 review；只按链路和职责边界分块。
- 同一 block 内如果发现根因在别的 block，可以记录交叉引用，但不允许把问题留成“以后再看”。
- generated 文件只做一致性核验，不做样式级别 review。
- 删除类改动必须核对“代码删除 + 文档删除 + 类型删除 + migration 删除”四层是否闭环。
- 任何“看起来能跑”的结论，都必须有对应测试、脚本或文档事实源支撑。

## 11. 第一轮状态（历史记录，已被第二轮复审覆盖）

- `Block A ~ H + Block Z` 已全部完成正式回写。
- 本节仅保留第一轮 review 的历史记录。
- 当前最新有效结论以第 13 节第二轮深度复审为准：`needs focused rework`。
- 下一步不是直接继续实施，而是先集中收口第二轮暴露的跨块 P1。

## 12. 最终完成标准

只有同时满足以下条件，才允许声称“本轮大改动已经 review 完”：

- Block A ~ H 全部 `completed`。
- Block Z 已给出明确 `ready to continue / needs focused rework / should stop and redesign` 结论。
- 所有 `P0` 都已被消灭，或被明确判定为不存在。
- 所有 `P1` 都已经进入“已修复”或“已接受且有具体后续动作”的状态。
- 文档事实源、代码、测试、migration、脚本之间不存在互相冲突的口径。

在这之前，任何“已经 review 完”“可以放心开工/合并”的说法都无效。

## 13. 第二轮深度复审（2026-03-07 staged snapshot）

**目标**：基于当前“全量已暂存”的 Memox 二期版本，按模块与职责边界重新做一轮深度 code review；评判标准固定为“最佳实践、模块化、单一职责、无历史兼容包袱、允许重构”。

**基线**：

- 事实源固定为 `git diff --cached --name-only` 对应的 staged 版本，而不是工作区历史记忆。
- review 不只看 diff；每个 block 都必须补看相邻链路文件，确认边界是否真的闭环。
- 本轮结论优先回答“是否可以放心继续执行 / 直接开工”，而不是“是否比旧版本更好”。

**分块原则**：

- 只按职责边界分块，不按目录机械分块。
- 每块都要同时检查：公开协议、内部事实源、测试覆盖、模块装配、文档口径。
- 任意 block 若发现系统性缺陷，可直接在 `P0 / P1` 中要求跨块重构。

| Round 2 Block | 范围                           | 重点文件                                                                                              | 状态      |
| ------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------- | --------- |
| A             | Anyhunt source 写侧边界        | `apps/anyhunt/server/src/sources/*`                                                                   | completed |
| B             | Anyhunt 读侧合同与检索聚合     | `apps/anyhunt/server/src/retrieval/*` + `sources/search` 相关控制器                                   | completed |
| C             | Anyhunt 平台边界与门禁         | `api-key/`、`memory/`、`memox-platform/`、`quota/`、openapi/load-check 脚本                           | completed |
| D             | Moryflow 读链路                | `apps/moryflow/server/src/memox/*`、`src/search/*`                                                    | completed |
| E             | Moryflow 写链路与运行时装配    | `src/sync/*`、`src/app.module.ts`、`src/main.ts`、`auth/`、rehearsal 入口                             | completed |
| F             | 数据模型、migration 与旧栈下线 | Prisma schema/migration/generated、`src/vectorize/*` 删除、workspace 收口、admin-storage/quota 真相源 | completed |
| G             | 下游消费者合同                 | `apps/moryflow/pc/*`、`apps/moryflow/admin/*`、`packages/api/src/cloud-sync/types.ts`                 | completed |
| H             | 文档事实源一致性               | features/runbooks/core/CLAUDE/index 文档                                                              | completed |
| Z             | 全局回顾                       | 跨块一致性、P0/P1 是否清零                                                                            | completed |

### Round 2 Block A - Anyhunt source 写侧边界

**目标**：检查 source identity / source ingest / revision finalize / delete / chunk persistence 是否真的形成“单一事实源 + 单一职责”边界。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。`source-identities -> source -> revision -> finalize -> delete` 的公开写侧链路已经完整落在 Anyhunt `sources` 域内；控制器状态码、idempotency 包装与 repository 边界没有发现推倒重来的阻塞。
- `P1`：无。`KnowledgeSourceRevisionService.finalize()` 已重新收口为只接受 `READY_TO_FINALIZE | PENDING_UPLOAD`，`POST /source-revisions/:revisionId/reindex` 继续作为唯一公开 reindex 契约。
- `P2`：
  - `KnowledgeSourceRevisionService` 继续同时承担 guardrail、窗口限流、并发槽位、文本加载、chunking、embedding、graph enqueue、失败状态回写，已经是典型 orchestration god service；当前能跑，但如果 source ingest 再扩展，会很快失去单一职责。
  - `SourceChunkRepository.replaceRevisionChunks()` 仍按 chunk 逐条 raw insert；在大文档下会把写放大留在热路径里，后续最好收口成 repository 侧批量写入策略。
    **补看的背景文件**：`apps/anyhunt/server/src/sources/sources.module.ts`、`apps/anyhunt/server/src/sources/sources.controller.ts`、`apps/anyhunt/server/src/sources/source-identities.controller.ts`、`apps/anyhunt/server/src/sources/source-revisions.controller.ts`、`apps/anyhunt/server/src/sources/knowledge-source.service.ts`、`apps/anyhunt/server/src/sources/knowledge-source.repository.ts`、`apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`、`apps/anyhunt/server/src/sources/knowledge-source-revision.repository.ts`、`apps/anyhunt/server/src/sources/knowledge-source-deletion.service.ts`、`apps/anyhunt/server/src/sources/source-chunk.repository.ts`、`apps/anyhunt/server/src/sources/sources.types.ts`、`apps/anyhunt/server/src/sources/dto/sources.schema.ts`、`apps/anyhunt/server/src/sources/sources-mappers.utils.ts`、`apps/anyhunt/server/src/sources/sources-http.utils.ts`、`apps/anyhunt/server/src/sources/__tests__/source-identities.controller.spec.ts`、`apps/anyhunt/server/src/sources/__tests__/source-revisions.controller.spec.ts`、`apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts`、`apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts`、`docs/design/anyhunt/core/system-boundaries-and-identity.md`、`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
    **下一块是否允许继续**：yes

### Round 2 Block B - Anyhunt 读侧合同与检索聚合

**目标**：检查 `sources/search` / `retrieval/search` / export 边界是否遵守“Anyhunt 持有公开协议主权、聚合逻辑不下沉到 Moryflow”的冻结原则。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。`sources/search`、`retrieval/search` 与 `exports` 仍然由 Anyhunt server 持有公开协议主权，Moryflow 没有重新接管聚合语义。
- `P1`：无。`exports.create` 已冻结为 `{ memory_export_id }`，`RetrievalController` 与 `MemoryExportController` 也已把 Zod response schema 显式挂入 OpenAPI，公开合同重新回到单一事实源。
- `P2`：`SourceSearchService` 在 shortlist 后按 source 逐条调用 chunk window 查询，形成检索热路径上的 N+1；当前不构成架构阻塞，但如果后续 `top_k` 放大，会先在这里踩性能坑。
  **补看的背景文件**：`apps/anyhunt/server/src/retrieval/CLAUDE.md`、`apps/anyhunt/server/src/retrieval/retrieval.controller.ts`、`apps/anyhunt/server/src/retrieval/retrieval.module.ts`、`apps/anyhunt/server/src/retrieval/retrieval.service.ts`、`apps/anyhunt/server/src/retrieval/source-search.service.ts`、`apps/anyhunt/server/src/retrieval/source-search.repository.ts`、`apps/anyhunt/server/src/retrieval/memory-fact-search.service.ts`、`apps/anyhunt/server/src/retrieval/retrieval-score.utils.ts`、`apps/anyhunt/server/src/retrieval/dto/retrieval.schema.ts`、`apps/anyhunt/server/src/retrieval/retrieval.types.ts`、`apps/anyhunt/server/src/retrieval/__tests__/retrieval.controller.spec.ts`、`apps/anyhunt/server/src/retrieval/__tests__/retrieval.module.spec.ts`、`apps/anyhunt/server/src/retrieval/__tests__/source-search.service.spec.ts`、`apps/anyhunt/server/src/retrieval/__tests__/retrieval.service.spec.ts`、`apps/anyhunt/server/src/memory/memory-export.controller.ts`、`apps/anyhunt/server/src/memory/memory.service.ts`、`apps/anyhunt/server/src/memory/__tests__/memory-export.controller.spec.ts`、`apps/anyhunt/server/src/sources/sources.controller.ts`、`apps/anyhunt/server/src/openapi/openapi.service.ts`、`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`、`docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
  **下一块是否允许继续**：yes

### Round 2 Block C - Anyhunt 平台边界与门禁

**目标**：检查 `ApiKey / Memory / Quota / MemoxPlatform / OpenAPI gate` 是否形成清晰的协议边界与 fail-fast 门禁。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。`MemoxPlatformService` 的 ingest guardrails、`MemoryExportController` 的 idempotency 包装、以及 Step 7 load-check 脚本的 required path / status 校验都已经成形，没有发现立即阻塞启动的错误。
- `P1`：无。API Key cleanup 的 tenant teardown 已下沉到 `MemoxTenantTeardownService`，`ApiKeyModule <-> SourcesModule` 循环依赖已消失；Step 7 hard gate 也已升级为同时锁定 response schema 与运行时 payload 的真正 contract gate。
- `P2`：`QuotaController` 的鉴权自描述还不够完整：控制器注释仍有旧 `Authorization: Token <apiKey>` 口径，Swagger 也没有显式把 `/quota` 标注成 `apiKey` 安全方案。
  **补看的背景文件**：`apps/anyhunt/server/src/api-key/api-key.module.ts`、`apps/anyhunt/server/src/memory/memory-export.controller.ts`、`apps/anyhunt/server/src/memory/memory.service.ts`、`apps/anyhunt/server/src/memory/memory.repository.ts`、`apps/anyhunt/server/src/memory/utils/memory-json.utils.ts`、`apps/anyhunt/server/src/memox-platform/memox-platform.service.ts`、`apps/anyhunt/server/src/quota/quota.module.ts`、`apps/anyhunt/server/src/quota/quota.service.ts`、`apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.utils.ts`、`apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.ts`、`apps/anyhunt/server/src/memory/__tests__/memory-export.controller.spec.ts`、`docs/design/anyhunt/core/quota-and-api-keys.md`、`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
  **下一块是否允许继续**：yes

### Round 2 Block D - Moryflow 读链路

**目标**：检查 `Memox client / runtime config / search adapter / legacy rollback baseline / search controller` 是否模块边界清晰、能支撑“less is more”的读链路。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。Moryflow `/api/v1/search` 已经是明确的 Memox-backed gateway，`MemoxSearchAdapterService` 负责把 Anyhunt `sources/search` 结果映射回文件级合同，主读路径没有再落回旧 `vectorize` controller/service。
- `P1`：无。`MemoxRuntimeConfigService` 现只在显式启用 `legacy_vector_baseline` 时校验 `VECTORIZE_API_URL`；clean memox-only 部署已不再被 legacy URL 反向卡住。
- `P2`：
  - `SearchService` 仍然同时承担 backend 选择、legacy mapping、live `SyncFile` filter 三个职责，继续偏胖。
  - `SearchController` 还在 action 内手写 `SearchSchema.safeParse()`，没有走共享验证 pipe，和当前服务端控制器的统一模式不一致。
  - `MemoxClient` / `MemoxSearchAdapterService` 已支持 `requestId` 透传，但 `/api/v1/search` 入口没有把 `req.requestId` 一路带到 Anyhunt 出站请求，和当前服务端出站请求规范还有一处轻微脱节。
    **补看的背景文件**：`apps/moryflow/server/src/memox/memox.module.ts`、`apps/moryflow/server/src/memox/memox-runtime-config.service.ts`、`apps/moryflow/server/src/memox/memox-search-adapter.service.ts`、`apps/moryflow/server/src/memox/memox.client.ts`、`apps/moryflow/server/src/search/search.controller.ts`、`apps/moryflow/server/src/search/search.module.ts`、`apps/moryflow/server/src/search/search.service.ts`、`apps/moryflow/server/src/search/dto/search.dto.ts`、`apps/moryflow/server/src/memox/legacy-vector-search.client.ts`、`apps/moryflow/server/src/memox/CLAUDE.md`、`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
    **下一块是否允许继续**：yes

### Round 2 Block E - Moryflow 写链路与运行时装配

**目标**：检查 `sync -> outbox -> bridge -> drain -> cutover` 与 `app/main/auth/rehearsal` 装配是否保持单一职责与运行时可观测性。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。`sync commit -> file lifecycle outbox -> MemoxOutboxConsumerService` 的主写链已经闭环，rehearsal 入口也能直接验证 backfill / replay / drift-check 这一整条链路。
- `P1`：无。`MemoxOutboxConsumerService` 现只在显式 `legacy_vector_baseline` backend 下同步 legacy baseline；默认 memox 热路径已停止常驻双写。
- `P2`：
  - `MemoxOutboxConsumerService` 继续把事件解析、当前文件代际校验、source identity、revision create/finalize、identity materialize、legacy mirror、错误分类都塞在一个 service 里；它现在是可工作的 orchestrator，但已经明显宽于单一职责。
  - bootstrap 里仍有三层 body parser / raw body 装配（`AppModule`、`NestFactory.create({ rawBody: true })`、`main.ts` 再次 `app.use(json/urlencoded)`）；当前没看到功能性故障，但这是明显的阶段性/兼容性尾巴。
    **补看的背景文件**：`apps/moryflow/server/src/sync/file-lifecycle-outbox.service.ts`、`apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`、`apps/moryflow/server/src/memox/memox-source-bridge.service.ts`、`apps/moryflow/server/src/memox/memox-outbox-drain.service.ts`、`apps/moryflow/server/src/memox/memox-cutover.service.ts`、`apps/moryflow/server/src/app.module.ts`、`apps/moryflow/server/src/main.ts`、`apps/moryflow/server/src/auth/auth-social.controller.ts`、`apps/moryflow/server/scripts/memox-phase2-local-rehearsal.ts`、`apps/moryflow/server/package.json`、`apps/moryflow/server/.env.example`、`docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
    **下一块是否允许继续**：yes

### Round 2 Block F - 数据模型、migration 与旧栈下线

**目标**：检查 Prisma/schema/migration/generated/vectorize 删除/admin-storage-quota 真相源 是否闭环，不接受半删半留。

**状态**：completed
**结论**：pass with follow-ups
**Findings first**：

- `P0`：无。`VectorizedFile` / `UserStorageUsage.vectorizedCount` 的 `schema -> migration -> generated Prisma client` 删除是闭环的；`apps/moryflow/server/src/vectorize/*` 与独立 `apps/moryflow/vectorize/*` 的运行时代码也确实已经从主链去除。
- `P1`：无。`admin-storage` 已回到 live `Vault / SyncFile` 真相源；`quota` 仍然把 `UserStorageUsage` 当额度缓存，而不是继续冒充“向量化/活跃同步用户”事实源，这和当前主文档口径一致。
- `P2`：
  - `pnpm-lock.yaml` 还残留 `apps/moryflow/vectorize` importer，说明 workspace 元数据没有完全 refresh 到最干净状态。
  - 本地 worktree 里空目录 `apps/moryflow/server/src/vectorize/` 还在；虽然不会进 git，但如果目标是“物理删干净”，这一层也应一起清空。
    **补看的背景文件**：`apps/moryflow/server/prisma/schema.prisma`、`apps/moryflow/server/prisma/migrations/20260307060000_remove_vectorize_stack/migration.sql`、`apps/moryflow/server/prisma/migrations/20260307100000_add_file_lifecycle_outbox_dlq/migration.sql`、`apps/moryflow/server/prisma/migrations/20260306133500_add_file_lifecycle_outbox/migration.sql`、`apps/moryflow/server/prisma/migrations/20260306170000_add_file_lifecycle_outbox_lease_fields/migration.sql`、`apps/moryflow/server/generated/prisma/client.ts`、`apps/moryflow/server/generated/prisma/browser.ts`、`apps/moryflow/server/generated/prisma/models.ts`、`apps/moryflow/server/generated/prisma/models/User.ts`、`apps/moryflow/server/generated/prisma/models/UserStorageUsage.ts`、`apps/moryflow/server/generated/prisma/internal/class.ts`、`apps/moryflow/server/generated/prisma/internal/prismaNamespace.ts`、`apps/moryflow/server/generated/prisma/internal/prismaNamespaceBrowser.ts`、`apps/moryflow/server/src/admin-storage/admin-storage.controller.ts`、`apps/moryflow/server/src/admin-storage/admin-storage.module.ts`、`apps/moryflow/server/src/admin-storage/admin-storage.service.ts`、`apps/moryflow/server/src/admin-storage/admin-storage.service.spec.ts`、`apps/moryflow/server/src/admin-storage/dto/admin-storage.dto.ts`、`apps/moryflow/server/src/quota/quota.module.ts`、`apps/moryflow/server/src/quota/quota.controller.ts`、`apps/moryflow/server/src/quota/quota.config.ts`、`apps/moryflow/server/src/quota/quota.service.ts`、`apps/moryflow/server/src/quota/quota.service.spec.ts`、`apps/moryflow/server/src/quota/dto/quota.dto.ts`、`apps/moryflow/server/src/sync/file-lifecycle-outbox.service.ts`、`apps/moryflow/server/src/sync/sync-commit.service.ts`、`apps/moryflow/server/src/app.module.ts`、`apps/moryflow/server/src/testing/mocks/prisma.mock.ts`、`apps/moryflow/server/test/vitest.setup.ts`、`apps/moryflow/server/test/ai-proxy.e2e-spec.ts`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`
    **下一块是否允许继续**：yes

### Round 2 Block G - 下游消费者合同

**目标**：检查 PC cloud-sync、Admin storage、shared `packages/api` 合同是否已经完全切到 Memox 二期语义，没有把旧 vectorize/search 语义继续外溢。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。PC / Admin / shared package 已经切到文件级搜索与 storage/fileLimit/plan 用量合同，没有看到旧 `vectorized*` 语义继续外溢。
- `P1`：无。PC `cloud-sync` IPC 已改为把远端错误原样抛回 renderer；空数组/空值只由 renderer/hook 作为 UI 级降级语义持有，不再与真实服务异常混淆。
- `P2`：
  - PC shared IPC 仍手写了一份 `CloudUsageInfo` / `SemanticSearchResult` 镜像合同，和 `packages/api` 的搜索/usage 类型存在双事实源。
  - Admin 侧 `types/storage.ts` 也基本是服务端 DTO 的镜像类型；当前没错，但未来很容易和 server DTO 再次漂移。
    **补看的背景文件**：`apps/moryflow/pc/CLAUDE.md`、`apps/moryflow/admin/CLAUDE.md`、`packages/api/CLAUDE.md`、`packages/api/src/cloud-sync/types.ts`、`apps/moryflow/pc/src/main/cloud-sync/api/types.ts`、`apps/moryflow/pc/src/main/cloud-sync/api/client.ts`、`apps/moryflow/pc/src/main/cloud-sync/index.ts`、`apps/moryflow/pc/src/main/app/ipc-handlers.ts`、`apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`、`apps/moryflow/pc/src/shared/ipc/index.ts`、`apps/moryflow/pc/src/preload/index.ts`、`apps/moryflow/pc/src/renderer/hooks/use-cloud-sync.ts`、`apps/moryflow/pc/src/main/cloud-sync/sync-engine/__tests__/index.spec.ts`、`apps/moryflow/admin/src/types/storage.ts`、`apps/moryflow/admin/src/features/storage/api.ts`、`apps/moryflow/admin/src/features/storage/hooks.ts`、`apps/moryflow/admin/src/features/storage/const.ts`、`apps/moryflow/admin/src/features/storage/query-paths.ts`、`apps/moryflow/admin/src/features/storage/components/storage-stats-cards.tsx`、`apps/moryflow/admin/src/features/storage/components/user-storage-card.tsx`、`apps/moryflow/admin/src/features/storage/components/storage-stats-cards.test.tsx`、`apps/moryflow/admin/src/features/storage/components/user-storage-card.test.tsx`、`apps/moryflow/admin/src/pages/DashboardPage.tsx`、`apps/moryflow/admin/src/pages/DashboardPage.storage.test.tsx`、`apps/moryflow/server/src/admin-storage/dto/admin-storage.dto.ts`
    **下一块是否允许继续**：yes

### Round 2 Block H - 文档事实源一致性

**目标**：检查 features/runbooks/core/index/CLAUDE 是否与当前 staged 代码完全同源，是否已经达到“放心开工”的事实密度。

**状态**：completed
**结论**：pass with follow-ups
**Findings first**：

- `P0`：无。
- `P1`：无。入口索引、主文档、cutover runbook 与模块 `CLAUDE.md` 已重新对齐：`exports.create` 冻结为 `{ memory_export_id }`、Step 7 gate 现在同时锁 response schema/runtime payload、API Key 为 hash-only、legacy baseline 只在显式 rollback backend 下进入热路径。
- `P2`：
  - 主事实源虽然可执行，但仍偏“架构说明 + 实施计划 + 执行日志”三合一，不够轻量。
  - `docs/index.md`、`docs/CLAUDE.md`、模块 `CLAUDE.md` 同时维护动态阶段状态，摘要层重复过多，已经造成过一次漂移。
    **补看的背景文件**：`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`、`docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`、`docs/design/anyhunt/core/system-boundaries-and-identity.md`、`docs/design/anyhunt/core/quota-and-api-keys.md`、`docs/design/anyhunt/core/request-and-state-unification.md`、`docs/design/anyhunt/features/index.md`、`docs/design/anyhunt/runbooks/index.md`、`docs/index.md`、`docs/CLAUDE.md`、`apps/anyhunt/server/CLAUDE.md`、`apps/moryflow/server/CLAUDE.md`、`apps/moryflow/admin/CLAUDE.md`、`apps/moryflow/pc/CLAUDE.md`、`packages/api/CLAUDE.md`、`apps/anyhunt/server/prisma/main/schema.prisma`、`apps/anyhunt/server/src/api-key/api-key.service.ts`、`apps/moryflow/server/src/memox/memox-runtime-config.service.ts`、`apps/moryflow/server/src/memox/legacy-vector-search.client.ts`、`apps/moryflow/server/src/search/search.service.ts`、`apps/moryflow/server/src/sync/file-lifecycle-outbox.service.ts`
    **下一块是否允许继续**：yes

### Round 2 Block Z - 全局回顾

**目标**：在 A ~ H 全部完成后，重新检查跨块边界、运行时心智模型与文档事实源是否一致。

**状态**：completed
**结论**：ready to continue
**Findings first**：

- `P0`：无。当前 staged 版本没有发现必须推倒重来的致命架构错误。
- `P1`：无。Round 2 跨块阻塞项已完成集中收口：`exports.create`/`finalize`/OpenAPI contract 已冻结，tenant teardown 已下沉到 Memox 数据面，memox-only 默认热路径已去掉 legacy URL 与双写依赖，PC IPC 错误语义与文档事实源也已回正。
- `P2`：检索热路径 N+1、SearchService / OutboxConsumer 职责过宽、PC/Admin 双事实源类型、workspace/empty-dir 尾巴与过度状态化文档，都属于下一轮应继续清理的质量项。
  **补看的背景文件**：复核 Round 2 Block A ~ H 的全部主审文件，并再次对照 `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`、`docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`、`docs/design/anyhunt/core/system-boundaries-and-identity.md`、`apps/anyhunt/server/CLAUDE.md`、`apps/moryflow/server/CLAUDE.md`
  **下一步是否允许继续**：yes（跨块 P1 已收口，允许按冻结文档继续实施与验收）

**最新验证证据（2026-03-07 19:40 CST）**：

- PASS：`pnpm --filter @anyhunt/anyhunt-server exec vitest run src/api-key/__tests__/api-key-cleanup.service.spec.ts src/memory/__tests__/memory.service.spec.ts`
- PASS：`pnpm --filter @anyhunt/anyhunt-server typecheck`
- PASS：`pnpm --filter @moryflow/server typecheck`
- PASS：`pnpm --filter @moryflow/pc typecheck`
- PASS：`git diff --check && git diff --cached --check`

### Round 3 Follow-up - P2 收口批次 1

**目标**：在 Round 2 结论已经 `ready to continue` 的前提下，继续消掉热路径和事实源层面的高价值 P2，而不是停留在“能用但还宽”的状态。

**状态**：completed
**结论**：pass（剩余 follow-ups 已在批次 2 收口）
**Findings first**：

- `P0`：无。当前 staged 版本没有发现新的阻塞性架构问题。
- `P1`：无。Anyhunt retrieval 热路径、Memox outbox 投影边界、PC/Admin 类型事实源与 Step 7 文档状态板已经完成一轮集中收口。
- `P2`：批次 1 结束时的两项 follow-up 已在批次 2 收口完成：
  - `apps/moryflow/server/src/search/search.service.ts` 已拆成 `search-backend.service.ts` + `search-live-file-projector.service.ts`。
  - `apps/moryflow/server/src/sync/file-lifecycle-outbox.service.ts` 已拆成 `file-lifecycle-outbox-writer.service.ts` + `file-lifecycle-outbox-lease.service.ts` + `file-lifecycle-outbox.types.ts`。
    **补看的背景文件**：`apps/anyhunt/server/src/retrieval/retrieval.service.ts`、`apps/anyhunt/server/src/retrieval/source-search.repository.ts`、`apps/anyhunt/server/src/retrieval/source-search.service.ts`、`apps/anyhunt/server/src/retrieval/source-search.aggregator.ts`、`apps/moryflow/server/src/memox/memox-file-projection.service.ts`、`apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`、`apps/moryflow/server/src/memox/memox-cutover.service.ts`、`apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`、`apps/moryflow/admin/src/types/storage.ts`、`packages/api/src/admin-storage/types.ts`、`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`、`docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
    **最新验证证据（2026-03-07 20:19 CST）**：
- PASS：`pnpm --filter @anyhunt/anyhunt-server exec vitest run src/retrieval/__tests__/retrieval.controller.spec.ts src/retrieval/__tests__/retrieval.module.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/source-search.repository.spec.ts src/retrieval/__tests__/source-search.service.spec.ts src/retrieval/__tests__/source-search.aggregator.spec.ts`
- PASS：`pnpm --filter @anyhunt/anyhunt-server typecheck`
- PASS：`pnpm --filter @moryflow/server exec vitest run src/memox/memox-file-projection.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts src/memox/memox-outbox-consumer.processor.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-cutover.service.spec.ts`
- PASS：`pnpm --filter @moryflow/server typecheck`
- PASS：`pnpm --filter @moryflow/api build`
- PASS：`pnpm --filter @moryflow/pc exec vitest run src/main/app/cloud-sync-ipc-handlers.test.ts && pnpm --filter @moryflow/pc typecheck`
- PASS：`pnpm --filter @moryflow/admin exec vitest run src/features/storage/query-paths.test.ts src/pages/DashboardPage.storage.test.tsx && pnpm --filter @moryflow/admin typecheck`
- PASS：`git diff --check && git diff --cached --check`

### Round 3 Follow-up - P2 收口批次 2

**目标**：完成上一批次留下的最后两项结构性 P2，把 Moryflow 搜索应用层与 Sync outbox 状态机都收口到清晰、可长期维护的职责边界。

**状态**：completed
**结论**：pass
**Findings first**：

- `P0`：无。最新 staged 版本没有新的阻塞性问题。
- `P1`：无。搜索主链路、outbox lease state machine、consumer 注入链都已与当前文档事实源对齐。
- `P2`：无。上一批次遗留的 `SearchService` 过宽与 outbox writer/lease 混杂问题已经收口完成。
  **补看的背景文件**：`apps/moryflow/server/src/search/search.service.ts`、`apps/moryflow/server/src/search/search-backend.service.ts`、`apps/moryflow/server/src/search/search-live-file-projector.service.ts`、`apps/moryflow/server/src/search/search.module.ts`、`apps/moryflow/server/src/search/search.service.spec.ts`、`apps/moryflow/server/src/search/search-backend.service.spec.ts`、`apps/moryflow/server/src/search/search-live-file-projector.service.spec.ts`、`apps/moryflow/server/src/sync/file-lifecycle-outbox.types.ts`、`apps/moryflow/server/src/sync/file-lifecycle-outbox-writer.service.ts`、`apps/moryflow/server/src/sync/file-lifecycle-outbox-lease.service.ts`、`apps/moryflow/server/src/sync/sync-commit.service.ts`、`apps/moryflow/server/src/sync/sync-internal-outbox.controller.ts`、`apps/moryflow/server/src/sync/sync.module.ts`、`apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`、`apps/moryflow/server/src/memox/memox-outbox-consumer.service.spec.ts`、`apps/moryflow/server/src/memox/memox-outbox-consumer.di.spec.ts`、`apps/moryflow/server/src/sync/CLAUDE.md`、`apps/moryflow/server/CLAUDE.md`、`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
  **最新验证证据（2026-03-07 20:42 CST）**：
- PASS：`pnpm --filter @moryflow/server exec vitest run src/search/search.service.spec.ts src/search/search-backend.service.spec.ts src/search/search-live-file-projector.service.spec.ts src/search/search.controller.spec.ts src/sync/file-lifecycle-outbox-writer.service.spec.ts src/sync/file-lifecycle-outbox-lease.service.spec.ts src/sync/sync.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts src/memox/memox-outbox-consumer.processor.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-cutover.service.spec.ts`
- PASS：`pnpm --filter @moryflow/server typecheck`
- PASS：`git diff --check && git diff --cached --check`
