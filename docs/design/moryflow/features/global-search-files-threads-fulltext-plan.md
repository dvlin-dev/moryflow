---
title: Moryflow PC 全局搜索重构方案（Files + Threads 全文）
date: 2026-02-28
scope: apps/moryflow/pc
status: draft
---

<!--
[INPUT]:
- 现有侧栏 Search 入口打开的是 Command Palette（以命令动作为主），不满足“全局文件 + thread 搜索”目标。
- 产品决策：
  1) 不保留 Common actions；
  2) 文件搜索需要全文；
  3) 线程搜索需要包含消息内容。
  4) 搜索范围仅当前 active vault；每组返回 10 条；线程消息全类型都参与检索。
- 性能要求：避免输入时卡顿，支持防抖与查询取消。

[OUTPUT]:
- 一个可执行的全局搜索重构方案：信息架构、索引与查询设计、IPC 契约、UI 交互、实施步骤与验收标准。

[POS]:
- Moryflow PC 全局搜索（替代当前 Command Palette）实施方案。
-->

# Moryflow PC 全局搜索重构方案（Files + Threads 全文）

## TL;DR

- 将当前 `CommandPalette` 重构为 `GlobalSearchPanel`，仅保留两类结果：`Files`、`Threads`。
- Files 搜索改为全文检索；Threads 搜索改为“标题 + 消息内容”全文检索。
- 查询改为“双轨检索”：`FTS 精确匹配（unicode61） + N-gram 模糊匹配（跨语言）`，统一合并排序。
- 搜索范围固定为当前 active vault；每组默认返回 10 条（Files 10 + Threads 10）。
- Threads 检索覆盖全部消息类型（user / assistant / tool）。
- 搜索由主进程统一提供索引与查询能力，Renderer 仅负责输入、展示、跳转。
- 输入查询采用防抖（默认 `180ms`）+ 请求序号丢弃机制，避免 UI 卡顿与结果闪烁。
- 不做历史兼容：删除旧命令动作装配链路与旧分组逻辑，统一单轨实现。

## 当前问题与根因

1. 现有搜索入口语义不匹配  
   当前 Search 打开的是命令面板，核心数据是 action，而不是文件/线程内容。
2. 数据源分散且非全文  
   文件树是按展开懒加载，不是完整内容索引；线程列表只有标题，不含消息全文检索能力。
3. 性能边界缺失  
   若直接在 Renderer 扫描文件/会话文本，会造成输入阻塞与渲染抖动。

根因结论：搜索能力没有单一事实源（索引层），UI 只能消费“命令列表”，导致需求无法自然满足。

## 根因补充与强约束

1. 线程缺少 vault 归属字段  
   当前会话模型无 `vaultPath/vaultId`，无法严格实现“仅当前 active vault”的线程过滤。  
   收口要求：先补齐线程归属事实源，再落地线程搜索。
2. 线程消息全类型全文缺少治理边界  
   tool 输出可能包含超长 JSON/日志，若不设上限会导致索引膨胀与查询抖动。  
   收口要求：定义统一抽取/截断规则，并在索引层执行。
3. 命令面板链路有跨层耦合  
   `commandOpen/commandActions` 贯穿 workspace const/context/store/shell-view-store。  
   收口要求：删除旧能力时必须全链路一次性收口，禁止局部删文件式补丁。
4. contentless FTS 的片段回源成本  
   回源若无限制会在高频输入时放大磁盘读取抖动。  
   收口要求：引入片段缓存和查询预算上限。
5. 现有 FTS 仅做精确 token 匹配  
   `unicode61` 在当前实现中只支持“完整 token”命中，中文/无空格语言与英文子串匹配体验不符合“模糊搜索”预期。  
   收口要求：在索引层新增跨语言 N-gram 模糊检索事实源，与精确检索统一编排。

## 目标与非目标

### 目标

- 全局搜索仅包含两类结果：
  - Files：Markdown 文件全文搜索。
  - Threads：对话标题与消息内容全文搜索。
- 统一入口：侧栏 Header 的 Search icon 与 `Cmd/Ctrl+P` 都打开同一个全局搜索面板。
- 搜索体验稳定：
  - 输入防抖；
  - 过期查询结果自动丢弃；
  - 大数据量下仍保持交互流畅。

### 非目标

- 不保留旧 Command actions 分组与命令执行入口。
- 不引入云端搜索依赖（本方案仅本地索引/本地检索）。
- 不做旧版 Command Palette 兼容桥接。

## 目标信息架构

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

## 技术方案

### 1) 主进程：统一索引与查询服务（单一事实源）

新增 `main/search-index/` 模块，职责分离：

- `search-index/store.ts`  
  本地索引存储（SQLite FTS5，独立于业务数据存储）。
- `search-index/file-indexer.ts`  
  文件全文索引构建与增量更新（按 vault fs 事件更新）。
- `search-index/thread-indexer.ts`  
  线程全文索引构建与增量更新（按 chat session 事件更新）。
- `search-index/query.ts`  
  统一查询入口，返回 Files/Threads 混合结果。
- `search-index/types.ts`  
  IPC 查询入参/结果类型定义。

索引存储策略（关键）：

- 使用 SQLite **contentless FTS5** 作为“倒排索引层”，不把业务正文再完整存一份。
- 索引分为两张虚表：
  - `search_fts_exact`：`unicode61` 精确全文检索（高相关性）。
  - `search_fts_fuzzy`：N-gram token 流检索（跨语言子串命中）。
- 业务真相仍在原始数据源：
  - Files 真相：Vault Markdown 文件。
  - Threads 真相：chat-session-store。
- FTS 仅保存检索所需 token 索引 + docId 映射；结果片段展示时按 docId 回源读取或从缓存摘要生成。

N-gram 模糊检索规则（新增）：

- 对 `title + body` 做 Unicode 归一化（NFKC）+ 小写化，提取 `\p{L}` / `\p{N}` 连续 term。
- term 分片规则：
  - 长度 `1`：保留原 token；
  - 长度 `2`：保留 2-gram；
  - 长度 `>=3`：生成 2-gram + 3-gram。
- 生成 token 去重后写入 `search_fts_fuzzy`；查询词使用同规则生成 token 并以 `AND` 组合。
- 查询编排采用 “exact + fuzzy 并行检索 -> 去重合并 -> 分组截断”，exact 结果优先级高于 fuzzy。

索引字段建议（逻辑模型）：

- Files：`docId`, `vaultPath`, `filePath`, `fileName`, `updatedAt`, `contentDigest`
- Threads：`docId`, `vaultPath`, `sessionId`, `title`, `messageTextAllRoles`, `updatedAt`

线程归属事实源改造（强制前置）：

- `ChatSessionSummary` / `PersistedChatSession` 新增 `vaultPath: string`。
- 新建会话、分支会话时，写入当前 active vault 的 `vaultPath`。
- 线程索引与查询均以 `vaultPath` 为硬过滤条件。
- 遗留数据迁移策略：
  - 单 vault 场景：自动回写该 vaultPath。
  - 多 vault 场景：无法确定归属的 legacy session 标记为 `__legacy_unscoped__`，默认不参与“当前 vault 搜索”。

### 2) IPC 契约（主进程唯一查询入口）

新增 IPC：

- `search:query`
  - input: `{ query: string; limitPerGroup?: number }`
  - output: `{ files: FileSearchHit[]; threads: ThreadSearchHit[]; tookMs: number }`
  - 约束：仅检索当前 active vault，`limitPerGroup` 默认 `10`。
- `search:rebuild`
  - 手动重建索引（开发/故障恢复用）
- `search:getStatus`
  - 索引状态（ready/building/error + counters）

查询预算约束：

- 每次查询总回源预算 `<= 20`（Files 10 + Threads 10）。
- 单次查询的片段回源并发 `<= 4`。

### 3) Renderer：GlobalSearchPanel（替代 CommandPalette）

新增/替换：

- `components/global-search/`（新目录）
  - `index.tsx`: 面板容器
  - `search-input.tsx`: 输入与防抖
  - `search-results.tsx`: 分组渲染与高亮片段
  - `search-keyboard.ts`: 键盘导航
  - `use-global-search.ts`: 请求状态与并发治理

删除：

- `components/command-palette/*`
- `workspace/hooks/use-workspace-command-actions.ts`

### 4) 查询防抖与并发治理

- 输入防抖：`180ms`（可配置常量）。
- 并发控制：
  - 每次查询分配 `requestId`；
  - 返回时仅接收最新 `requestId` 的结果；
  - 过期结果直接丢弃。
- 最小查询长度：`>= 2` 字符触发（可配置）。

消息抽取与截断规则（全类型线程消息）：

- user/assistant/tool 全部纳入检索文本抽取。
- 单消息抽取上限：`4KB` 文本。
- 单会话聚合上限：`256KB` 文本。
- 非文本/二进制内容不入索引；结构化对象先转稳定字符串再截断。
- tool 输出仅索引可读文本，不索引原始二进制 payload。

片段缓存策略（contentless FTS 必须）：

- 建立 `snippetCache`（LRU）键：`docId + contentDigest`。
- 缓存命中直接返回摘要片段，未命中才回源读取。
- 缓存容量建议：`500` 条（可配置）。

### 5) 搜索原理（执行流）

1. 用户在 `GlobalSearchPanel` 输入关键字。
2. Renderer 防抖 `180ms` 后发起 `search:query`。
3. 主进程读取当前 active vault，基于索引层并行执行两路查询：
   - exact：`search_fts_exact` 精确命中；
   - fuzzy：`search_fts_fuzzy` N-gram 模糊命中。
4. 主进程按 docId 去重并统一排序（exact 优先，随后按相关性分值与更新时间），再按组裁剪（每组最多 10 条）。
5. Renderer 仅接收最新 `requestId` 对应结果，丢弃过期响应。
6. 用户回车打开目标：
   - File -> 打开文件并切 Home；
   - Thread -> 激活会话并切 Chat。

### 6) 导航联动

- 点击 file 结果：关闭面板 -> `destination='agent'` + `sidebarMode='home'` -> 打开文件。
- 点击 thread 结果：关闭面板 -> `destination='agent'` + `sidebarMode='chat'` -> 激活会话。

## 文件改造清单（计划）

### 新增

- `apps/moryflow/pc/src/main/search-index/*`
- `apps/moryflow/pc/src/renderer/components/global-search/*`
- `apps/moryflow/pc/src/shared/ipc/search.ts`

### 修改

- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`（注册 `search:*` IPC）
- `apps/moryflow/pc/src/preload/index.ts`（暴露 `desktopAPI.search`）
- `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- `apps/moryflow/pc/src/shared/ipc/chat.ts`（`ChatSessionSummary` 增加 `vaultPath`）
- `apps/moryflow/pc/src/main/chat-session-store/const.ts`
- `apps/moryflow/pc/src/main/chat-session-store/handle.ts`
- `apps/moryflow/pc/src/main/chat-session-store/session-store-adapter.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-overlays.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/index.tsx`（Search icon 保持入口但目标改为新面板）
- `apps/moryflow/pc/src/renderer/workspace/handle.ts`（删除 command actions 装配）
- `apps/moryflow/pc/src/renderer/workspace/const.ts`
- `apps/moryflow/pc/src/renderer/workspace/context/workspace-controller-context.tsx`
- `apps/moryflow/pc/src/renderer/workspace/stores/workspace-controller-store.ts`
- `apps/moryflow/pc/src/renderer/workspace/stores/workspace-shell-view-store.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`（如有 command 相关耦合）

### 删除

- `apps/moryflow/pc/src/renderer/components/command-palette/`
- `apps/moryflow/pc/src/renderer/workspace/hooks/use-workspace-command-actions.ts`

## 测试与验收

### 必测（L2）

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`

### 回归测试新增点

1. 主进程搜索索引
   - 文件全文命中；
   - 线程标题与消息内容命中；
   - 线程 `vaultPath` 过滤（仅当前 active vault）；
   - 索引增量更新正确性。
2. Renderer 全局搜索
   - 防抖行为；
   - 过期请求丢弃；
   - 键盘导航与 Enter 跳转。
3. 导航联动
   - file 命中进入 Home + 打开文件；
   - thread 命中进入 Chat + 打开会话。

### 验收标准

- Search icon 打开后不再显示 Common actions。
- 输入关键字可同时返回 Files 与 Threads。
- 结果范围仅当前 active vault。
- 每组结果默认最多 10 条。
- 文件命中来自全文，不依赖当前树展开状态。
- 线程命中包含消息全文匹配（含 user / assistant / tool）。
- 快速输入不出现明显卡顿与结果闪烁。
- legacy unscoped 线程默认不进入当前 vault 搜索结果。

## 已确认决策（2026-02-28）

1. 不保留 `Common actions`。
2. Files 搜索必须是全文检索。
3. Threads 搜索必须包含消息内容，且消息类型全覆盖（user/assistant/tool）。
4. 搜索范围仅当前 active vault。
5. 默认返回条数：每组 10 条。
6. 索引策略采用 SQLite contentless FTS5：保留业务真相在原存储，搜索层只做倒排索引。
7. 线程归属必须落到 `vaultPath` 事实源，线程查询按 active vault 硬过滤。
8. 线程消息抽取执行统一截断规则（单消息 4KB / 单会话 256KB）。
9. contentless FTS 结果片段必须走 `snippetCache` + 回源预算控制。
10. 搜索体验必须支持跨语言模糊匹配（中文/英文/无空格语言都可子串命中）。

## 分步实施计划

| 步骤    | 执行项                                                                                    | 状态 |
| ------- | ----------------------------------------------------------------------------------------- | ---- |
| Step 1  | 线程归属事实源改造：`ChatSessionSummary/PersistedChatSession` 增加 `vaultPath` + 迁移策略 | DONE |
| Step 2  | 新建 search-index 模块与 IPC 类型契约                                                     | DONE |
| Step 3  | 落地 Files 全文索引与增量更新                                                             | DONE |
| Step 4  | 落地 Threads（标题+消息）全文索引与增量更新（含抽取截断规则）                             | DONE |
| Step 5  | 实现 `search:query/rebuild/getStatus` IPC（含查询预算）                                   | DONE |
| Step 6  | 构建 GlobalSearchPanel（替代 CommandPalette）                                             | DONE |
| Step 7  | 接入防抖、请求并发丢弃与片段缓存                                                          | DONE |
| Step 8  | 接入 file/thread 结果跳转与 sidebarMode 联动                                              | DONE |
| Step 9  | 删除旧命令面板链路并补齐测试                                                              | DONE |
| Step 10 | 跑 L2 校验并回写 CLAUDE/docs 索引                                                         | DONE |
| Step 11 | 同步“跨语言模糊搜索（exact + N-gram）”方案到文档并冻结执行基线                            | DONE |
| Step 12 | 重构 search-index 存储层：新增 `search_fts_exact/search_fts_fuzzy` 与 N-gram 写入         | DONE |
| Step 13 | 重构查询层：exact + fuzzy 并行查询、去重合并排序、保持预算约束                            | DONE |
| Step 14 | 补齐回归测试并完成受影响校验与文档进度回写                                                | DONE |

## 执行进度日志

- 2026-02-28 Step 1 DONE
  - 完成会话 `vaultPath` 事实源落地：`ChatSessionSummary` 已强制包含 `vaultPath`，`chatSessionStore.create` 必须传入 `vaultPath`，`fork` 继承源会话 `vaultPath`。
  - 完成 legacy 迁移收口：会话读取归一化时，单 Vault 自动回填 `vaultPath`；多 Vault 无法判定归属时标记 `__legacy_unscoped__`。
  - 创建链路改造完成：`chat:sessions:create` 与 `desktopSessionStore.createSession` 都从当前 active vault 注入 `vaultPath`，无 workspace 时直接报错阻断脏数据写入。
  - 回归测试：
    - `src/main/chat-session-store/handle.test.ts`
    - `src/main/chat-session-store/store.test.ts`（新增）
    - `pnpm --filter @moryflow/pc typecheck` 通过。
- 2026-02-28 Step 2 DONE
  - 新增 `shared/ipc/search.ts`，定义 `search:query/rebuild/getStatus` 全量类型契约（Files + Threads 双分组）。
  - `DesktopApi` 与 preload 全链路接入 `desktopAPI.search`，为 Renderer 新面板提供稳定入口。
  - 新建 `main/search-index/*` 模块骨架（`index/store/file-indexer/thread-indexer/query/types`），收敛后续实现边界。
  - `main/app/ipc-handlers.ts` 已注册 `search:query / search:rebuild / search:getStatus`。
  - `pnpm --filter @moryflow/pc typecheck` 通过。
- 2026-02-28 Step 3 DONE
  - `main/search-index/store.ts` 升级为 SQLite contentless FTS 存储层（`search_docs + search_fts`），并提供统一 upsert/delete/query API。
  - `main/search-index/file-indexer.ts` 已实现：
    - 全量重建：扫描当前 vault 下 Markdown 文件并写入全文索引；
    - 增量更新：文件新增/修改 upsert，删除时移除索引；
    - stale 文档清理：重建后自动删除已不存在文件的索引项。
  - `main/index.ts` 已把 Vault 文件系统事件接入 `searchIndexService`，实现 Files 索引的实时增量更新。
  - 新增回归测试：`src/main/search-index/file-indexer.test.ts`（重建、删除、非 md 过滤）。
  - 校验：`pnpm --filter @moryflow/pc typecheck` 与上述定向单测通过。
- 2026-02-28 Step 4 DONE
  - `main/search-index/thread-indexer.ts` 已实现 Threads 全文索引：
    - 索引字段包含会话标题 + 全消息文本（user/assistant/tool 全角色）。
    - 执行统一截断策略：单消息 `4KB`、单会话 `256KB`。
    - `__legacy_unscoped__` 会话不入索引，避免跨 vault 污染。
  - 线程增量更新链路已收口到 `chat/broadcast.ts`：所有 `created/updated/deleted` 事件统一触发 `searchIndexService.onSessionUpsert/onSessionDelete`。
  - 新增回归测试：`src/main/search-index/thread-indexer.test.ts`（vault 过滤、截断规则、删除回收）。
  - 校验：`pnpm --filter @moryflow/pc typecheck` 与定向单测通过。
- 2026-02-28 Step 5 DONE
  - `search:query / search:rebuild / search:getStatus` IPC 已完整可用，统一走 `searchIndexService`。
  - 查询预算治理落地：
    - `limitPerGroup` 强制 clamp 到 `<= 10`（总预算上限 20）；
    - `query.length < 2` 直接短路；
    - 仅当前 active vault 可查询。
  - 重建并发治理落地：`rebuildPromise` 锁前移，修复并发双重构建竞态。
  - 错误状态治理落地：query/rebuild 异常统一回写 `state=error` 与 `lastError`。
  - 新增测试：`src/main/search-index/index.test.ts`（idle 自动重建、并发重建去重）。
  - 校验：`pnpm --filter @moryflow/pc exec vitest run src/main/search-index/*.test.ts`、`pnpm --filter @moryflow/pc typecheck` 通过。
- 2026-02-28 Step 6 DONE
  - 新增 `renderer/components/global-search/*`（`index.tsx + use-global-search.ts + const.ts`），完成全局搜索面板 UI。
  - `WorkspaceShellOverlays` 已从 `CommandPalette` 切换到 `GlobalSearchPanel`。
  - 搜索面板结果分组固定为 `Threads` 与 `Files`，彻底移除 Common actions 展示路径。
- 2026-02-28 Step 7 DONE
  - Renderer 接入防抖与过期结果丢弃：`180ms` debounce + `requestId` 序号竞争丢弃。
  - Main 查询层接入 `snippetCache`（LRU，`docId+digest`）、回源预算（`<=20`）与并发上限（`<=4`）。
  - 新增测试：`src/renderer/components/global-search/use-global-search.test.tsx`、`src/main/search-index/query.test.ts`。
- 2026-02-28 Step 8 DONE
  - 搜索结果联动已接入统一 agent 动作：
    - file 命中：切回 Agent + Sidebar Home，并打开文件；
    - thread 命中：切回 Agent + Sidebar Chat，并激活会话。
  - `createAgentActions` 增加 `goToAgent` 依赖，保证跨 destination 一致回跳行为。
- 2026-02-28 Step 9 DONE
  - 删除旧命令面板链路：
    - 删除 `renderer/components/command-palette/*`；
    - 删除 `workspace/hooks/use-workspace-command-actions.ts`；
    - 清理 `commandActions` 在 workspace controller/shell store 的状态字段与同步路径。
  - 相关回归测试已补齐并通过：
    - `src/renderer/workspace/navigation/agent-actions.test.ts`
    - `src/renderer/workspace/stores/workspace-shell-view-store.test.tsx`
    - `src/renderer/components/global-search/use-global-search.test.tsx`
    - `src/main/search-index/*.test.ts`
- 2026-02-28 Step 10 DONE
  - L2 全量校验通过：
    - `pnpm lint`
    - `pnpm typecheck`
    - `pnpm test:unit`
  - 已同步 CLAUDE/docs 索引：
    - `apps/moryflow/pc/src/main/CLAUDE.md`
    - `apps/moryflow/pc/src/renderer/CLAUDE.md`
    - `apps/moryflow/pc/src/renderer/workspace/CLAUDE.md`
    - `apps/moryflow/pc/src/shared/ipc/CLAUDE.md`
    - `docs/design/moryflow/features/index.md`
  - 方案执行状态：Step 1~10 全部完成。
- 2026-03-01 Step 11 DONE
  - 新增“跨语言模糊搜索”二期目标：在现有全局搜索上升级为 `FTS 精确 + N-gram 模糊` 双轨检索。
  - 明确根因收口：修复 `unicode61` 精确 token 导致的“必须整词命中”问题，不再依赖查询侧临时补丁。
  - 冻结执行基线：
    - 保持搜索范围仅当前 active vault；
    - 保持每组最多 10 条；
    - 保持 message 全类型参与线程检索；
    - 保持 renderer 防抖/请求丢弃与 main 端预算控制。
- 2026-03-01 Step 12 DONE
  - `main/search-index/store.ts` 升级为双索引存储层：`search_fts_exact`（unicode61）+ `search_fts_fuzzy`（N-gram token 流）。
  - 新增 `main/search-index/tokenizer.ts`，统一 exact/fuzzy 查询串构造与 N-gram token 生成，消除查询侧临时拼接分散逻辑。
  - 索引写入/删除路径一次性收口：
    - upsert 同步更新 exact 与 fuzzy 两张 FTS；
    - delete 同步清理 exact 与 fuzzy 两张 FTS；
    - schema 版本迁移到 v2，首次升级自动重建索引结构（不保留旧 `search_fts`）。
- 2026-03-01 Step 13 DONE
  - `main/search-index/query.ts` 完成双轨查询编排：
    - 每组按 `limit * 4` 拉取 exact/fuzzy 候选；
    - 按 `docId` 去重合并，排序规则为 `exact 优先 -> 分值 -> updatedAt`；
    - 结果仍按组裁剪到最多 10 条，并复用既有回源预算与并发限制。
  - `score` 输出改为加权分值：exact 权重 `1`，fuzzy 权重 `0.65`，保证精确命中稳定前置。
- 2026-03-01 Step 14 DONE
  - 新增单元测试：`src/main/search-index/tokenizer.test.ts`（跨语言 token 生成与 query 拼装）。
  - 更新回归测试：`src/main/search-index/query.test.ts`（fuzzy 命中、exact 优先、预算与缓存）。
  - 受影响校验通过：
    - `pnpm --filter @moryflow/pc typecheck`
    - `pnpm --filter @moryflow/pc exec vitest run src/main/search-index/query.test.ts src/main/search-index/tokenizer.test.ts`
    - `pnpm --filter @moryflow/pc exec vitest run src/main/search-index/file-indexer.test.ts src/main/search-index/index.test.ts src/main/search-index/query.test.ts src/main/search-index/thread-indexer.test.ts src/main/search-index/tokenizer.test.ts`
- 2026-03-01 Review Fix DONE
  - 修复 `searchIndexService` 三项评审问题：
    - active vault 变化后自动触发重建（避免新 workspace 搜索漏结果）；
    - `state=error` 查询自动重建恢复；
    - 无 workspace 分支确保释放 `rebuildPromise`，避免后续重建锁死。
  - 补齐回归测试：`src/main/search-index/index.test.ts` 新增 vault 切换重建、error 自动恢复、无 workspace 重建解锁场景。
  - 校验通过：
    - `pnpm --filter @moryflow/pc typecheck`
    - `pnpm --filter @moryflow/pc test:unit`
