---
title: Moryflow PC Memory Workbench 架构
date: 2026-03-13
scope: apps/moryflow/pc + apps/moryflow/server + apps/anyhunt/server
status: active
---

# Moryflow PC Memory Workbench 架构

## 1. 目标与边界

`Memory Workbench` 是 Moryflow PC 面向长期记忆的正式前台模块，固定包含：

1. `Overview`
2. `Search`
3. `Facts`
4. `Graph`
5. `Exports`

固定边界：

1. renderer 不直连 Anyhunt。
2. 所有远端记忆能力固定走 `PC -> Moryflow Server memory gateway -> Anyhunt Memox`。
3. `Search` 必须统一走 `retrieval/search`。
4. `Facts` 固定区分 `manual` 与 `source-derived`。
5. `Graph` 固定建立在正式 `graph read/query API` 上。
6. `Exports` 当前只做 facts export。

## 2. 四层架构

```mermaid
flowchart LR
  subgraph AH["Anyhunt Memox"]
    AH1["Sources / Revisions / Chunks"]
    AH2["Memory Facts"]
    AH3["Graph Read / Query"]
    AH4["Retrieval / Exports"]
  end

  subgraph MS["Moryflow Server"]
    MS1["memory gateway"]
    MS2["scope resolve + DTO mapping"]
    MS3["error translation + idempotency"]
  end

  subgraph PC["PC main / preload"]
    PC1["desktopAPI.memory.*"]
    PC2["active vault binding + local path resolve"]
  end

  subgraph UI["Renderer"]
    UI1["Memory Workbench"]
    UI2["Global Search"]
  end

  AH --> MS
  MS --> PC
  PC --> UI
```

固定结论：

1. Anyhunt 拥有 `memory/source/graph/retrieval/export` 的平台语义。
2. `Moryflow Server` 固定只做 gateway，不重新发明第二套平台检索协议。
3. `desktopAPI.memory.*` 固定是 PC 前台的唯一记忆入口。

## 3. 模块能力合同

### 3.1 Overview

`Overview` 是当前 active workspace 的记忆总览，不是全局用户页。

固定展示块：

1. `binding`
2. `sync`
3. `indexing`
4. `facts`
5. `graph`

固定约束：

1. overview 由 `desktopAPI.memory.getOverview()` 返回。
2. `binding/sync` 由 Moryflow 侧聚合；`indexing/facts/graph` 由 gateway 汇总 Anyhunt 读模型。
3. `usage` 类辅助指标允许 best-effort；不可因为 usage 失败让整页 overview 不可用。

### 3.2 Search

`Search` 固定建立在 `desktopAPI.memory.search()` 上。

固定返回结构：

1. `groups.files`
2. `groups.facts`

`files` 组的 PC 合同固定包含：

1. `fileId`
2. `title`
3. `path`
4. `snippet`
5. `score`
6. `localPath?`
7. `disabled`

`facts` 组固定包含：

1. `factId`
2. `content`
3. `kind`
4. `score`
5. `snippet`
6. `sourceTitle?`

固定约束：

1. gateway 负责 scope 解析；renderer 不传 `projectId`、`userId` 等平台字段。
2. `files` 与 `facts` 的独立配额由平台保证，不允许 renderer 再做第二套 merge。
3. `Memory Files` 只有在 `localPath` 存在且 `disabled=false` 时才允许打开本地文件。

### 3.3 Facts

`Facts` 是 `MemoryFact` 的前台管理视图。

固定能力：

1. `list`
2. `detail`
3. `history`
4. `feedback`
5. `create`
6. `update`
7. `delete`
8. `batch delete`

固定类型：

1. `manual`
2. `source-derived`

固定约束：

1. `source-derived` facts 在 UI 中固定为 `readOnly`。
2. `manual` facts 才允许编辑、删除和批量删除。
3. `create/update/delete` 失败必须有可见错误，不能出现无声 rejection。

### 3.4 Graph

`Graph` 固定走：

1. `desktopAPI.memory.queryGraph()`
2. `desktopAPI.memory.getEntityDetail()`

固定约束：

1. `Graph` 首期建立在 `fact-derived projection + graph read/query API` 上。
2. entity detail 必须透传 metadata scope，不能比 query 更宽。
3. graph query/detail 的结果必须绑定当前 workspace scope。

### 3.5 Exports

`Exports` 当前只支持 facts export。

固定约束：

1. `createExport()` 只创建 facts export request。
2. renderer 不假设创建后立即可读；必须轮询 `getExport(exportId)` 直到成功或超时。
3. export 状态属于异步链路，不得把“尚未可读”误判成失败。

## 4. 状态与交互模型

`Memory Workbench` 的 renderer 状态机固定围绕 `workspaceScopeKey` 运转。

固定不变量：

1. workspace 切换会使 `Overview / Search / Facts / Graph / Exports` 失效，并清理旧 scope 状态。
2. same-scope 的 pending intent 不得触发整页 reset。
3. 所有异步写操作都使用 `requestId + workspaceScopeKey` 进行 stale guard。
4. `Search` 与 `Graph` 都必须有 debounce 与过期响应丢弃，避免击键级别并发污染。
5. `Exports` 轮询也必须受当前 scope 保护，旧 workspace 的轮询结果不能污染新 workspace。

## 5. Global Search 集成

`Global Search` 与 `Memory Workbench` 固定共用同一套 memory gateway 合同。

最终分组固定为：

1. `Threads`
2. `Files`
3. `Memory Files`
4. `Facts`

固定约束：

1. 本地搜索与 memory 搜索并行执行，但可用性分开建模。
2. `Memory Search` 失败时，必须保留本地 `Threads / Files` 结果，并显式显示 `Unavailable`。
3. `Memory Files` 的可打开规则与 Workbench Search 保持一致：`disabled || !localPath => disabled`。
4. 从 `Global Search` 跳转到 `Memory Workbench` 的 fact/search intent 必须带 scope，不得跨 workspace 串状态。

## 6. 扩展入口

`Memory Workbench` 当前已经为以下后续入口预留统一读写边界：

1. 对话流
2. 工作流
3. MCP
4. Agent runtime

扩展约束：

1. 新入口仍然优先复用 `memory gateway` 与 `desktopAPI.memory.*`。
2. 不允许为单个入口旁路到 Anyhunt 或再定义第二套前台记忆合同。

## 7. 代码事实源

- `apps/moryflow/server/src/memory/*`
- `apps/moryflow/pc/src/shared/ipc/memory.ts`
- `apps/moryflow/pc/src/main/app/ipc/memory-handlers.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/memory/*`
- `apps/moryflow/pc/src/renderer/components/global-search/*`
- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `docs/reference/cloud-sync-and-memox-validation.md`
- `docs/reference/cloud-sync-and-memox-production-validation-playbook.md`
