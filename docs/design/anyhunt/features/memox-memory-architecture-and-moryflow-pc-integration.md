---
title: Anyhunt Memox Memory 架构审计与 Moryflow Server/PC 接入方案（已确认版）
date: 2026-03-06
scope: apps/anyhunt/server/src/memory, apps/anyhunt/server/src/entity, apps/moryflow/server, apps/moryflow/pc
status: active
---

<!--
[INPUT]: Anyhunt Memory 开放 API 目标、Moryflow Server + PC 接入诉求、已确认的产品决策
[OUTPUT]: 代码级架构审计结论、问题修复方案、Server-first 接入蓝图与分阶段落地计划
[POS]: Anyhunt Features / Memox Memory 架构事实源（已确认版）

[PROTOCOL]: 本文件变更需同步更新 `docs/design/anyhunt/features/index.md` 与 `docs/index.md`。
-->

# Anyhunt Memox Memory 架构审计与 Moryflow Server/PC 接入方案

## 0. 审计边界

## 0.1 事实源

1. Anyhunt Server：
   - `apps/anyhunt/server/src/memory/*`
   - `apps/anyhunt/server/src/entity/*`
   - `apps/anyhunt/server/src/embedding/*`
   - `apps/anyhunt/server/src/api-key/*`
   - `apps/anyhunt/server/src/billing/*`
   - `apps/anyhunt/server/prisma/main/schema.prisma`
   - `apps/anyhunt/server/prisma/vector/schema.prisma`
2. Anyhunt Console（Playground 调用链）：
   - `apps/anyhunt/console/src/features/memox/api.ts`
   - `apps/anyhunt/console/src/features/playground-shared/api-key-client.ts`
3. Moryflow PC（secret / IPC / store/methods/api 参考）：
   - `apps/moryflow/pc/src/main/channels/telegram/secret-store.ts`
   - `apps/moryflow/pc/src/main/membership-token-store.ts`
   - `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
   - `apps/moryflow/pc/src/preload/index.ts`

## 0.2 当前状态（2026-03-06，阶段 A 收口后）

二次审查发现的代码/文档剩余问题已全部闭环，当前实现口径如下：

1. Anyhunt Console 已完成 `plainKey/keyPreview + 浏览器本地明文副本` 契约切换。
2. Export 已改为 `Readable.from(async generator) + R2 uploadStream` 的真正流式导出。
3. Entity `total_memories` 已补齐过期过滤，与 memory list/search 默认语义一致。
4. `ApiKey.keyHash` 冗余普通索引已删除，仅保留唯一索引。
5. 文档、索引、CLAUDE 与验证记录已按真实执行结果回写。
6. 所有直连公网 API 的 Playground / Webhooks / Agent Browser 已统一按 `hasUsableKey` 门禁；active 但本地无明文时仅展示 `keyPreview` 并提示 rotate。

当前仅剩 `memory/entity` integration 的运行验证受环境阻断（本地无 container runtime，且 worktree 内无 `apps/anyhunt/server/.env` 可直连线上环境）；这不影响阶段 A 的实现收口，但会影响“已完成验收”的严格表述。

---

## 1. 已确认决策（本次冻结）

以下决策已确认，不再作为待讨论项：

1. 接入路径改为 **Moryflow Server First**：
   - Moryflow Server 作为 Memox 网关接入 Anyhunt API。
   - Moryflow PC 不再直接持有/调用 Anyhunt API Key。
2. API Key 安全升级：
   - Anyhunt 改为 hash-only 存储（不再存明文 keyValue）。
   - Console Playground 采用“创建时一次性拿明文 + 本地 keyring”方案（见第 4 节）。
3. 文档口径收敛：
   - 按当前实现收口，使用 `apiKeyId + user_id/agent_id/app_id/run_id/org_id/project_id`。
   - 不引入 `namespace + externalUserId` 兼容口径。
4. 同步策略：
   - 首版支持“离线可写，在线补偿同步”。
5. 用户绑定：
   - `user_id` 强制绑定 Moryflow 云账号 ID，不允许本地匿名 ID。
6. Graph 决策：
   - 首版不上独立 graph query API；二期再补（理由见 3.3）。
7. 发布时间：
   - 暂无外售发布日期，优先完成 Moryflow Server + PC 全接入并完成验证。

---

## 2. 当前架构（代码口径）

## 2.1 能力面

1. Memory：`create/list/search/get/update/delete/history/batch/feedback/export`。
2. Entity：`users/agents/apps/runs` 注册与列表。
3. Embedding：OpenAI 兼容 embedding，固定 1536 维。
4. 隔离：向量库按 `apiKeyId` 软隔离。
5. 计费：`memox.memory.create/search` 走 billing + quota。

## 2.2 API 面（`/api/v1`）

1. `POST/GET/DELETE /memories`
2. `POST /memories/search`
3. `GET/PUT/DELETE /memories/:memoryId`
4. `GET /memories/:memoryId/history`
5. `GET /memories/:entityType/:entityId`
6. `PUT/DELETE /batch`
7. `POST /feedback`
8. `POST /exports` + `POST /exports/get`
9. `GET /entities` + `GET /entities/filters` + `POST /users|agents|apps|runs`

---

## 3. 问题清单与修复方案（已执行）

## 3.1 P0（必须先改）

1. API Key 明文存储
   - 根因：`ApiKey.keyValue` 明文入库，列表接口返回明文。
   - 方案：
     - 数据库改 `keyHash`（SHA256）+ `keyPrefix` + `keyTail`，移除 `keyValue`。
     - `validateKey` 改为 hash 匹配。
     - list 仅返回掩码（如 `ah_****abcd`）。
     - 由于当前无真实用户，允许直接重置历史 API Key。

2. 向量/过滤索引不足
   - 根因：无向量 ANN 索引与 JSON/数组 GIN 索引。
   - 方案：
     - `Memory.embedding` 新增 pgvector ivfflat 或 hnsw 索引。
     - `metadata` 加 GIN（jsonb_path_ops）。
     - `categories`、`keywords` 加 GIN。

3. `expiration_date` 未生效
   - 根因：写入了 `expirationDate`，查询链路没过滤过期。
   - 方案：
     - 在 `MemoryFilterBuilder.buildWhereSql` 统一追加：
       - `("expirationDate" IS NULL OR "expirationDate" > NOW())`。

4. 写操作一致性不足（非事务）
   - 根因：`Memory` 与 `MemoryHistory` 分步写，失败时可能部分成功。
   - 方案：
     - `create/update/delete/batch/export` 统一收敛到 `vectorPrisma.$transaction`。

5. Export 契约与执行不一致
   - 根因：`ExportCreateSchema.schema` 存档不生效，且导出同步阻塞。
   - 方案：
     - 首版直接收敛：移除无效 `schema` 参数（零兼容）。
     - 导出改队列异步任务，分页流式写 R2。

6. 缺少 API 回归测试
   - 方案：
     - 增加 Memory/Entity e2e：create/search/list/delete/history/entities。
     - 增加 filter builder 边界单测。

7. Console API Key / Playground 契约漂移
   - 根因：服务端已改为 `plainKey/keyPreview`，但 Console `api-keys` feature 与多个 Playground 页面仍依赖 `key` 明文字段。
   - 方案：
     - Console 类型、hooks、页面与 Playground selector 全量切到新契约。
     - 创建后一次性消费 `plainKey`，列表只展示/复制本地保存的明文或 `keyPreview`。
     - 增加本地 keyring/store，保证 Playground 仍可直接调用开放 API。
8. Playground 可用性判定错误
   - 根因：部分页面把“存在 active key”误当成“拥有可用明文 key”，会在本地明文丢失后错误放行请求。
   - 方案：
     - 统一通过 `resolveActiveApiKeySelection().hasUsableKey` 控制提交/查询。
     - 共享 `ApiKeySelector` 在 active 但无本地明文时统一提示 rotate。

## 3.2 P1（紧随其后）

1. 实体 N+1
   - 根因：`EntityService.listEntities` 对每个实体单独 `memory.count`。
   - 方案：改 group 聚合统计。

2. Query 参数兼容
   - 根因：`categories/fields` 仅数组签名。
   - 方案：兼容 `string | string[]`。

3. 扣费声明分散
   - 根因：Controller 有 `@BillingKey`，service 也手写扣费。
   - 方案：统一只保留一种扣费入口。

4. 文档口径漂移
   - 方案：更新 core 文档到当前实现字段体系，移除 `namespace/externalUserId` 约束。

5. Export 实现未完全达到设计目标
   - 根因：当前实现仍将分页结果拼接为单个 `Buffer` 后上传，导出内存占用与队列超时风险仍然存在。
   - 方案：
     - 将 export payload 生成收敛为真正的流式写入或分块上传路径。
     - 对导出队列设置独立超时/重试策略，不复用抓取类默认值。

6. Entity 聚合语义未与查询面一致
   - 根因：`total_memories` 聚合 SQL 未追加 `expirationDate` 过滤，与 memory list/search 结果口径不同。
   - 方案：在聚合 SQL 中补齐过期过滤，统一“默认仅统计未过期 memory”语义。

7. API Key 索引冗余
   - 根因：`keyHash` 已有唯一索引，又额外增加普通索引，产生重复维护成本。
   - 方案：删除冗余普通索引，仅保留唯一索引。

## 3.3 Graph 决策（确认）

1. 首版不做 graph query API。
2. 保留 `enable_graph` 写入能力（可选）。
3. 二期再做服务端 graph query（避免首版扩大接口面和维护成本）。

---

## 4. API Key hash-only 后 Console Playground 方案（已确定）

## 4.1 目标

1. 服务端不保存明文 key。
2. Playground 仍可直接调用开放 API。

## 4.2 交互与数据方案

1. 创建 Key（`POST /api/v1/app/api-keys`）：
   - 返回一次性明文 `plainKey`（仅本次响应）。
2. 列表 Key（`GET /api/v1/app/api-keys`）：
   - 返回 `id/name/isActive/lastUsedAt/expiresAt/keyPreview`，不返回明文。
3. Playground Key 来源：
   - 新建后立即写入浏览器本地持久化 store。
   - 首版不提供独立“手动导入明文 key”UI；若本地明文丢失，统一通过 rotate 获取新 key。
4. 本地 keyring（Console 前端本地存储）：
   - 结构：`{ keyId, plainKey, createdAt }[]`。
   - 删除/停用/轮换 key 时同步移除本地记录。
5. 丢失明文处理：
   - 不可恢复，只能 rotate 生成新 key（零兼容，符合 hash-only）。

## 4.2.1 首版实现约束（本轮执行）

1. 采用浏览器本地持久化 store，不引入服务端兼容层。
2. `ApiKey` 列表模型拆分为：
   - 服务端返回：`keyPreview`
   - 本地可选：`plainKey`
3. Playground / Webhooks / Memox 页面统一通过同一个解析函数获取：
   - `effectiveKeyId`
   - `apiKeyValue`
   - `apiKeyDisplay`
4. 若本地不存在 `plainKey`，页面仍允许展示 `keyPreview`，但不允许发起需要明文 key 的公网 API 调用，并统一提示用户 rotate。
5. 共享 `ApiKeySelector` 负责输出“缺少本地明文”提示，避免各个 Playground 自己维护分叉文案。

## 4.3 服务端改造点

1. `api-key.service.ts`：
   - `create` 生成明文后只存 hash + preview 信息。
   - `validateKey` 改 hash 校验。
2. `api-key.controller.ts`：
   - list/create/update 响应结构改为不含明文（create 仅一次性返回 `plainKey`）。
3. `prisma/main/schema.prisma`：
   - `ApiKey` 字段重构为 hash-only 结构。

---

## 5. Moryflow 接入方案（Server First，已确认）

## 5.1 总体链路

1. PC -> Moryflow Server（用户会话鉴权）。
2. Moryflow Server -> Anyhunt Memox API（服务端 API Key）。
3. `user_id` 由 Moryflow Server 按登录用户强制注入。

## 5.2 职责分层

1. Moryflow PC：
   - 只负责 UI、离线 outbox、重试调度。
   - 不接触 Anyhunt API Key。
2. Moryflow Server：
   - 统一封装 Memox 网关 client。
   - 统一注入 `user_id/app_id/run_id/metadata`。
   - 统一做错误翻译与审计日志。
3. Anyhunt Server：
   - 提供开放 API 能力与配额计量。

## 5.3 字段映射（冻结）

1. `user_id` = Moryflow 登录用户 ID（强制）。
2. `app_id` = `moryflow-server`（固定）。
3. `run_id` = 会话 ID（来自 PC/Server 会话上下文）。
4. `metadata` 最少包含：`source=pc-chat`、`workspaceId`、`threadId`、`modelId`、`clientTs`。

## 5.4 离线可写 + 在线补偿（冻结）

1. PC 本地 Outbox（sqlite）：
   - 记录待同步 memory write 请求。
   - 每条带 `idempotencyKey`。
2. 网络恢复后批量提交到 Moryflow Server。
3. Server 按 `idempotencyKey` 幂等入库，避免重复写入。
4. 同步失败保留在 Outbox，指数退避重试。

## 5.5 首版接口面（冻结）

1. 写入：`create`
2. 召回：`search`
3. 查询：`list`
4. 清理：`delete`

`entities/export/feedback/graph` 均二期。

---

## 6. 分阶段落地计划（已确认）

## 6.0 当前执行范围（本轮冻结）

1. 本轮只执行 **阶段 A（Anythunt Server）**，阶段 B/C 暂不实施。
2. 本轮交付标准：
   - P0 + P1 问题全部完成修复（Anyhunt Server + 必要的 Console 契约闭环）；
   - 受影响测试通过；
   - 本文与相关 CLAUDE.md 同步到“实现口径”。

## 6.1 阶段 A 执行清单（详细版）

1. `A1 API Key hash-only`（P0，优先级最高）
   - 数据层：`ApiKey` 改为 `keyHash + keyPrefix + keyTail`，移除 `keyValue`。
   - 服务层：`create` 一次性返回 `plainKey`，`validateKey` 按 hash 查库。
   - 接口层：list/update 不再返回明文 key，只返回 `keyPreview`。
   - Console：新增本地 keyring/store，创建后保存 `plainKey`，列表与 Playground 使用新契约。
   - 测试：`api-key.service.spec.ts` 改为 hash-only 断言。
   - 验收：数据库无法检索明文 key；Console 列表/复制/Playground 全链路仍可用。

2. `A2 Memory 索引与查询面`（P0）
   - 向量索引：`Memory.embedding` 增加 ANN 索引（ivfflat/hnsw）。
   - 过滤索引：`metadata` GIN、`categories` GIN、`keywords` GIN。
   - 过期过滤：`buildWhereSql` 统一追加
     `("expirationDate" IS NULL OR "expirationDate" > NOW())`。
   - 测试：新增 filter builder 边界测试覆盖过期过滤与 DSL 操作。
   - 验收：search/list/filter SQL 默认不返回过期 memory。

3. `A3 Memory 写路径事务化`（P0）
   - `create/update/delete/deleteByFilter/batchUpdate/batchDelete` 收敛为事务。
   - 保证 `Memory` 与 `MemoryHistory/Feedback` 同步提交或回滚。
   - 验收：任一步失败不会留下“主记录成功、历史失败”的部分写入。

4. `A4 Export 契约收口 + 异步化`（P0）
   - 契约收口：移除 `ExportCreateSchema.schema` 与 `MemoryExport.schema` 字段。
   - 执行收口：create export 改为队列异步，接口即时返回 job id。
   - 处理器：后台任务使用 `Readable.from(async generator)` 流式导出并写入 R2，更新 `status/r2Key/error`。
   - 队列：export 使用独立 `attempts/backoff/removeOnComplete/removeOnFail` 策略；当前 BullMQ `JobsOptions` 不额外设置 job-level timeout。
   - 验收：导出接口不再阻塞请求线程，FAILED/COMPLETED 状态可追踪，导出内存占用不随总数据量线性上升。

5. `A5 Entity 与 API 口径修复`（P1）
   - 实体统计：`listEntities` 去除 N+1，改为聚合统计。
   - 语义统一：`total_memories` 与 memory list/search 一样默认过滤过期记录。
   - 参数兼容：`categories/fields` 兼容 `string | string[]`。
   - 扣费口径：移除 memory controller 的重复 `@BillingKey` 声明。
   - 验收：实体列表查询无逐条 count；query/body 参数兼容单值字符串。

6. `A6 回归测试与文档收口`（P0/P1 收尾）
   - 测试：补 memory/entity integration 回归、Console api-key 契约回归与 filter builder 单测。
   - 文档：更新本文状态、`docs/index.md`、`features/index.md` 与相关 CLAUDE.md。
   - 验收：文档与实现字段、接口、执行状态一致；验证记录只写入真实执行结果。

## 6.1.1 阶段 A 当前执行状态（2026-03-06，代码收口完成）

- `[x]` A1 完成：Anyhunt Server 已完成 API Key hash-only；Anyhunt Console 已切换到 `plainKey/keyPreview + 本地明文副本`。
- `[x]` A2 完成：向量库新增 ANN + GIN 索引迁移；`MemoryFilterBuilder` 默认追加过期过滤。
- `[x]` A3 完成：memory 写链路已事务化（create/update/delete/deleteByFilter/batchUpdate/batchDelete）。
- `[x]` A4 完成：export 已异步化、移除 `schema` 契约，并改为真正的流式导出上传。
- `[x]` A5 完成：entity 已去 N+1，并补齐 `total_memories` 过期过滤语义；`categories/fields` 兼容与重复 `@BillingKey` 已完成。
- `[~]` A6 部分完成：服务端/Console 回归测试、文档与验证事实一致性已收口；`memory/entity` integration spec 已补齐并通过 `typecheck`，但当前环境缺少 container runtime 且无可用 `.env`，未完成运行验证。

本轮新增迁移：

1. `apps/anyhunt/server/prisma/main/migrations/20260306093000_api_key_hash_only`
2. `apps/anyhunt/server/prisma/vector/migrations/20260306100000_memory_indexes_and_export_refactor`

### 验证记录（阶段 A）

1. `pnpm --filter @anyhunt/anyhunt-server test -- src/api-key/__tests__/api-key.service.spec.ts src/entity/__tests__/entity.service.spec.ts src/memory/__tests__/memory.service.spec.ts src/memory/filters/__tests__/memory-filter.builder.spec.ts src/memory/dto/__tests__/memory.schema.spec.ts` ✅
2. `pnpm --filter @anyhunt/anyhunt-server typecheck` ✅
3. `pnpm --filter @anyhunt/anyhunt-server test:integration -- src/memory/__tests__/memory-entity.integration.spec.ts`
   - 实际执行会触发全量 integration suite；
   - 当前环境缺少 container runtime，`testcontainers` 启动失败；
   - worktree 内不存在用户提到的 `apps/anyhunt/server/.env`，无法切换为线上直连验证；
   - 结论：integration spec 已新增并通过 `typecheck`，但本轮未取得运行通过证据。
4. `git diff --name-only -- apps/anyhunt/server/src apps/anyhunt/server/test | rg '^apps/anyhunt/server/.+\\.ts$' | sed 's#^apps/anyhunt/server/##' | xargs pnpm --filter @anyhunt/anyhunt-server exec eslint --no-warn-ignored` ✅
5. `pnpm --filter @anyhunt/console test -- src/features/api-keys/utils.test.ts src/features/api-keys/local-key-store.test.ts src/features/webhooks/utils.test.ts src/pages/MemoxPlaygroundPage.test.tsx src/pages/agent-browser/AgentBrowserLayoutPage.test.tsx` ✅
6. `pnpm --filter @anyhunt/console typecheck` ✅
7. `git diff --name-only -- apps/anyhunt/console/src | rg '^apps/anyhunt/console/src/.+\\.(ts|tsx)$' | sed 's#^apps/anyhunt/console/##' | xargs pnpm --filter @anyhunt/console exec eslint --no-warn-ignored` ✅

## 6.2 阶段 B：Moryflow Server 接入 Memox（待执行）

1. 新增 `memox-gateway` 模块（server-http-client + authMode=apiKey）。
2. 新增 server 侧 memory API（供 PC 调用）。
3. 强制注入 `user_id` 与审计 metadata。

## 6.3 阶段 C：Moryflow PC 接入 + 离线同步（待执行）

1. renderer `store/methods/api`。
2. outbox + 幂等重试。
3. E2E：离线写入 -> 恢复网络 -> 服务端落库 -> 可召回。

---

## 7. 验收门槛（冻结）

1. 本轮（阶段 A）：
   - 安全：数据库中不可检索到明文 API Key。
   - 功能：Anyhunt Server memory 核心链路（create/search/list/delete/export）行为正确，Anyhunt Console API Key/Playground 新契约可用。
   - 一致性：memory 写操作具备事务原子性。
   - 一致性：entity `total_memories` 与 memory 查询默认语义一致。
   - 质量：受影响模块 `typecheck + test:unit + affected-file eslint` 通过；`memory/entity` integration spec 已补齐，待在有容器或可用直连环境下执行。
2. 阶段 B/C 完成后补充：
   - 功能：Moryflow Server + PC 完整接入（写入/召回/查询/删除）。
   - 同步：离线写入至少一次补偿成功用例通过。

---

## 8. 文档同步任务（冻结）

1. `[x]` 更新 `docs/design/anyhunt/core/system-boundaries-and-identity.md`：移除 `namespace + externalUserId` 要求，改为当前实现口径。
2. `[x]` 更新 `docs/design/anyhunt/core/quota-and-api-keys.md`：改为 hash-only + keyPreview + 一次性明文返回。
3. `[x]` 本文作为接入与改造总事实源，已回写阶段 A 执行状态。
