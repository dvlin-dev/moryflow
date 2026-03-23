# Memox Module

> Warning: When this folder structure changes, you MUST update this document

## Position

`memox/` 是 Moryflow Server 对接 Anyhunt Memox 的唯一 gateway。

固定边界：

- 上游真相源：`workspace-content/` 的 `WorkspaceContentOutbox`
- 下游平台：Anyhunt `source-identities / sources / source-revisions / sources/search`
- 本模块职责：source contract、workspace content 投影、幂等键族、错误翻译、search DTO 适配、direct drain、自愈调度与内部 replay/rebuild 控制面

## Responsibilities

**Does:**

- `MemoxClient`：统一 Anyhunt 公网 API 调用、服务 API Key、超时与 RFC7807 错误翻译
- `MemoxSourceBridgeService`：集中维护 `userId/workspaceId/documentId/path -> source identity/search request` 映射
- `MemoxWorkspaceContentProjectionService`：把 `workspace content` upsert/delete 事件投影为 `lookup identity -> stable identity resolve -> revision create/finalize` 或 `lookup identity -> delete`；`no indexable text` 固定走 quiet skip/delete existing source
- `MemoxWorkspaceContentConsumerService`：消费 `WorkspaceContentOutbox` claim/ack，负责 retry / DLQ / poison 判断
- `MemoxWorkspaceContentDrainService`：固定节奏直接执行 bounded outbox drain，依赖 database lease 推进 backlog
- `MemoxWorkspaceContentReconcileService`：基于 canonical document state、outbox backlog 与远端 source existence 做后台自愈补偿
- `MemoxWorkspaceContentReconcileScheduler`：固定周期触发 reconcile
- `MemoxTelemetryService`：聚合 memox ingestion telemetry、backlog/DLQ 语义指标与周期性结构化日志
- `MemoxInternalMetricsController`：暴露 `GET /internal/metrics/memox`
- `MemoxWorkspaceContentControlService`：统一 redrive dead letters、replay outbox 与 canonical rebuild
- `MemoxWorkspaceContentControlController`：暴露 `POST /internal/sync/memox/workspace-content/replay|rebuild`
- `MemoxSearchAdapterService`：把平台 `sources/search` 结果适配成 Moryflow 文件搜索合同
- `MemoxRuntimeConfigService`：冻结 Anyhunt 接入配置并在启动期 fail-fast 校验

**Does NOT:**

- 消费旧 `sync file lifecycle outbox`
- 维护旧 `note_markdown + vaultId + fileId` 合同
- 承接 `Memory Workbench` 的 `overview / facts / graph / exports` gateway 合同
- 直接依赖 PC 本地状态或旧 `binding-conflict` 语义
- 在 gateway 层维护第二套平台级检索编排

## Member List

| File                                             | Type       | Description                                   |
| ------------------------------------------------ | ---------- | --------------------------------------------- |
| `memox.client.ts`                                | Service    | Anyhunt Memox 公网 API 客户端                 |
| `memox-source-contract.ts`                       | Schema     | `moryflow_workspace_markdown_v1` 合同          |
| `memox-workspace-content.constants.ts`           | Constants  | drain / replay 共享默认参数                   |
| `memox-source-bridge.service.ts`                 | Service    | source identity/search 映射                   |
| `memox-workspace-content-projection.service.ts`  | Service    | workspace content -> source lifecycle 投影    |
| `memox-workspace-content-consumer.service.ts`    | Service    | outbox claim/ack / retry / DLQ                |
| `memox-workspace-content-drain.service.ts`       | Service    | 周期性 direct drain                           |
| `memox-workspace-content-reconcile.service.ts`   | Service    | canonical 文档集后台自愈补偿                  |
| `memox-workspace-content-reconcile.scheduler.ts` | Scheduler  | 周期性 reconcile 调度                         |
| `memox-telemetry.service.ts`                     | Service    | Memox ingestion telemetry                     |
| `memox-internal-metrics.controller.ts`           | Controller | 内部 metrics 端点                             |
| `memox-workspace-content-control.service.ts`     | Service    | dead-letter redrive + outbox replay + rebuild |
| `memox-workspace-content-control.controller.ts`  | Controller | replay / rebuild 控制面                       |
| `memox-search-adapter.service.ts`                | Service    | 文件搜索 DTO 适配                             |
| `memox-runtime-config.service.ts`                | Service    | Anyhunt 接入配置事实源                        |
| `dto/memox.dto.ts`                               | Schema     | Memox 网关 DTO                                |
| `dto/memox-control.dto.ts`                       | Schema     | replay 控制面 DTO                             |
| `memox.module.ts`                                | Module     | NestJS 模块与 direct drain wiring             |
| `index.ts`                                       | Export     | 公共导出                                      |

## Invariants

1. 文件写链路固定走 `workspace content -> WorkspaceContentOutbox -> memox consumer`，禁止绕过 outbox 直接写 Memox。
2. 稳定 source contract 固定为：
   - `source_type = moryflow_workspace_markdown_v1`
   - `project_id = workspaceId`
   - `external_id = documentId`
3. `source_id` 只属于 Anyhunt 平台资源 ID；Moryflow 稳定身份始终回到 `source_type + external_id`。
4. upsert payload 固定支持两种模式：
   - `inline_text`
   - `sync_object_ref`
5. `sync_object_ref` 读取正文时，固定按 `userId + vaultId + fileId + storageRevision` 拉取对象快照，并再次校验 `contentHash`。
6. delete 缺源固定按 no-op success 处理；delete lookup 必须走只读 source identity 查询，`404` 与 `409 SOURCE_IDENTITY_DELETED` 都不得阻塞 replay。
7. 当前仓库中的 source-first 文件搜索固定走 `POST /api/v1/sources/search`，并且固定下推 `source_types=['moryflow_workspace_markdown_v1']`。
8. outbox retry / DLQ 的事实源固定在 `WorkspaceContentOutbox`：`attemptCount / lastAttemptAt / lastErrorCode / lastErrorMessage / deadLetteredAt`；每次 claim 都必须生成独立 lease owner。
9. `MemoxWorkspaceContentDrainService` 只负责按固定节奏调用 consumer 做 bounded direct drain；不得重新引入第二条 queue delivery 依赖。
10. poison、确定性 `4xx` 或最终失败事件必须进入 DLQ，不能无限 lease 重试。
11. `schema parse` / payload 结构校验失败属于 poison message，必须首次处理即进入 DLQ，不能走可重试路径。
12. `MemoxRuntimeConfigService` 在模块启动期固定 fail-fast 校验 `ANYHUNT_API_BASE_URL / ANYHUNT_API_KEY / ANYHUNT_REQUEST_TIMEOUT_MS`；禁止把缺配拖到首个用户请求。
13. memox telemetry 的唯一内部观测端点固定为 `GET /internal/metrics/memox`，必须受 `InternalApiTokenGuard` 保护。
14. workspace-content replay / DLQ redrive 的唯一内部控制面固定为 `POST /internal/sync/memox/workspace-content/replay`，不得直接手写 SQL 改 lease / dead-letter 状态。
15. canonical 全量补建的唯一内部入口固定为 `POST /internal/sync/memox/workspace-content/rebuild`；它必须从 `WorkspaceDocument/currentRevision` 全量分页扫描，而不是只取前 N 条默认样本。
16. `metadata.content_hash / storage_revision` 属于 revision lifecycle metadata；只能在对应 revision finalize 成功后 materialize 回 source identity，不能在 stable identity resolve 阶段提前写入。
17. “内容未变化”判定必须基于 resolve 前的只读 identity lookup 结果，不能读取本次 resolve 刚写回的 metadata。
18. 当当前 canonical 状态的投影成功落地后，consumer 必须把同 document 上已过时的 unresolved outbox 行收敛为 processed no-op；projection backlog 不能长期被 superseded dead letters 卡住。
19. superseded unresolved 行的收敛只能作用于“无活跃 lease”的记录；consumer 不得清空其他实例或同批次尚未处理事件的有效 lease。
20. `WorkspaceContentLeaseLostError` 属于并发 race 信号，不得作为 replay failure 暴露到 `failedIds`；控制面只能把已成功持久化为 retry / dead-letter 的真实处理失败返回给操作者。

## Refactor Notes

- 不要把 source identity 映射散落回 `sync/`、`workspace-content/` 或其他模块。
- 不要恢复旧 `sync outbox -> memox`、`note_markdown` 或 `vaultId` scope 语义。
- 不要在 gateway 层重建排序，也不要把 `title/snippet/path` 当身份字段。
- delete 路径不得再复用 resolve / upsert；缺源 no-op 必须建立在只读 lookup 合同上。
- 不要把 drain / replay 的默认参数重新散落回多个服务；统一复用 `memox-workspace-content.constants.ts`。
- 不要把 rebuild 做成“只扫前 500 个文档”的样子货；默认语义必须是当前 canonical documents 的全量补建。
- `Memory Workbench` 的长期合同必须继续落在独立 `memory/` gateway，不要把 PC Memory UI 能力塞回本目录。
