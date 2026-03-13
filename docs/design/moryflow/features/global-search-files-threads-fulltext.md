---
title: Moryflow PC 全局搜索架构（Local + Memory）
date: 2026-03-13
scope: apps/moryflow/pc
status: active
---

<!--
[INPUT]:
- 现有侧栏 Search 入口已完成从 Command Palette 到 `GlobalSearchPanel` 的切换。
- 产品决策：
  1) 全局搜索固定为 `Local + Memory`；
  2) 本地侧保留 `Threads / Files`；
  3) 远端侧固定为 `Memory Files / Facts`；
  4) Memory 失败时不能拖垮本地结果；
  5) 搜索范围仍以当前 active workspace / vault 为主。
- 性能要求：避免输入时卡顿，支持防抖、请求取消与过期响应丢弃。

[OUTPUT]:
- 当前全局搜索的正式架构事实源：信息架构、Local + Memory 查询边界、结果分组、降级语义与验证基线。

[POS]:
- Moryflow PC Global Search 的当前完成态事实源。
-->

# Moryflow PC 全局搜索架构（Local + Memory）

## 1. 当前定位

`GlobalSearchPanel` 已经不是旧命令面板的替代壳层，而是 Moryflow PC 的统一搜索入口。

当前固定分组为：

1. `Threads`
2. `Files`
3. `Memory Files`
4. `Facts`

固定结论：

1. 本地 `Threads / Files` 与远端 `Memory Files / Facts` 并列展示。
2. 搜索入口不再承载 `Common actions` 或命令分组。
3. 旧 `desktopAPI.cloudSync.search -> /api/v1/search` 远端搜索链已从 PC 主链删除。

## 2. 查询架构

```text
GlobalSearchPanel
├─ QueryInput (debounced)
├─ Local Search
│  ├─ Threads
│  └─ Files
├─ Memory Search
│  ├─ Memory Files
│  └─ Facts
└─ ResultGroups + Keyboard Navigation
```

### 2.1 Local Search

本地搜索固定由 PC main `search-index` 模块提供：

1. `Threads`
2. `Files`

实现约束：

1. 搜索范围固定为当前 active vault。
2. 查询策略固定为 `FTS 精确匹配（unicode61） + N-gram 模糊匹配` 双轨合并。
3. 主进程负责索引、去重、排序与 snippet 缓存；renderer 不直接扫描文件系统。

### 2.2 Memory Search

远端 memory 搜索固定走：

`desktopAPI.memory.search -> Moryflow Server memory gateway -> Anyhunt /api/v1/retrieval/search`

固定返回：

1. `Memory Files`
2. `Facts`

实现约束：

1. memory 搜索也绑定当前 active workspace，而不是全局用户空间。
2. `Memory Files` 的稳定身份来自 gateway 映射，不从标题或 snippet 反推。
3. memory 搜索与本地搜索并行执行，但可用性必须分开建模。

## 3. 降级与可用性合同

### 3.1 局部失败

`Global Search` 固定采用 `local + memory` 双路并行。

降级规则：

1. 本地搜索失败时，只影响 `Threads / Files`。
2. `Memory Search` 失败时，只影响 `Memory Files / Facts`。
3. 只要一侧仍可用，另一侧故障不得把整页结果清空。

### 3.2 Memory unavailable

当 `Memory Search` 不可用时，UI 必须：

1. 保留本地 `Threads / Files` 结果。
2. 明确显示 `Memory unavailable`。
3. 不能把远端失败伪装成“没有 memory 结果”。

## 4. 点击与打开语义

### 4.1 Threads / Files

本地结果继续保持当前行为：

1. `Threads` 打开会话
2. `Files` 打开文件树节点

### 4.2 Memory Files

`Memory Files` 只有在满足以下条件时才允许打开本地文件：

1. `localPath` 存在
2. `disabled = false`

固定约束：

1. `disabled || !localPath => disabled`
2. 禁用结果必须给出明确不可用文案，而不是“看起来可点，点了没反应”
3. native `localPath` 必须原样保留，不在 renderer 单点改写路径分隔符

### 4.3 Facts

点击 `Facts` 结果会把 scoped intent 传给 `Memory Workbench`，再由 Workbench 打开对应 fact detail。

约束：

1. intent 必须带当前 workspace scope。
2. same-scope intent 不得触发整个 Workbench reset。

## 5. 代码事实源

- `apps/moryflow/pc/src/main/search-index/*`
- `apps/moryflow/pc/src/main/app/cloud-sync-ipc-handlers.ts`
- `apps/moryflow/pc/src/main/app/memory-ipc-handlers.ts`
- `apps/moryflow/pc/src/renderer/components/global-search/*`
- `apps/moryflow/pc/src/renderer/workspace/components/memory/*`

## 6. 当前验证基线

1. 本地搜索与 memory 搜索的降级、过期响应丢弃和 disabled 规则已经由 `Global Search` 相关单测覆盖。
2. 生产链路的最终验收基线统一记录在：
   - `docs/reference/cloud-sync-and-memox-validation.md`
   - `docs/reference/cloud-sync-and-memox-production-validation-playbook.md`
