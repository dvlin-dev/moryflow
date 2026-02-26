---
title: Anyhunt Console Code Review
date: 2026-02-25
scope: apps/anyhunt/console
status: done
---

<!--
[INPUT]: apps/anyhunt/console（重点：api-keys、settings、webhooks）
[OUTPUT]: 问题清单 + 分级 + 分步修复计划 + 进度记录
[POS]: Phase 3 / P2 模块审查记录（Anyhunt Console）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Console Code Review

## 范围

- 项目：`apps/anyhunt/console`
- 本轮模块：`src/features/api-keys`、`src/features/settings`、`src/features/webhooks`
- 页面入口：`src/pages/ApiKeysPage.tsx`、`src/pages/SettingsPage.tsx`、`src/pages/WebhooksPage.tsx`
- 审查基线：`docs/guides/frontend/component-design-quality-index.md`

### 模块 B 预扫描范围（Step 3）

- 特性目录：
  - `src/features/scrape-playground`
  - `src/features/crawl-playground`
  - `src/features/search-playground`
  - `src/features/map-playground`
  - `src/features/extract-playground`
- 页面入口：
  - `src/pages/ScrapePlaygroundPage.tsx`
  - `src/pages/CrawlPlaygroundPage.tsx`
  - `src/pages/SearchPlaygroundPage.tsx`
  - `src/pages/MapPlaygroundPage.tsx`
  - `src/pages/ExtractPlaygroundPage.tsx`

### 模块 C 预扫描范围（Step 5）

- 特性目录：
  - `src/features/memox`
  - `src/features/embed-playground`
- 页面入口：
  - `src/pages/MemoxPlaygroundPage.tsx`
  - `src/pages/MemoriesPage.tsx`
  - `src/pages/EntitiesPage.tsx`
  - `src/pages/GraphPage.tsx`
  - `src/pages/EmbedPlaygroundPage.tsx`

### 模块 D 预扫描范围（Step 7）

- 特性目录：
  - `src/features/agent-browser-playground`
- 页面入口：
  - `src/pages/agent-browser/*`

## 结论摘要（模块 A：修复完成）

- `S1`（必须改）：3 项
- `S2`（建议本轮改）：2 项
- `S3`（可延后）：0 项
- 当前状态：模块 A 已完成修复并通过模块级校验
- 补充动作：已按新准则完成“状态片段化 + renderByState”补扫，清理改动区同类状态三元渲染点

## 结论摘要（模块 B：修复完成）

- `S1`（必须改）：3 项
- `S2`（建议本轮改）：2 项
- `S3`（可延后）：0 项
- 当前状态：模块 B 已完成修复并通过模块级校验

## 结论摘要（模块 C：修复完成）

- `S1`（必须改）：3 项
- `S2`（建议本轮改）：3 项
- `S3`（可延后）：0 项
- 当前状态：模块 C 已完成修复并通过模块级校验（C-1~C-5）

## 结论摘要（模块 D：修复完成）

- `S1`（必须改）：3 项
- `S2`（建议本轮改）：3 项
- `S3`（可延后）：0 项
- 当前状态：模块 D 已完成修复并通过模块级校验（D-1~D-6c 全部完成）

## 结论摘要（模块 E：修复完成）

- `S1`（必须改）：0 项
- `S2`（建议本轮改）：3 项
- `S3`（可延后）：0 项
- 当前状态：模块 E 已完成修复并通过模块级校验（E-0~E-2 全部完成）

## 发现（按严重度排序）

- [S1][已修复] `WebhooksPage` 单文件复杂度超阈值，职责混杂
  - 证据：
    - 文件行数 `327`（阈值：>300 必须拆分）
    - 同文件同时承担 API Key 选择、Webhook 列表渲染、行级操作、4 个对话框状态编排
  - 定位：
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:52`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:124`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:175`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:299`
  - 风险：
    - 维护成本高，后续改动容易引入回归；不符合“容器/编排/展示分层”约束

- [S1][已修复] 表单实现违反“RHF + zod”强制规范（使用多处 `useState` 管理表单）
  - 证据：
    - `Settings` 页面 Profile/Security 表单均为手写受控输入
    - `CreateApiKeyDialog`、`CreateWebhookDialog`、`EditWebhookDialog` 同样使用 `useState` 管理表单字段
  - 定位：
    - `apps/anyhunt/console/src/pages/SettingsPage.tsx:60`
    - `apps/anyhunt/console/src/pages/SettingsPage.tsx:139`
    - `apps/anyhunt/console/src/features/api-keys/components/create-api-key-dialog.tsx:29`
    - `apps/anyhunt/console/src/features/webhooks/components/create-webhook-dialog.tsx:28`
    - `apps/anyhunt/console/src/features/webhooks/components/edit-webhook-dialog.tsx:62`
  - 风险：
    - 校验与类型推断分散，后续字段扩展容易出现重复逻辑与漏校验

- [S1][已修复] Webhook API Key 选择存在“失效值可继续使用”的状态漏洞
  - 证据：
    - 下拉选项只展示 `activeKeys`，但选中值用 `selectedKeyId || activeKeys[0]?.id`
    - `selectedKey` 从 `apiKeys`（全量）查找，导致选中值失效后仍可能取到非 active key
  - 定位：
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:62`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:63`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:64`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:147`
  - 风险：
    - UI 与真实可选项不一致；会出现“下拉不含该值但请求仍使用该 key”的行为

- [S2][已修复] `WebhooksPage` 对话框状态使用 4 个布尔开关，状态模型可读性差
  - 证据：
    - `create/edit/delete/regenerate` 四个开关 + `selectedWebhook` 并存
  - 定位：
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:53`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:54`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:55`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:56`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:57`
  - 建议：
    - 收敛为判别状态（`dialog: { type: 'create'|'edit'|'delete'|'regenerate'|null, webhookId?: string }`）

- [S2][已修复] Webhook create/edit 表单字段与事件选择逻辑重复
  - 证据：
    - 两个对话框各自维护 `name/url/events` 与 `handleEventToggle`
  - 定位：
    - `apps/anyhunt/console/src/features/webhooks/components/create-webhook-dialog.tsx:28`
    - `apps/anyhunt/console/src/features/webhooks/components/create-webhook-dialog.tsx:34`
    - `apps/anyhunt/console/src/features/webhooks/components/edit-webhook-dialog.tsx:62`
    - `apps/anyhunt/console/src/features/webhooks/components/edit-webhook-dialog.tsx:68`
  - 建议：
    - 抽离共享 `WebhookFormFields`（展示）+ `schemas.ts`（校验）+ RHF 表单状态

## 分步修复计划（模块 A）

1. A-1：重构 `WebhooksPage` 结构，拆分为 `KeySelectorCard`、`WebhookTable`、`WebhookDialogs` 三段（先不改交互语义）。
2. A-2：修复 API Key 选中状态漏洞，确保“当前值必须属于 active keys”。
3. A-3：把 `settings/api-keys/webhooks` 的表单统一迁移到 RHF + `zod/v3`。
4. A-4：抽离 Webhook create/edit 共享字段组件与 schema，消除重复逻辑。
5. A-5：模块回归与一致性复查（组件边界、props、状态模型）。

## 模块 B 预扫描发现（按严重度排序）

- [S1][已修复] `ScrapeForm` 单文件复杂度严重超阈值，职责混杂
  - 证据：
    - 文件行数 `519`（阈值：>300 必须拆分）
    - 同文件同时承担：API Key 选择、6 组表单片段渲染、请求参数编排、设备/格式联动
    - 同时维护 5 个折叠开关状态（`formatOpen/viewportOpen/contentOpen/waitOpen/screenshotOpen`）
  - 定位：
    - `apps/anyhunt/console/src/features/scrape-playground/components/scrape-form.tsx:64`
    - `apps/anyhunt/console/src/features/scrape-playground/components/scrape-form.tsx:71`
    - `apps/anyhunt/console/src/features/scrape-playground/components/scrape-form.tsx:105`
    - `apps/anyhunt/console/src/features/scrape-playground/components/scrape-form.tsx:202`
  - 风险：
    - 需求迭代时改动面过大，参数编排与视图联动易引入回归

- [S1][已修复] `ScrapeResult` 超大组件，状态分支与展示片段耦合
  - 证据：
    - 文件行数 `357`（阈值：>300 必须拆分）
    - 同组件承载：失败态、成功态摘要、6 类内容 Tab、计时统计、预览弹窗
    - Tab 默认值使用链式三元（违反“多状态 UI 禁止链式三元”）
  - 定位：
    - `apps/anyhunt/console/src/features/scrape-playground/components/scrape-result.tsx:28`
    - `apps/anyhunt/console/src/features/scrape-playground/components/scrape-result.tsx:97`
    - `apps/anyhunt/console/src/features/scrape-playground/components/scrape-result.tsx:139`
    - `apps/anyhunt/console/src/features/scrape-playground/components/scrape-result.tsx:259`
  - 风险：
    - 展示逻辑不可维护，新增格式/结果态时极易扩散修改

- [S1][已修复] `ExtractPlaygroundPage` 超阈值且“编排 + 表单 + 结果渲染”混在页面层
  - 证据：
    - 文件行数 `302`（阈值：>300 必须拆分）
    - 页面层同时承担 API Key 选择编排、Schema JSON 解析校验、请求映射、结果渲染
  - 定位：
    - `apps/anyhunt/console/src/pages/ExtractPlaygroundPage.tsx:51`
    - `apps/anyhunt/console/src/pages/ExtractPlaygroundPage.tsx:71`
    - `apps/anyhunt/console/src/pages/ExtractPlaygroundPage.tsx:123`
    - `apps/anyhunt/console/src/pages/ExtractPlaygroundPage.tsx:260`
  - 风险：
    - 页面职责边界失焦，复用和单测切分困难

- [S2][已修复] Playground API Key 选中逻辑在 5 个页面重复实现，易产生行为漂移
  - 证据：
    - 每个页面都手写 `effectiveKeyId + selectedKey + apiKeyValue + apiKeyDisplay`
    - 当前实现未统一复用模块 A 已落地的 active-key 收敛策略
  - 定位：
    - `apps/anyhunt/console/src/pages/ScrapePlaygroundPage.tsx:19`
    - `apps/anyhunt/console/src/pages/CrawlPlaygroundPage.tsx:19`
    - `apps/anyhunt/console/src/pages/MapPlaygroundPage.tsx:47`
    - `apps/anyhunt/console/src/pages/ExtractPlaygroundPage.tsx:58`
    - `apps/anyhunt/console/src/pages/SearchPlaygroundPage.tsx:46`
  - 风险：
    - 同类页面行为不一致，后续修复需多点同步，容易漏改

- [S2][已修复] Map/Search/Extract 页面“请求区 + 代码示例 + 结果区”结构高度重复
  - 证据：
    - 三个页面重复同一版式：API Key + 表单 + 提交按钮 + CodeExample + Error/Empty/Success 卡片
    - 复用层级停留在字段级（`ApiKeySelector`、`CollapsibleSection`），页面编排未收敛
  - 定位：
    - `apps/anyhunt/console/src/pages/MapPlaygroundPage.tsx:99`
    - `apps/anyhunt/console/src/pages/ExtractPlaygroundPage.tsx:123`
    - `apps/anyhunt/console/src/pages/SearchPlaygroundPage.tsx:96`
  - 风险：
    - 同步改版成本高，交互一致性容易失衡

## 分步修复计划（模块 B）

1. B-1：拆分 `ScrapeForm`（参数映射方法 + 表单片段组件 + 折叠状态对象化）。（已完成）
2. B-2：拆分 `ScrapeResult`（状态卡、内容 Tabs、Timing、Preview Dialog），移除链式三元。（已完成）
3. B-3：拆分 `ExtractPlaygroundPage`（容器编排层 + request/result 子组件）。（已完成）
4. B-4：抽离 Playground 共用 API Key 选择收敛方法，统一 active-key 行为。（已完成）
5. B-5：抽离 Map/Search/Extract 的共用页面编排壳层（请求区/示例区/结果区）。（已完成）
6. B-6：模块级回归（`@anyhunt/console` lint/typecheck/test:unit）。（已完成）

## 模块 C 预扫描发现（按严重度排序）

- [S1][已修复] `MemoxPlaygroundPage` 文件体量失控且职责混杂
  - 证据：
    - 文件行数 `1152`（阈值：>300 必须拆分）
    - 页面层同时承载 API Key 选择、create/search 双表单、请求映射、JSON 解析、CodeExample 映射、结果渲染
    - 文件尾部仍内联 `MemoryCard` / `MemorySearchResultCard` 展示组件，容器/展示边界未分离
  - 定位：
    - `apps/anyhunt/console/src/pages/MemoxPlaygroundPage.tsx:114`
    - `apps/anyhunt/console/src/pages/MemoxPlaygroundPage.tsx:163`
    - `apps/anyhunt/console/src/pages/MemoxPlaygroundPage.tsx:335`
    - `apps/anyhunt/console/src/pages/MemoxPlaygroundPage.tsx:1068`
  - 风险：
    - 任何字段改动都会触发大面积修改；回归成本高，易引入隐性回归

- [S1][已修复] `GraphPage` 超阈值，查询编排与图谱渲染强耦合
  - 证据：
    - 文件行数 `405`（阈值：>300 必须拆分）
    - 页面层混合了：API Key 选择、表单提交编排、ResizeObserver、canvas 节点绘制、hover/click 交互、图谱状态渲染
    - 渲染逻辑与数据编排无隔离，难以单测和复用
  - 定位：
    - `apps/anyhunt/console/src/pages/GraphPage.tsx:104`
    - `apps/anyhunt/console/src/pages/GraphPage.tsx:118`
    - `apps/anyhunt/console/src/pages/GraphPage.tsx:164`
    - `apps/anyhunt/console/src/pages/GraphPage.tsx:327`
  - 风险：
    - 图谱交互/性能优化会与业务改动互相干扰，维护复杂度持续上升

- [S1][已修复] `Embed` 模块表单与 key 选择不符合强制规范
  - 证据：
    - `EmbedForm` 使用多处 `useState` 管理业务表单字段，未采用 `RHF + zod/v3`
    - API Key 下拉展示了全部 key（含 inactive），与“仅 active key 可用”约束不一致
    - 页面默认 key 逻辑可回落到非 active key（`firstActiveKey || apiKeys[0]`）
  - 定位：
    - `apps/anyhunt/console/src/features/embed-playground/components/embed-form.tsx:42`
    - `apps/anyhunt/console/src/features/embed-playground/components/embed-form.tsx:73`
    - `apps/anyhunt/console/src/pages/EmbedPlaygroundPage.tsx:26`
  - 风险：
    - 行为与其他 playground 不一致，且会引入“可选中但不可用”的 API Key 体验偏差

- [S2][已修复] `memox/embed` 五个页面重复实现 API Key 选择推导，行为易漂移
  - 证据：
    - 页面内重复手写 `activeKeys/effectiveKeyId/selectedKey/apiKeyValue/apiKeyDisplay`
    - 未复用已收敛的 `resolveActiveApiKeySelection`
  - 定位：
    - `apps/anyhunt/console/src/pages/MemoxPlaygroundPage.tsx:126`
    - `apps/anyhunt/console/src/pages/MemoriesPage.tsx:43`
    - `apps/anyhunt/console/src/pages/EntitiesPage.tsx:69`
    - `apps/anyhunt/console/src/pages/GraphPage.tsx:108`
    - `apps/anyhunt/console/src/pages/EmbedPlaygroundPage.tsx:31`
  - 风险：
    - 同类页面 key 行为不一致，后续修复要多点同步，容易漏改

- [S2][已修复] 多页面仍使用状态渲染型三元分支，未收敛为状态片段化
  - 证据：
    - `MemoriesPage` / `EntitiesPage` / `GraphPage` / `EmbedPlaygroundPage` 存在连续状态三元（no-key/loading/error/empty/ready）
    - 与“多状态 UI 必须 `renderContentByState + switch`”准则不一致
  - 定位：
    - `apps/anyhunt/console/src/pages/MemoriesPage.tsx:171`
    - `apps/anyhunt/console/src/pages/EntitiesPage.tsx:152`
    - `apps/anyhunt/console/src/pages/GraphPage.tsx:371`
    - `apps/anyhunt/console/src/pages/EmbedPlaygroundPage.tsx:117`
  - 风险：
    - 分支可读性差，状态扩展时更易引入逻辑遗漏

- [S2][已修复] Memox 请求映射与结果展示存在重复实现
  - 证据：
    - `MemoxPlaygroundPage` 内同时维护 create/search 的请求映射 + code example 映射，存在重复 JSON parse 片段
    - 页面内联 `MemoryCard` 与 `MemorySearchResultCard`，与 `features/memox/components` 的展示层未形成统一
  - 定位：
    - `apps/anyhunt/console/src/pages/MemoxPlaygroundPage.tsx:173`
    - `apps/anyhunt/console/src/pages/MemoxPlaygroundPage.tsx:908`
    - `apps/anyhunt/console/src/pages/MemoxPlaygroundPage.tsx:1068`
    - `apps/anyhunt/console/src/features/memox/components/memory-card.tsx:13`
  - 风险：
    - 展示风格和映射行为分叉，维护成本高且难统一演进

## 分步修复计划（模块 C）

1. C-1：拆分 `MemoxPlaygroundPage` 为容器层 + create/search 请求区 + 结果区 + request mapper（含 CodeExample 映射）。（已完成）
2. C-2：统一 `memox/embed` 页面 API Key 选择到 `resolveActiveApiKeySelection`，清理页面内重复推导。（已完成）
3. C-3：重构 `GraphPage`（查询表单 / 图谱画布 / 视图状态分发分层）。（已完成）
4. C-4：重构 `Embed`（迁移到 RHF + zod/v3，收敛 active-key only，状态片段化）。（已完成）
5. C-5：模块级回归（`@anyhunt/console` lint/typecheck/test:unit）与一致性复查。（已完成）

## 模块 D 预扫描发现（按严重度排序）

- [S1][已修复] `BrowserSessionPanel` 超大单体，表单/请求编排/状态/UI 装配强耦合
  - 证据：
    - `browser-session-panel.tsx` 已从 `1157` 行收敛到 `103` 行（容器装配层）
    - 分区 JSX 抽离到 `browser-session-panel-content.tsx`（`288` 行）
    - 业务 handler 拆分为按域 hooks：`open/tab-window/intercept-network/diagnostics/data`，单文件均 `< 300` 行
  - 定位：
    - `apps/anyhunt/console/src/features/agent-browser-playground/components/browser-session-panel.tsx:1`
    - `apps/anyhunt/console/src/features/agent-browser-playground/components/browser-session-panel-content.tsx:1`
    - `apps/anyhunt/console/src/features/agent-browser-playground/hooks/use-browser-session-operation-actions.ts:1`
  - 风险：
    - 已通过分层拆分显著降低回归面，后续变更可按域独立演进

- [S1][已修复] `browser-session-sections.tsx` 单文件承载 17 个 UI 分区，语义边界过宽
  - 证据：
    - 历史文件行数 `2115`，经 D-4a~D-4e 五轮拆分后降至 `45`
    - 17 个分区组件已全部迁移到 `components/browser-session-sections/*.tsx`，聚合文件仅保留导入导出
  - 定位：
    - `apps/anyhunt/console/src/features/agent-browser-playground/components/browser-session-sections.tsx:1`
    - `apps/anyhunt/console/src/features/agent-browser-playground/components/browser-session-sections.tsx:9`
    - `apps/anyhunt/console/src/features/agent-browser-playground/components/browser-session-sections.tsx:28`
  - 风险：
    - 组件职责不清晰，难以按业务域演进与复用

- [S1][已修复] `AgentBrowserLayoutPage` API Key 选择可回落到 inactive key，且上下文可用状态判断不一致
  - 证据：
    - 默认 key 使用 `selected || firstActive || apiKeys[0]`，会在无 active key 时回落到 inactive key
    - `hasApiKeys` 使用 `apiKeys.length > 0`，与“仅 active key 可用”约束冲突
  - 定位：
    - `apps/anyhunt/console/src/pages/agent-browser/AgentBrowserLayoutPage.tsx:27`
    - `apps/anyhunt/console/src/pages/agent-browser/AgentBrowserLayoutPage.tsx:31`
  - 风险：
    - UI 提示与真实请求能力不一致，可能出现“有 key 但不可执行”误导

- [S2][已修复] `api.ts` 同时承载 Browser 与 Agent API，边界混合
  - 证据：
    - 文件行数 `440`，共 45 个导出函数
    - `estimateAgentCost/listAgentModels/executeAgentTask` 与 Browser API 同文件并存
  - 定位：
    - `apps/anyhunt/console/src/features/agent-browser-playground/api.ts:61`
    - `apps/anyhunt/console/src/features/agent-browser-playground/api.ts:403`
  - 风险：
    - 变更影响面不透明，后续分域维护困难

- [S2][已修复] Session/Window 参数构建逻辑重复，JSON 校验与 options 组装可复用性不足
  - 证据：
    - `handleCreateSession` 与 `handleCreateWindow` 重复处理 permissions/headers/geolocation/httpCredentials/recordVideo
  - 定位：
    - `apps/anyhunt/console/src/features/agent-browser-playground/components/browser-session-panel.tsx:423`
    - `apps/anyhunt/console/src/features/agent-browser-playground/components/browser-session-panel.tsx:714`
  - 风险：
    - 双处演进容易漏改并引入行为漂移

- [S2][已修复] `FlowRunner` 将流程状态机、请求编排与表单 UI 聚合在单组件
  - 证据：
    - `flow-runner.tsx` 从 `325` 行降到 `181` 行
    - 表单/步骤展示/类型与纯函数分别拆分到 `flow-runner-form.tsx`、`flow-runner-step-list.tsx`、`flow-runner-types.ts`、`flow-runner-helpers.ts`
    - `BrowserSessionPanel` 的 19 组表单初始化与 session 同步副作用抽离到 `hooks/use-browser-session-forms.ts`
  - 定位：
    - `apps/anyhunt/console/src/features/agent-browser-playground/components/flow-runner.tsx:29`
    - `apps/anyhunt/console/src/features/agent-browser-playground/components/flow-runner-form.tsx:1`
    - `apps/anyhunt/console/src/features/agent-browser-playground/components/flow-runner-step-list.tsx:1`
    - `apps/anyhunt/console/src/features/agent-browser-playground/hooks/use-browser-session-forms.ts:1`
  - 风险：
    - 测试粒度粗，步骤扩展时复杂度持续上升

## 分步修复计划（模块 D）

1. D-1：修复 `AgentBrowserLayoutPage` 的 key 选择收敛（active-key only）并补回归测试。（已完成）
2. D-2：抽离 Session/Window 共用请求参数 mapper，去重 JSON 校验与 options 组装。（已完成）
3. D-3：按域拆分 `BrowserSessionPanel`（状态容器/handler methods/section 装配）。（已完成：section 状态容器 + 结果状态 + lifecycle handlers 均已抽离）
4. D-4：拆分 `browser-session-sections.tsx` 为多文件域组件并保留统一导出入口。（已完成：17 个分区组件全部独立文件化，聚合文件收敛为导出层）
5. D-5：拆分 `api.ts` 为 `browser-api.ts` + `agent-api.ts`（保留兼容导出层）。（已完成）
6. D-6：模块级回归（`@anyhunt/console` lint/typecheck/test:unit）与一致性复查。（已完成：D-6a~D-6c，含 `BrowserSessionPanel`/`browser-api`/Session&Windows 分区二次减责）

## 模块 E 预扫描发现（按严重度排序）

- [S2][已修复] `Scrape/Crawl` 页面仍保留旧版手工编排，未复用 `PlaygroundPageShell`
  - 证据：
    - `ScrapePlaygroundPage`、`CrawlPlaygroundPage` 手写双栏布局 + 请求区 + 结果区 + CodeExample 卡片
    - 与 `Map/Search/Extract` 页面编排范式不一致
  - 定位：
    - `apps/anyhunt/console/src/pages/ScrapePlaygroundPage.tsx:1`
    - `apps/anyhunt/console/src/pages/CrawlPlaygroundPage.tsx:1`
  - 风险：
    - 页面改版成本高，交互一致性易漂移

- [S2][已修复] Playground loading 与 code-example 卡片重复实现
  - 证据：
    - 多页面重复 `Loading...` 容器卡片和 `Code Example` 卡片骨架
  - 定位：
    - `apps/anyhunt/console/src/pages/MapPlaygroundPage.tsx:1`
    - `apps/anyhunt/console/src/pages/SearchPlaygroundPage.tsx:1`
    - `apps/anyhunt/console/src/pages/ExtractPlaygroundPage.tsx:1`
  - 风险：
    - UI 一致性依赖人工同步，易出现细节漂移

- [S2][已修复] `Scrape/Crawl` 结果区状态分发散落在页面层
  - 证据：
    - 页面中直接维护 error/empty/success 三态渲染
    - 与“页面层只编排、状态分发收敛到 feature 组件”准则不一致
  - 定位：
    - `apps/anyhunt/console/src/pages/ScrapePlaygroundPage.tsx:1`
    - `apps/anyhunt/console/src/pages/CrawlPlaygroundPage.tsx:1`
  - 风险：
    - 页面职责膨胀，复用困难

## 分步修复计划（模块 E）

1. E-0：模块 E 预扫描（`playground-shared / stores / 页面编排`）并产出问题分级。（已完成）
2. E-1：统一 Playground 页面壳层与共享片段（loading/code example），并将 `Scrape/Crawl` 迁移到同一编排范式。（已完成）
3. E-2：模块级回归与项目复盘前校验（`@anyhunt/console` lint/typecheck/test:unit）。（已完成）

## 进度记录

| Step | Module | Action | Status | Validation | Updated At | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A-0 | api-keys/settings/webhooks | 预扫描（不改代码） | done | n/a | 2026-02-25 | 识别 `S1x3 / S2x2` |
| A-1 | api-keys/settings/webhooks | 分步重构与修复 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `S1x3 / S2x2` 已修复；新增 `webhooks/utils.test.ts` 回归测试 |
| A-1b | api-keys/settings/webhooks | 状态渲染准则补扫修复（变更区） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `create-api-key-dialog`、`webhook-api-key-card`、`WebhooksPage` 等已改为显式状态片段/渲染方法 |
| B-0 | scrape/crawl/search/map/extract | 预扫描（不改代码） | done | n/a | 2026-02-25 | 识别 `S1x3 / S2x2` |
| B-1 | scrape/crawl/search/map/extract | 拆分 `ScrapeForm`（mapper + sections + 折叠状态对象化） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `scrape-form.tsx` 从 519 行降到 175 行，片段拆为 `scrape-form-*` 子文件 |
| B-2 | scrape/crawl/search/map/extract | 拆分 `ScrapeResult`（cards + tabs + view-model） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `scrape-result.tsx` 从 357 行降到 60 行，移除默认 Tab 链式三元并拆分为 `scrape-result-*` 子文件 |
| B-3 | scrape/crawl/search/map/extract | 拆分 `ExtractPlaygroundPage`（container + request/result components） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `ExtractPlaygroundPage.tsx` 从 302 行降到 164 行；新增 `extract-request-card` 与 `extract-result-panel` |
| B-4 | scrape/crawl/search/map/extract | 统一 Playground API Key 选择收敛（`resolveActiveApiKeySelection`） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `Scrape/Crawl/Map/Search/Extract` 页面统一复用 active-key 收敛方法；`webhooks/utils.ts` 改为复用 `api-keys/utils` |
| B-5 | scrape/crawl/search/map/extract | 抽离共用页面壳层与状态片段化补扫 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | 新增 `PlaygroundPageShell` 并接入 `Map/Search/Extract`；`ApiKeySelector`、`CrawlForm`、`Map/Search` 页面残留状态三元改为命名片段/渲染方法 |
| B-6 | scrape/crawl/search/map/extract | 模块级回归与一致性复查 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | 模块 B 全量步骤闭环，测试 12 files / 42 tests 全通过 |
| C-0 | memox/embed playground | 预扫描（不改代码） | done | n/a | 2026-02-25 | 识别 `S1x3 / S2x3` |
| C-1 | memox/embed playground | 拆分 `MemoxPlaygroundPage`（container + request/result components + request mappers） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `MemoxPlaygroundPage.tsx` 从 1152 行降到 192 行；新增 `playground-schemas`、`playground-request-mapper`、`memox-playground-*` 组件与 mapper 单测 |
| C-2 | memox/embed playground | 统一 `memox/embed` 页面 API Key 选择收敛（`resolveActiveApiKeySelection`） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `Memox/Memories/Entities/Graph/Embed` 页面统一移除重复 key 推导，全部复用 active-key 收敛方法 |
| C-3 | memox/embed playground | 重构 `GraphPage`（查询卡片 + 图谱可视化卡片 + 状态分发） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | 新增 `graph-schemas`（含 mapper 单测）与 `memox-graph-*` 组件，`GraphPage` 收敛为容器层 |
| C-4 | memox/embed playground | 重构 `Embed`（RHF + zod/v3 + active-key only + 状态片段化） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | 新增 `embed-playground/schemas`（含单测）；`EmbedForm` 迁移 RHF；`EmbedPlaygroundPage` 改为 `switch` 状态渲染 |
| C-5 | memox/embed playground | 模块级回归与一致性复查 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | 模块 C 全量步骤闭环，测试 15 files / 55 tests 全通过 |
| C-5b | memox/embed playground | review follow-up 修复（请求启用边界 + API Key 选择复用 + Graph 可视化继续减责） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `Memories` 列表请求改为 `apiKey + userId` 才启用；`Memories/Entities/Graph/Embed` 统一复用 `ApiKeySelector`；Graph 可视化拆为 view-model/states/hooks |
| D-0 | agent-browser-playground | 预扫描（不改代码） | done | n/a | 2026-02-26 | 识别 `S1x3 / S2x3`，确认优先修复 active-key 选择一致性与超大组件分层 |
| D-1 | agent-browser-playground | 修复 `AgentBrowserLayoutPage` active-key only + 回归测试 | done | `pnpm --filter @anyhunt/console typecheck` / `test:unit` | 2026-02-26 | `AgentBrowserLayoutPage` 改为复用 `resolveActiveApiKeySelection`，移除 inactive key 回落；新增 `AgentBrowserLayoutPage.test.tsx`（2 tests）回归覆盖 |
| D-2 | agent-browser-playground | 抽离 Session/Window 参数 mapper，去重校验与 options 组装 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `browser-context-options.ts` + `browser-context-options.test.ts`；`BrowserSessionPanel` 的 `handleCreateSession/handleCreateWindow` 统一复用 mapper |
| D-3a | agent-browser-playground | 抽离 BrowserSessionPanel 的 section 状态容器（配置 + open-state hook） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `browser-session-section-config.ts` 与 `use-browser-session-section-open-state.ts`；替换 `BrowserSessionPanel` 内 17 个 section 开关 `useState` |
| D-3b | agent-browser-playground | 抽离 BrowserSessionPanel 结果状态与生命周期 handlers | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `use-browser-session-panel-results.ts` 与 `use-browser-session-lifecycle-actions.ts`；`BrowserSessionPanel` 改为装配层调用 hooks，会话 close 重置逻辑收敛为单一方法 |
| D-4a | agent-browser-playground | 拆分 `browser-session-sections` 首批分区组件（Streaming/CDP） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `components/browser-session-sections/streaming-section.tsx` 与 `cdp-section.tsx`；`browser-session-sections.tsx` 改为聚合导出与装配 |
| D-4b | agent-browser-playground | 拆分 `browser-session-sections` 第二批分区组件（Storage/Profile） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `components/browser-session-sections/storage-section.tsx` 与 `profile-section.tsx`；`browser-session-sections.tsx` 继续收敛为聚合装配层 |
| D-4c | agent-browser-playground | 拆分 `browser-session-sections` 第三批分区组件（Intercept/Headers/NetworkHistory/Diagnostics） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `components/browser-session-sections/intercept-section.tsx`、`headers-section.tsx`、`network-history-section.tsx`、`diagnostics-section.tsx`；`browser-session-sections.tsx` 从 1773 行降到 1299 行，并将检测风险状态渲染改为方法化 |
| D-4d | agent-browser-playground | 拆分 `browser-session-sections` 第四批分区组件（Session/Tabs/Windows） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `components/browser-session-sections/session-section.tsx`、`tabs-section.tsx`、`windows-section.tsx`；`browser-session-sections.tsx` 从 1299 行降到 494 行，进一步收敛为导入装配层 |
| D-4e | agent-browser-playground | 拆分 `browser-session-sections` 第五批分区组件（OpenUrl/Snapshot/Delta/Action/ActionBatch/Screenshot）并收敛聚合入口 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `open-url-section.tsx`、`snapshot-section.tsx`、`delta-snapshot-section.tsx`、`action-section.tsx`、`action-batch-section.tsx`、`screenshot-section.tsx`；`browser-session-sections.tsx` 从 494 行降到 45 行 |
| D-5 | agent-browser-playground | 拆分 API 文件（Browser/Agent 分域 + 兼容导出层） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `browser-api.ts`、`agent-api.ts`，`api.ts` 改为兼容导出层；`browser-session-panel`/`flow-runner`/`use-agent-models` 改为分域导入 |
| D-6a | agent-browser-playground | 一致性复查第一轮：`FlowRunner` 分层 + `BrowserSessionPanel` 表单初始化抽离 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `flow-runner-form.tsx`、`flow-runner-step-list.tsx`、`flow-runner-types.ts`、`flow-runner-helpers.ts`；`flow-runner.tsx` 收敛为编排层；新增 `hooks/use-browser-session-forms.ts` 抽离 19 组表单与 session 同步副作用 |
| D-6b | agent-browser-playground | 一致性复查第二轮：`BrowserSessionPanel` JSX 装配抽离 + operation handlers 分域拆分 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `browser-session-panel-content.tsx`；`browser-session-panel.tsx` 收敛到 103 行；新增 `use-browser-session-open-actions.ts`、`use-browser-session-tab-window-actions.ts`、`use-browser-session-observability-actions.ts`、`use-browser-session-data-actions.ts` |
| D-6c | agent-browser-playground | 一致性复查第三轮：超阈值残留清理（API 分层 + Session/Windows 分区再减责） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | `browser-api.ts` 拆分为 `browser-session-api.ts`/`browser-observability-api.ts`/`browser-storage-api.ts` + `browser-api-client.ts`；`session-section.tsx`/`windows-section.tsx` 二次拆分为 context 字段片段；模块 D 范围内文件全部收敛到 `< 300` 行 |
| E-0 | playground-shared/stores/页面编排 | 预扫描（不改代码） | done | n/a | 2026-02-26 | 识别 `S2x3`（`Scrape/Crawl` 编排未统一、loading/code-example 重复、结果状态分发散落页面层） |
| E-1 | playground-shared/stores/页面编排 | 分步重构与修复 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `PlaygroundLoadingState`、`PlaygroundCodeExampleCard`；`Scrape/Crawl` 页面迁移到 `PlaygroundPageShell`；新增 `scrape-request-card/scrape-result-panel`、`crawl-request-card/crawl-result-panel` |
| E-2 | playground-shared/stores/页面编排 | 模块级回归与一致性复查 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | 模块 E 修复闭环，页面编排范式在 `Scrape/Crawl/Map/Search/Extract` 达成一致 |
| P1-R | anyhunt/console | 项目复盘（整项目一致性复查） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | A/B/C/D/E 全部完成；`agent-browser + playground-shared + 页面编排` 范围内无 `>300` 单文件残留，状态分发统一为片段化渲染方法 |
| P1-R2 | anyhunt/console | 项目收口补扫（状态片段化） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-26 | `AgentBrowserLayoutPage` 布局分支改为独立状态片段返回，移除 UI 条件混排；总索引与专项计划同步为“1/2/3 全流程完成” |

## 项目复盘（P1）

- 结论：`apps/anyhunt/console` 本轮组件优化专项已闭环（A~E + 项目复盘完成）。
- 一致性：页面层统一“容器编排 + feature 请求区/结果区 + shared shell”，多状态 UI 统一“状态片段 + 渲染方法”。
- 补扫：项目收口阶段已完成同类模式补扫，`AgentBrowserLayoutPage` 迁移为显式状态片段渲染。
- 复杂度：`agent-browser + playground-shared + 页面编排` 范围内单文件阈值已收敛（无 `>300` 残留）。

## 验证记录

- `pnpm --filter @anyhunt/console lint`：pass
- `pnpm --filter @anyhunt/console typecheck`：pass
- `pnpm --filter @anyhunt/console test:unit`：pass
- 说明：工作树依赖安装时因全仓 postinstall 触发外部数据缺失报错，改用 `pnpm install --ignore-scripts` 完成本模块校验环境准备。
