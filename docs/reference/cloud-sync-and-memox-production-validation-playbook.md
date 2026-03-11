---
title: 云同步与 Memox 线上自动化验收 Playbook
date: 2026-03-10
scope: apps/anyhunt/server + apps/moryflow/server + apps/moryflow/pc
status: active
---

<!--
[INPUT]: 线上 Anyhunt/Moryflow 服务、Memox 单链路、云同步运行时、桌面端 IPC 能力、现有脚本资产
[OUTPUT]: 自动化优先的线上验收顺序、命令模板、PC harness 约束、失败分流与记录模板
[POS]: docs/reference 线上功能验收操作手册

[PROTOCOL]: 仅在线上接口、固定执行顺序、自动化入口、成功标准或失败分流失真时更新本文件。
-->

# 云同步与 Memox 线上自动化验收 Playbook

## 目标

本手册定义一套自动化优先的线上验收流程，用于验证：

1. Anyhunt Memox 写链、读链与公开契约真实可用。
2. Moryflow 云同步能真实触发、真实提交、真实更新空间用量。
3. Moryflow 搜索结果与 Anyhunt Memox 检索结果在分布式验证阶段保持一致。

本手册只保留冻结事实，不承载架构讨论、PR 过程或临时执行播报。

## 核心原则

1. 自动化优先，人工操作只作为 fallback。
2. 线上接口是真相源；本地 mock、单测与人工界面核对不替代线上验收。
3. 云同步不视为纯 HTTP 功能；必须同时验证 PC 触发链与服务端结果链。
4. Anyhunt 公共 API key 鉴权固定使用 `Authorization: Bearer <apiKey>`，不使用 `x-api-key`。
5. Anyhunt 公开写接口固定要求 `Idempotency-Key`；缺失时视为无效测试。
6. 云同步空间用量按前后快照增量验证，不按“必须从 0 开始”验证。

## 适用范围

### Phase A: Memox

- Anyhunt `/api/v1/source-identities/*`
- Anyhunt `/api/v1/sources/:sourceId/revisions`
- Anyhunt `/api/v1/source-revisions/:revisionId/finalize`
- Anyhunt `/api/v1/sources/search`
- Anyhunt `/api/v1/sources/:sourceId` delete

### Phase B: 云同步

- Moryflow PC 登录态与 vault 绑定
- Moryflow PC `desktopAPI.cloudSync.*`
- Moryflow `/api/v1/usage`
- Moryflow `/api/v1/search`
- Anyhunt `/api/v1/sources/search`

## 固定执行顺序

必须按以下顺序执行：

1. Phase A: Memox 自动化验收
2. Phase B: 云同步自动化验收

顺序约束：

1. 云同步最终搜索结果依赖 Memox 单链路。
2. Memox 不可用时，云同步搜索验收没有独立解释力。
3. 先收口 Memox，再判断云同步写入是否真实进入可检索状态。

## 输入与配置

## 服务探活

固定检查以下端点：

```bash
curl -fsS https://server.anyhunt.app/health/live
curl -fsS https://server.anyhunt.app/health/ready
curl -fsS https://server.moryflow.com/health/live
curl -fsS https://server.moryflow.com/health/ready
```

通过标准：

1. 四个请求都返回 `200`
2. `ready` 响应中数据库与 Redis 处于可用状态

## 环境变量来源

执行线上验收时，优先从实际部署所使用的 Moryflow Server 与 Anyhunt Server 环境中导出以下变量：

```bash
export ANYHUNT_API_BASE_URL="https://server.anyhunt.app"
export ANYHUNT_API_KEY="..."
export MORYFLOW_SERVER_BASE_URL="https://server.moryflow.com"
```

以下变量用于桌面端自动化：

```bash
export MORYFLOW_PC_USER_DATA_DIR="..."
export MORYFLOW_VALIDATION_WORKSPACE="/absolute/path/to/workspace"
```

如需直接复用本地保存的线上环境文件，固定使用根脚本入口：

```bash
export MORYFLOW_SERVER_ENV_FILE="/absolute/path/to/apps/moryflow/server/.env"
export ANYHUNT_SERVER_ENV_FILE="/absolute/path/to/apps/anyhunt/server/.env"
```

固定执行命令：

```bash
pnpm validate:production:memox
pnpm validate:production:cloud-sync
pnpm validate:production
```

约束：

1. 根脚本会顺序执行 Phase A 再执行 Phase B。
2. 根脚本会从环境文件导出 `ANYHUNT_API_BASE_URL`、`ANYHUNT_API_KEY`、`SERVER_URL` 等变量，并规范化为统一运行时变量。
3. `cloud-sync` 模式固定要求 `MORYFLOW_E2E_USER_DATA` 与 `MORYFLOW_VALIDATION_WORKSPACE` 可用。
4. `cloud-sync` 模式固定要求 `MORYFLOW_E2E_USER_DATA` 对应的桌面端 profile 已建立 PC membership session；浏览器 Cookie 会话不算通过。

## Phase B 预检

在运行云同步生产验收前，必须先满足以下桌面端登录态事实：

1. `window.desktopAPI.membership.hasRefreshToken()` 为 `true`，或 `window.desktopAPI.membership.getAccessToken()` 非空
2. 若仅有 refresh token，harness 必须先执行一次 `refreshSession()` 并把 access token 显式同步到 main 进程
3. 若两者都为空，立即 fail-fast，结论固定为“当前桌面端未登录，无法验证云同步主链”

约束：

1. 绑定文件 `cloud-sync.json` 的存在不等于桌面端已登录
2. 本地 workspace 已打开也不等于桌面端已登录
3. 若 `Please log in first` 出现在 `getUsage`、`triggerSync` 或 `search`，优先判定为桌面端 membership session 缺失，而不是 quota/搜索逻辑故障

### 当前人工前置动作

若预检不通过，固定要求人工先完成以下动作：

1. 打开本机 Moryflow Desktop
2. 在 Desktop 内重新登录目标账号
3. 确认登录发生在当前 profile：
   - `~/Library/Application Support/@moryflow/pc`
4. 完成后再重新执行：

```bash
pnpm validate:production:cloud-sync
```

解释：

1. 云同步主链只认 Desktop membership session
2. 浏览器会话、已存在的 vault binding、已打开的 workspace 都不能替代 Desktop token session

## 测试数据命名约定

所有测试数据统一使用以下前缀：

- `codex-validation-memox-<timestamp>`
- `codex-validation-cloud-sync-<timestamp>`
- `codex-validation/`

约束：

1. 每次执行都生成唯一 run id，固定使用“毫秒级时间戳 + 随机后缀”
2. 所有 Memox 测试 source 必须在用例末尾删除；失败路径也必须执行 best-effort cleanup
3. 云同步测试文件必须与真实用户文件隔离

## 执行层级

### Level 1: 脚本优先

优先复用仓库中现有脚本：

- `scripts/run-production-validation.mjs`
- `apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.ts`
- `apps/anyhunt/server/scripts/memox-production-smoke-check.ts`
- `apps/moryflow/pc/tests/cloud-sync-production-validation.spec.ts`

### Level 2: 桌面端 IPC harness

对 Moryflow 读链与云同步触发链，优先使用 Electron/Playwright 启动已登录的 PC，并通过以下接口采样：

- `window.desktopAPI.cloudSync.getStatus()`
- `window.desktopAPI.cloudSync.getStatusDetail()`
- `window.desktopAPI.cloudSync.triggerSync()`
- `window.desktopAPI.cloudSync.getUsage()`
- `window.desktopAPI.cloudSync.search()`
- `window.desktopAPI.cloudSync.getBinding()`
- `window.desktopAPI.cloudSync.bindVault()`

### Level 3: 定向 HTTP fallback

仅在以下前提同时满足时使用：

1. 目标接口确实是纯 HTTP 公共接口
2. 已明确掌握有效 bearer 凭据
3. Level 1 或 Level 2 无法覆盖对应链路

## Phase A: Memox 自动化验收

## A0. OpenAPI 与写读链脚本验收

优先运行仓库内现有脚本：

```bash
export ANYHUNT_BASE_URL="${ANYHUNT_API_BASE_URL%/}/api/v1"
export ANYHUNT_OPENAPI_URL="${ANYHUNT_API_BASE_URL%/}/openapi.json"

pnpm --filter @anyhunt/anyhunt-server run memox:phase2:openapi-load-check
```

或使用根命令：

```bash
pnpm validate:production:memox
```

本步骤固定验证：

1. OpenAPI required/forbidden paths
2. `source-identities` / `revisions` / `finalize` / `sources/search` / `retrieval/search` / `exports` 的状态码与响应契约
3. Memox 基础负载与搜索结果命中

通过标准：

1. 脚本退出码为 `0`
2. 结果中 required paths 与 operations 全部通过
3. `source` 与 `export` case 全部成功

## A1. 定向 source 生命周期 smoke

### A1.1 生成测试变量

```bash
export ANYHUNT_BASE_URL="${ANYHUNT_API_BASE_URL%/}/api/v1"
export TEST_RUN_ID="$(python - <<'PY'
from datetime import datetime, timezone
import secrets
ts = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:17]
print(f"{ts}-{secrets.token_hex(4)}")
PY
)"
export TEST_EXTERNAL_ID="codex-validation-memox-${TEST_RUN_ID}"
export TEST_QUERY="codex validation ${TEST_RUN_ID}"
export TEST_TITLE="codex-validation-note-${TEST_RUN_ID}.md"
export TEST_PROJECT_ID="codex-validation"
```

### A1.2 Resolve / upsert source identity

```bash
curl -sS -X PUT \
  -H "Authorization: Bearer ${ANYHUNT_API_KEY}" \
  -H "Idempotency-Key: memox-identity-${TEST_RUN_ID}" \
  -H "Content-Type: application/json" \
  "${ANYHUNT_BASE_URL}/source-identities/note_markdown/${TEST_EXTERNAL_ID}" \
  -d "{
    \"title\": \"${TEST_TITLE}\",
    \"display_path\": \"codex-validation/${TEST_TITLE}\",
    \"project_id\": \"${TEST_PROJECT_ID}\",
    \"mime_type\": \"text/markdown\",
    \"metadata\": {
      \"source\": \"codex-validation\",
      \"validation_type\": \"memox\",
      \"validation_run_id\": \"${TEST_RUN_ID}\"
    }
  }"
```

断言：

1. 返回 `200`
2. 响应体包含 `source_id`

### A1.3 Create inline revision

```bash
curl -sS -X POST \
  -H "Authorization: Bearer ${ANYHUNT_API_KEY}" \
  -H "Idempotency-Key: memox-revision-${TEST_RUN_ID}" \
  -H "Content-Type: application/json" \
  "${ANYHUNT_BASE_URL}/sources/${SOURCE_ID}/revisions" \
  -d "{
    \"mode\": \"inline_text\",
    \"mime_type\": \"text/markdown\",
    \"content\": \"# Codex Validation\n\nQuery token: ${TEST_QUERY}\n\"
  }"
```

断言：

1. 返回 `200`
2. 响应体包含 `id`

### A1.4 Finalize revision

```bash
curl -sS -X POST \
  -H "Authorization: Bearer ${ANYHUNT_API_KEY}" \
  -H "Idempotency-Key: memox-finalize-${TEST_RUN_ID}" \
  -H "Content-Type: application/json" \
  "${ANYHUNT_BASE_URL}/source-revisions/${REVISION_ID}/finalize" \
  -d "{}"
```

断言：

1. 返回 `200`
2. 不能出现 `500`
3. 不能出现 upstream HTML、embedding 404、schema mismatch
4. 使用 `qwen/qwen3-embedding-4b` 时，线上环境必须显式配置 `EMBEDDING_OPENAI_DIMENSIONS=1536`

### A1.5 Search in Anyhunt

```bash
curl -sS -X POST \
  -H "Authorization: Bearer ${ANYHUNT_API_KEY}" \
  -H "Content-Type: application/json" \
  "${ANYHUNT_BASE_URL}/sources/search" \
  -d "{
    \"query\": \"${TEST_QUERY}\",
    \"top_k\": 5,
    \"source_types\": [\"note_markdown\"],
    \"project_id\": \"${TEST_PROJECT_ID}\"
  }"
```

断言：

1. 返回 `200`
2. `results` 至少包含一个命中
3. 命中的 `external_id == TEST_EXTERNAL_ID`

### A1.6 Delete source

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer ${ANYHUNT_API_KEY}" \
  -H "Idempotency-Key: memox-delete-${TEST_RUN_ID}" \
  "${ANYHUNT_BASE_URL}/sources/${SOURCE_ID}"
```

删除后重复执行 A1.5。

断言：

1. Anyhunt 不再命中当前 source

## Phase A 通过标准

1. A0 成功
2. A1.2~A1.6 全部返回预期状态码
3. Anyhunt 搜索能命中
4. 删除后 Anyhunt 不再命中

## Phase B: 云同步自动化验收

## B0. 验收模型

云同步固定拆成三段：

1. PC 触发链
2. PC 采样链
3. 服务端结果链

三段都通过才算通过。仅靠 HTTP 或仅靠 UI 都不足以证明云同步成功。

## B1. 启动桌面端自动化 harness

固定使用 Electron + Playwright 启动 Moryflow PC，并注入已登录 user data 目录：

```bash
export MORYFLOW_E2E=true
export MORYFLOW_E2E_USER_DATA="${MORYFLOW_PC_USER_DATA_DIR}"
```

执行命令：

```bash
pnpm --filter @moryflow/pc run test:e2e:cloud-sync-production
```

要求：

1. `MORYFLOW_PC_USER_DATA_DIR` 对应真实已登录测试账号
2. 当前 active vault 指向 `MORYFLOW_VALIDATION_WORKSPACE`

## B2. 准备测试文件与基线快照

创建唯一测试文件：

- 文件名：`codex-validation-cloud-sync-${TEST_RUN_ID}.md`
- 文件正文：

```text
# Cloud Sync Validation

Query token: codex cloud sync ${TEST_RUN_ID}
```

固定记录：

1. 文件绝对路径
2. 文件大小 `FILE_SIZE_BYTES`
3. 前置 `usage_before`
4. 前置 `lastSyncAt_before`

前置快照通过桌面端 IPC 获取：

```ts
const statusBefore = await window.desktopAPI.cloudSync.getStatusDetail();
const usageBefore = await window.desktopAPI.cloudSync.getUsage();
```

## B3. 自动触发与轮询同步

自动化 harness 固定执行：

1. `getBinding(localPath)` 校验绑定
2. 无绑定时执行 `bindVault({ localPath })`
3. 写入测试文件
4. 调用 `triggerSync()`
5. 轮询 `getStatusDetail()`，直到：
   - `lastSyncAt` 大于前置快照
   - `engineStatus` 回到 `idle`，或可解释的 `offline/error` 状态

断言：

1. 同步状态必须真实变化，不能一直停在 `disabled`
2. `triggerSync()` 不能无反馈空转
3. `lastSyncAt` 必须推进

## B4. 采样用量与搜索

同步完成后，通过桌面端 IPC 获取：

```ts
const usageAfter = await window.desktopAPI.cloudSync.getUsage();
const moryflowSearchResults = await window.desktopAPI.cloudSync.search({
  query: `codex cloud sync ${process.env.TEST_RUN_ID}`,
  topK: 5,
});
```

断言：

1. `usageAfter.storage.used - usageBefore.storage.used >= FILE_SIZE_BYTES`
2. Moryflow 搜索结果命中测试文件

## B5. Anyhunt 结果对账

固定使用唯一 query token 对账：

```bash
curl -sS -X POST \
  -H "Authorization: Bearer ${ANYHUNT_API_KEY}" \
  -H "Content-Type: application/json" \
  "${ANYHUNT_BASE_URL}/sources/search" \
  -d "{
    \"query\": \"codex cloud sync ${TEST_RUN_ID}\",
    \"top_k\": 5,
    \"source_types\": [\"note_markdown\"]
  }"
```

断言：

1. 返回 `200`
2. 结果命中刚刚同步的测试文件

## B6. UI 与服务端一致性

固定对账项：

1. `window.desktopAPI.cloudSync.getUsage()` 返回的用量
2. UI 展示的用量
3. Moryflow 搜索结果
4. Anyhunt 搜索结果

一致性标准：

1. UI 与 IPC 返回值语义一致
2. Moryflow 与 Anyhunt 都命中同一测试文件
3. `usage` 使用增量验证，不依赖初始值为 `0`

## Phase B 通过标准

1. 绑定存在或自动绑定成功
2. `triggerSync()` 触发真实状态变化
3. `lastSyncAt` 推进
4. `usage_after - usage_before >= FILE_SIZE_BYTES`
5. Moryflow 与 Anyhunt 搜索都命中测试文件

## 手工 fallback

只有在桌面端自动化 harness 不可用时，才允许退化到手工 UI 操作。手工 fallback 不改变通过标准，只改变触发方式：

1. 手工登录 PC
2. 手工确认 active vault
3. 手工点击“重试同步”
4. 自动化脚本继续负责 usage/search/Anyhunt 对账

## 失败分流

### Memox

1. A0 失败：
   - 优先看 OpenAPI contract、Anyhunt 健康状态、脚本输出中的具体 operation
2. A1.2 失败：
   - 优先看 `Authorization`、`Idempotency-Key`、scope 冲突
3. A1.3 失败：
   - 优先看 `mode/content/mime_type` 请求体是否符合契约
4. A1.4 失败：
   - 优先看 embedding provider 配置、`EMBEDDING_OPENAI_DIMENSIONS=1536`、upstream 响应、revision status
5. A1.5 返回 `500`：
   - 优先看 retrieval 的 chunk window CTE 是否把 `revisionId` 错误强转为 `uuid`
   - 当前 schema 下必须保持 `revisionId::text` 与 `centerChunkIndex::int`，否则会触发 `operator does not exist: text = uuid` 或 `text - unknown`
6. Phase B 中 Moryflow 搜索命中失败但 Anyhunt 命中成功：
   - 优先看 Moryflow 搜索适配层、Search live projection 或 PC 到服务端认证链
7. A1.6 删除后仍命中：
   - 优先看 delete 生命周期与搜索投影清理

### 云同步

1. B3 无法触发：
   - 优先看登录态、active vault、binding、PC 主进程 `reinit/init`
2. `lastSyncAt` 不推进：
   - 优先看 `sync diff/commit` 是否真实执行
3. `usage_after - usage_before < FILE_SIZE_BYTES`：
   - 优先看 `UserStorageUsage`、`SyncFile`、commit 成功性
4. usage 增量正常但搜索未命中：
   - 优先看 outbox、Memox bridge、Anyhunt source ingest
5. IPC 正常但 UI 显示错误：
   - 优先看 renderer `use-cloud-sync` 与展示映射

## 执行记录模板

执行记录固定包含以下字段：

```md
## 执行信息

- 执行时间：
- 执行人：
- Anyhunt base URL：
- Moryflow base URL：
- 测试 run id：

## Phase A

- A0 openapi/load check：PASS / FAIL
- A1.2 source identity：PASS / FAIL
- A1.3 revision create：PASS / FAIL
- A1.4 finalize：PASS / FAIL
- A1.5 Anyhunt search：PASS / FAIL
- A1.6 delete cleanup：PASS / FAIL

## Phase B

- B3 trigger + status advance：PASS / FAIL
- B4 usage delta：PASS / FAIL
- B4 Moryflow search：PASS / FAIL
- B5 Anyhunt search：PASS / FAIL
- B6 UI reconciliation：PASS / FAIL

## 结论

- 总结论：PASS / FAIL
- 断点层级：
- 证据链接或命令输出：
- 后续动作：
```

## 相关事实源

- `docs/reference/cloud-sync-and-memox-validation.md`
- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- `docs/design/moryflow/runbooks/cloud-sync-operations.md`
