# Memox Module

> Warning: When this folder structure changes, you MUST update this document

## Position

`memox/` 是 Moryflow Server 对接 Anyhunt Memox 公网 API 的唯一网关层。

固定边界：

- 上游真相源：`sync/` 的 `file lifecycle outbox`
- 下游平台：Anyhunt `source-identities / sources / source-revisions`
- 本模块职责：身份映射、幂等键族、错误翻译、outbox bridge、source-first 搜索 DTO 适配与 cutover 控制

## Responsibilities

**Does:**

- `MemoxClient`：统一 Anyhunt 公网 API 调用、服务 API Key、超时、`X-Request-Id`、RFC7807 错误翻译
- `MemoxSourceBridgeService`：集中维护 `userId/vaultId/fileId/path -> source identity/search request` 映射
- `MemoxSearchAdapterService`：把平台 `sources/search` 结果适配成 Moryflow 文件搜索合同
- `MemoxOutboxConsumerService`：消费 `sync` outbox claim/ack，桥接 `resolve identity -> revision create -> finalize/delete`
- `MemoxOutboxConsumerProcessor`：Bull worker，执行周期性 drain job
- `MemoxOutboxDrainService`：固定节奏把 outbox backlog 送入 queue
- `MemoxCutoverService`：backfill / replay / 搜索投影验证控制面
- `MemoxRuntimeConfigService`：冻结 Anyhunt 接入配置并在启动期 fail-fast 校验

**Does NOT:**

- 直接读取 PC 临时状态
- 维护第二套平台级 retrieval 语义
- 承接 `Memory Workbench` 的 `overview / search / facts / graph / exports` gateway 合同
- 以 `source_id` 建本地长期事实表
- 直接决定 PC UI 展示细节

## Member List

| File                                 | Type      | Description                            |
| ------------------------------------ | --------- | -------------------------------------- |
| `memox.client.ts`                    | Service   | Anyhunt Memox 公网 API 客户端          |
| `memox-source-bridge.service.ts`     | Service   | source identity/search/lifecycle 映射  |
| `memox-search-adapter.service.ts`    | Service   | 文件搜索 DTO 适配                      |
| `memox-outbox-consumer.service.ts`   | Service   | outbox -> source lifecycle bridge      |
| `memox-outbox-consumer.processor.ts` | Processor | Bull drain worker                      |
| `memox-outbox-drain.service.ts`      | Service   | 周期性 enqueue drain job               |
| `memox-cutover.service.ts`           | Service   | backfill / replay / 搜索投影验证控制面 |
| `memox-runtime-config.service.ts`    | Service   | Anyhunt 接入配置事实源                 |
| `dto/memox.dto.ts`                   | Schema    | Memox 网关 DTO                         |
| `memox.module.ts`                    | Module    | NestJS 模块与 queue wiring             |
| `index.ts`                           | Export    | 公共导出                               |

## Invariants

1. 文件写链路固定走 `sync outbox -> memox bridge`，禁止绕过 outbox 直接写 Memox。
2. 稳定文件身份固定是 `source_type + external_id`；`source_id` 只属于平台资源 ID。
3. rename-only 事件固定先刷新 source identity；若 Memox 当前 revision 已与文件代际对齐，则只跳过 Memox 侧 revision/finalize。
4. 正文读取固定按 `userId + vaultId + fileId + storageRevision` 拉取，并再次校验 `contentHash`。
5. delete 缺源固定按 no-op success 处理；`404`、`SOURCE_IDENTITY_TITLE_REQUIRED` 与 `409 SOURCE_IDENTITY_DELETED` 都不得阻塞 replay。
6. `file_deleted` resolve identity 时必须重复提交 frozen scope（至少 `user_id + project_id + external_id`）；禁止对已存在 source identity 用空 body resolve，否则 Anyhunt 会返回 `SOURCE_IDENTITY_SCOPE_MISMATCH`。
7. 当前仓库中的 source-first 文件搜索仍固定走 `POST /api/v1/sources/search`，并且固定下推 `source_types=['note_markdown']`；它只作为 cutover 前基线存在，不是 `Memory Workbench` 的正式长期合同。
8. backfill 必须复用 `MemoxOutboxConsumerService.upsertFile()`，checkpoint 固定写入 `memox:phase2:backfill-state`。
9. changed upsert 固定按“稳定 identity -> revision create/finalize -> metadata materialize”三段执行；已对齐 revision 不得重复 finalize。
10. `MemoxRuntimeConfigService` 在模块启动期固定 fail-fast 校验 `ANYHUNT_API_BASE_URL / ANYHUNT_API_KEY / ANYHUNT_REQUEST_TIMEOUT_MS`；`ANYHUNT_API_BASE_URL` 固定要求 origin-only，不得把缺配或明显误配拖到首个用户请求。
11. outbox retry / DLQ 的事实源固定在 `FileLifecycleOutbox`：`attemptCount / lastAttemptAt / lastErrorCode / lastErrorMessage / deadLetteredAt`；每次 claim 都必须生成独立 lease owner，ack/fail 固定校验当前 lease owner，而不是复用共享 `consumerId`；poison、确定性 `4xx` 或最终失败事件必须进 DLQ，不能无限 lease 重试；失败状态若落库失败，batch 必须向上抛错交给 Bull retry。
12. `replayOutbox().drained` 是全局 backlog 指示位；单 vault rehearsal 是否通过必须结合 `claimed / acknowledged / failedIds / deadLetteredIds` 与 vault 自身 outbox 状态判断，不能把 `drained=false` 直接解释为当前 vault 失败。
13. Moryflow 文件搜索固定只走 Anyhunt Memox；仓库内不再保留第二套搜索后端或独立旧基线路径。

## Refactor Notes

- 不要把 source identity 映射散落回 `sync/`、`search/` 或其他历史模块。
- 不要在 gateway 层重建排序或把 `title/snippet` 当身份字段。
- 不要把重试语义建立在 message 文本匹配上；必须依赖结构化 code。
- 若后续需要 backfill/replay，继续复用本模块的 consumer/adapter/idempotency 事实源，不另起私有脚本协议。
- 不要恢复旧 `vectorize` worker / projection / quota 栈；故障处理只能停 ack、修复合同、再做 backfill/replay/验证，不引入第二套搜索后端。
- `Memory Workbench` 的长期合同必须落在独立 `memory gateway`，不要继续把 PC Memory UI 能力塞回本目录。
