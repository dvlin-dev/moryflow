---
title: Moryflow PC 全局搜索重构方案（Files + Threads 全文）
date: 2026-02-28
scope: apps/moryflow/pc
status: completed
---

<!--
[INPUT]:
- 现有侧栏 Search 入口打开的是 Command Palette（以命令动作为主），不满足“全局文件 + thread 搜索”目标。
- 产品决策：
  1) 不保留 Common actions；
  2) 文件搜索需要全文；
  3) 线程搜索需要包含消息内容；
  4) 搜索范围仅当前 active vault；每组返回 10 条；线程消息全类型都参与检索。
- 性能要求：避免输入时卡顿，支持防抖与查询取消。

[OUTPUT]:
- 一个可执行的全局搜索方案：信息架构、索引与查询设计、IPC 契约、UI 交互与验证基线。

[POS]:
- Moryflow PC 全局搜索（替代当前 Command Palette）实施方案。
-->

# Moryflow PC 全局搜索重构方案（Files + Threads 全文）

## 1. 当前状态

1. `CommandPalette` 已被 `GlobalSearchPanel` 替代，搜索结果只保留 `Files` 与 `Threads` 两组。
2. 搜索范围固定为当前 active vault；每组默认返回 10 条，线程消息全类型都参与检索。
3. 查询链路已经收口为 `FTS 精确匹配（unicode61） + N-gram 模糊匹配（跨语言）` 的双轨检索，再统一合并排序。
4. 主进程统一负责索引、查询、预算控制与缓存；Renderer 只负责输入、防抖、展示与跳转。
5. 本文只保留当前搜索架构与验证基线；Step 日志、review 修复记录与执行进度播报不再继续维护。

## 2. 当前问题与根因

1. 旧 Search 入口打开的是命令面板，核心数据是 action，不是文件或线程内容。
2. 文件树与线程列表都不具备完整全文索引能力。
3. 若在 Renderer 直接扫描文件或会话文本，会造成输入阻塞与渲染抖动。

根因结论：搜索能力以前没有单一事实源（索引层），UI 只能消费命令列表，无法自然满足全局全文搜索需求。

## 3. 目标架构

### 3.1 信息架构

```text
GlobalSearchPanel
├─ QueryInput (debounced)
├─ ResultGroups
│  ├─ Threads (title + message excerpts)
│  └─ Files (path + highlighted excerpt)
└─ Keyboard Navigation
   ├─ Up/Down
   ├─ Enter: open target
   └─ Esc: close
```

### 3.2 主进程统一索引服务

新增 `main/search-index/` 模块，职责分离：

- `store.ts`：SQLite FTS5 索引存储
- `file-indexer.ts`：文件全文索引构建与增量更新
- `thread-indexer.ts`：会话标题与消息全文索引构建与增量更新
- `query.ts`：统一查询入口
- `types.ts`：IPC 查询入参/结果类型

### 3.3 查询策略

1. Files 与 Threads 都采用 `exact + fuzzy` 双轨查询。
2. 主进程负责候选拉取、去重、加权排序、预算控制与 snippet 缓存。
3. Renderer 采用防抖与请求序号丢弃，避免结果闪烁与过期响应污染。

## 4. 关键约束

1. 搜索范围仅当前 active vault。
2. 线程必须带 vault 归属，禁止把 `__legacy_unscoped__` 会话写入索引。
3. tool 输出与长消息必须经过统一抽取/截断规则，避免索引膨胀。
4. 删除旧命令面板时必须全链路一次性收口，不保留兼容桥接。
5. 跨语言模糊搜索属于索引层事实源，不允许在查询侧叠补丁式模糊匹配。

## 5. 验收标准（DoD）

1. Search 入口统一打开 `GlobalSearchPanel`，不再出现旧 Command actions 分组。
2. Files 支持 Markdown 全文搜索；Threads 支持标题与消息内容全文搜索。
3. 搜索结果仅覆盖当前 active vault。
4. 主进程查询链路保持预算与缓存约束，Renderer 输入过程不出现明显卡顿。
5. 跨语言场景可通过 exact + N-gram 双轨查询稳定命中。

## 6. 当前验证基线

1. `apps/moryflow/pc/src/main/search-index/*` 负责索引结构、重建、增量更新、query 与 tokenizer 回归。
2. Renderer 侧负责 `GlobalSearchPanel`、防抖、请求丢弃、键盘导航与跳转行为回归。
3. 变更索引 schema、查询排序或 vault 归属约束时，至少执行受影响文件的 `typecheck` 与 `test:unit`。
4. 涉及跨进程 IPC、索引重建策略或全局搜索入口替换时，按 L2 执行根级校验。
