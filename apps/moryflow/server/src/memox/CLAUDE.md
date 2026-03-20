# Memox Module

> Warning: When this folder structure changes, you MUST update this document

## Position

`memox/` 是 Moryflow Server 对接 Anyhunt Memox 的唯一 gateway。

固定边界：

- 上游真相源：`workspace-content/` 的 `WorkspaceContentOutbox`
- 下游平台：Anyhunt `source-identities / sources / source-revisions / sources/search`
- 本模块职责：source contract、workspace content 投影、幂等键族、错误翻译、search DTO 适配与 drain worker

## Responsibilities

**Does:**

- `MemoxClient`：统一 Anyhunt 公网 API 调用、服务 API Key、超时与 RFC7807 错误翻译
- `MemoxSourceBridgeService`：集中维护 `userId/workspaceId/documentId/path -> source identity/search request` 映射
- `MemoxWorkspaceContentProjectionService`：把 `workspace content` upsert/delete 事件投影为 `resolve identity -> revision create -> finalize/delete`
- `MemoxWorkspaceContentConsumerService`：消费 `WorkspaceContentOutbox` claim/ack，负责 retry / DLQ / poison 判断
- `MemoxWorkspaceContentConsumerProcessor`：Bull worker，执行 drain job
- `MemoxWorkspaceContentDrainService`：固定节奏 enqueue `workspace content` drain
- `MemoxSearchAdapterService`：把平台 `sources/search` 结果适配成 Moryflow 文件搜索合同
- `MemoxRuntimeConfigService`：冻结 Anyhunt 接入配置并在启动期 fail-fast 校验

**Does NOT:**

- 消费旧 `sync file lifecycle outbox`
- 维护旧 `note_markdown + vaultId + fileId` 合同
- 承接 `Memory Workbench` 的 `overview / facts / graph / exports` gateway 合同
- 直接依赖 PC 本地状态或旧 `binding-conflict` 语义
- 在 gateway 层维护第二套平台级检索编排

## Member List

| File                                      | Type      | Description                                  |
| ----------------------------------------- | --------- | -------------------------------------------- |
| `memox.client.ts`                         | Service   | Anyhunt Memox 公网 API 客户端                |
| `memox-source-contract.ts`                | Schema    | `moryflow_workspace_markdown_v1` 合同与队列名 |
| `memox-source-bridge.service.ts`          | Service   | source identity/search 映射                  |
| `memox-workspace-content-projection.service.ts` | Service | workspace content -> source lifecycle 投影   |
| `memox-workspace-content-consumer.service.ts`   | Service | outbox claim/ack / retry / DLQ               |
| `memox-workspace-content-consumer.processor.ts` | Processor | Bull drain worker                           |
| `memox-workspace-content-drain.service.ts`      | Service | 周期性 enqueue drain job                    |
| `memox-search-adapter.service.ts`         | Service   | 文件搜索 DTO 适配                            |
| `memox-runtime-config.service.ts`         | Service   | Anyhunt 接入配置事实源                       |
| `dto/memox.dto.ts`                        | Schema    | Memox 网关 DTO                               |
| `memox.module.ts`                         | Module    | NestJS 模块与 queue wiring                   |
| `index.ts`                                | Export    | 公共导出                                     |

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
6. delete 缺源固定按 no-op success 处理；`404`、`SOURCE_IDENTITY_TITLE_REQUIRED` 与 `409 SOURCE_IDENTITY_DELETED` 都不得阻塞 replay。
7. 当前仓库中的 source-first 文件搜索固定走 `POST /api/v1/sources/search`，并且固定下推 `source_types=['moryflow_workspace_markdown_v1']`。
8. outbox retry / DLQ 的事实源固定在 `WorkspaceContentOutbox`：`attemptCount / lastAttemptAt / lastErrorCode / lastErrorMessage / deadLetteredAt`；每次 claim 都必须生成独立 lease owner。
9. poison、确定性 `4xx` 或最终失败事件必须进入 DLQ，不能无限 lease 重试。
10. `schema parse` / payload 结构校验失败属于 poison message，必须首次处理即进入 DLQ，不能走可重试路径。
11. `MemoxRuntimeConfigService` 在模块启动期固定 fail-fast 校验 `ANYHUNT_API_BASE_URL / ANYHUNT_API_KEY / ANYHUNT_REQUEST_TIMEOUT_MS`；禁止把缺配拖到首个用户请求。

## Refactor Notes

- 不要把 source identity 映射散落回 `sync/`、`workspace-content/` 或其他模块。
- 不要恢复旧 `sync outbox -> memox`、`note_markdown` 或 `vaultId` scope 语义。
- 不要在 gateway 层重建排序，也不要把 `title/snippet/path` 当身份字段。
- `Memory Workbench` 的长期合同必须继续落在独立 `memory/` gateway，不要把 PC Memory UI 能力塞回本目录。
