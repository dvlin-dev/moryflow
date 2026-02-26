---
title: 前端组件优化专项执行计划（按项目/按模块）
date: 2026-02-25
scope: apps frontend
status: active
---

<!--
[INPUT]: apps/ 目录前端项目组件复杂度问题（大组件、过度拆分、Props drilling）
[OUTPUT]: 可执行的分项目分模块改造计划 + 进度台账 + 回写规则
[POS]: 前端组件优化专项总入口（执行与追踪）

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`。
-->

# 前端组件优化专项执行计划（按项目/按模块）

## 0. 盘点结论（apps 目录）

- `apps/` 下应用项目（含 server/worker）共 **14** 个（按 `package.json` 统计）。
- 其中前端项目共 **10** 个：
  1. `apps/anyhunt/admin/www`（`@anyhunt/admin`）
  2. `apps/anyhunt/console`（`@anyhunt/console`）
  3. `apps/anyhunt/docs`（`@anyhunt/docs`）
  4. `apps/anyhunt/www`（`@anyhunt/anyhunt-www`）
  5. `apps/moryflow/admin`（`@moryflow/admin`）
  6. `apps/moryflow/docs`（`@moryflow/docs`）
  7. `apps/moryflow/mobile`（`@moryflow/mobile`）
  8. `apps/moryflow/pc`（`@moryflow/pc`）
  9. `apps/moryflow/site-template`（`@moryflow/site-template`）
  10. `apps/moryflow/www`（`@moryflow/www`）

## 0.1 对话启动前必读（规范入口）

> 任何新对话在执行本专项前，必须先阅读以下文档并输出“规范对齐摘要”。

1. 仓库协作总规范：`AGENTS.md`、`CLAUDE.md`
2. 前端组件规范：`docs/guides/frontend/component-design-quality-index.md`
3. 全量审查索引与状态口径：`docs/code-review/index.md`
4. 本专项执行台账：`docs/code-review/frontend-component-optimization-rollout.md`
5. 已完成示例（参考执行方式）：`docs/code-review/anyhunt-console.md`

### 启动口径（建议直接复用到新对话）

1. 先读上述文档，再开始扫描。
2. 先做模块预扫描（不改代码），输出 `S1/S2/S3`（含文件与行号）。
3. 回写台账后停下，等确认再进入分步修复。
4. 多状态 UI 禁止链式三元，统一“状态片段 + `renderContentByState/switch`”。

## 1. 固定执行流程（每个项目都一样）

1. **项目预扫描（不改代码）**：只产出模块问题清单（按 `S1/S2/S3` 分级）。
2. **模块化改造（一次只改一个模块）**：每轮只处理一个小模块，避免上下文过载。
3. **模块验证**：按风险等级执行校验（L0/L1/L2）。
4. **进度回写**：模块结束立即更新本台账（状态、问题、修复、验证结果）。
5. **项目复盘 Review**：该项目所有模块完成后，做一次整项目一致性复查。
6. **再进入下一个项目**：禁止跨项目并行重构。

## 2. 单模块作业 DoD（完成定义）

1. 组件职责边界已收敛（容器/编排/展示分层明确）。
2. Props drilling（跨 2 层以上）已消除或被 ViewModel/对象化参数替代。
3. 过度拆分的胶水组件已合并，或大组件已拆分为有语义子模块。
4. 受影响范围测试通过（至少受影响包 `typecheck` + `test:unit`，L0 可按规范豁免）。
5. 本文档“执行进度台账”已更新。

## 3. 项目执行顺序与模块拆分

> 规则：先完成一个项目，再切下一个项目；每个项目内也是一个模块一个模块完成。

### P1 - `apps/anyhunt/console`

1. 模块 A：`api-keys / settings / webhooks`
2. 模块 B：`scrape / crawl / search / map / extract playground`
3. 模块 C：`memox / embed playground`
4. 模块 D：`agent-browser-playground`
5. 模块 E：`playground-shared / stores / 页面编排`
6. 项目复盘：整项目组件边界一致性复查

### P2 - `apps/anyhunt/admin/www`

1. 模块 A：`dashboard / users / subscriptions / orders`
2. 模块 B：`jobs / queues / logs / browser / llm`
3. 模块 C：`digest-* 系列`
4. 模块 D：`shared components / stores / 页面装配`
5. 项目复盘：整项目一致性复查

### P3 - `apps/anyhunt/www`

1. 模块 A：`reader-shell / layout / routes`
2. 模块 B：`inbox / digest / subscriptions`
3. 模块 C：`explore / topic / welcome`
4. 模块 D：`stores / hooks / 数据映射`
5. 项目复盘：整项目一致性复查

### P4 - `apps/moryflow/pc`

1. 模块 A：`auth / settings-dialog / payment-dialog`
2. 模块 B：`chat-pane / input-dialog / command-palette`
3. 模块 C：`editor / workspace`
4. 模块 D：`cloud-sync / share / site-publish / vault-files`
5. 模块 E：`renderer hooks / contexts / transport / stores`
6. 项目复盘：整项目一致性复查

### P5 - `apps/moryflow/mobile`

1. 模块 A：`app/(auth) / app/(tabs)`
2. 模块 B：`app/(editor) / components/editor / components/chat`
3. 模块 C：`components/settings / components/navigation / components/ui`
4. 模块 D：`lib/stores + methods + api（含 server/chat/cloud-sync）`
5. 模块 E：`agent-runtime / vault / cloud-sync`
6. 项目复盘：整项目一致性复查

### P6 - `apps/moryflow/admin`

1. 模块 A：`auth / dashboard / users`
2. 模块 B：`payment / providers / models / storage`
3. 模块 C：`chat / agent-traces / alerts / admin-logs`
4. 模块 D：`sites / image-generation / shared`
5. 项目复盘：整项目一致性复查

### P7 - `apps/moryflow/www`

1. 模块 A：`landing / layout / seo components`
2. 模块 B：`routes / hooks / lib`
3. 模块 C：`页面装配与状态边界`
4. 项目复盘：整项目一致性复查

### P8 - `apps/moryflow/site-template`

1. 模块 A：`layouts / templates`
2. 模块 B：`components / styles`
3. 模块 C：`scripts / 生成逻辑`
4. 项目复盘：整项目一致性复查

### P9 - `apps/anyhunt/docs`（已忽略）

- 按当前执行决策，本轮前端组件优化专项不覆盖 `apps/anyhunt/docs`。
- 原因：优先收敛业务主项目（console/admin/www），docs 站点暂不纳入改造范围。

### P10 - `apps/moryflow/docs`（已忽略）

- 按当前执行决策，本轮前端组件优化专项不覆盖 `apps/moryflow/docs`。
- 原因：优先收敛业务主项目（pc/mobile/admin/www/site-template），docs 站点暂不纳入改造范围。

## 4. 执行进度台账（每步必回写）

| Step | Project                | Module                                              | Action                                       | Status | Validation                                                                                                                                                                                                                                                                                                                      | Updated At | Notes                                                                                                                                                                                                                                                                                 |
| ---- | ---------------------- | --------------------------------------------------- | -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | all                    | 计划建档                                            | 创建执行计划与台账                           | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-25 | 本文档创建                                                                                                                                                                                                                                                                            |
| 1    | anyhunt/console        | 模块 A（api-keys/settings/webhooks）                | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-25 | 输出 `S1x3 / S2x2`，详见 `docs/code-review/anyhunt-console.md`                                                                                                                                                                                                                        |
| 2    | anyhunt/console        | 模块 A（api-keys/settings/webhooks）                | 分步重构与修复                               | done   | `pnpm --filter @anyhunt/console lint` + `typecheck` + `test:unit`（pass）                                                                                                                                                                                                                                                       | 2026-02-25 | 完成 `S1x3 / S2x2` 修复，含回归测试                                                                                                                                                                                                                                                   |
| 2-1  | anyhunt/console        | 模块 A（api-keys/settings/webhooks）                | 状态渲染规范补充 + 变更区同类问题补扫修复    | done   | `pnpm --filter @anyhunt/console lint` + `typecheck` + `test:unit`（pass）                                                                                                                                                                                                                                                       | 2026-02-25 | 新增“状态片段化 + `renderContentByState` + 禁止链式三元”并落地到已改组件                                                                                                                                                                                                              |
| 3    | anyhunt/console        | 模块 B（scrape/crawl/search/map/extract）           | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-25 | 输出 `S1x3 / S2x2`，详见 `docs/code-review/anyhunt-console.md`                                                                                                                                                                                                                        |
| 4    | anyhunt/console        | 模块 B（scrape/crawl/search/map/extract）           | 分步重构与修复                               | done   | `pnpm --filter @anyhunt/console lint` + `typecheck` + `test:unit`（pass）                                                                                                                                                                                                                                                       | 2026-02-25 | B-1~B-6 全部完成：`ScrapeForm`/`ScrapeResult`/`ExtractPlaygroundPage` 拆分，统一 API Key 选择收敛，新增 `PlaygroundPageShell` 并接入 `Map/Search/Extract`，补扫并清理残留状态三元                                                                                                     |
| 5    | anyhunt/console        | 模块 C（memox/embed playground）                    | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-25 | 输出 `S1x3 / S2x3`，详见 `docs/code-review/anyhunt-console.md`                                                                                                                                                                                                                        |
| 6    | anyhunt/console        | 模块 C（memox/embed playground）                    | 分步重构与修复（C-1~C-5 + review follow-up） | done   | `pnpm --filter @anyhunt/console lint` + `typecheck` + `test:unit`（pass）                                                                                                                                                                                                                                                       | 2026-02-25 | C-1~C-5 全部完成，并在 follow-up 收敛：`Memories` 请求启用边界、`Memories/Entities/Graph/Embed` API Key 选择复用、Graph 可视化继续拆分减责；模块 C 回归 15 files / 55 tests 全通过                                                                                                    |
| 7    | anyhunt/console        | 模块 D（agent-browser-playground）                  | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 输出 `S1x3 / S2x3`，详见 `docs/code-review/anyhunt-console.md`                                                                                                                                                                                                                        |
| 8    | anyhunt/console        | 模块 D（agent-browser-playground）                  | 分步重构与修复（D-1~D-6）                    | done   | `pnpm --filter @anyhunt/console lint` + `typecheck` + `test:unit`（pass）                                                                                                                                                                                                                                                       | 2026-02-26 | D-1~D-6c 全部完成：`browser-session-sections` 17 分区拆分、`BrowserSessionPanel` 收敛为容器装配层、operation handlers 分域 hooks 化、`browser-api` 再拆分为 `session/observability/storage` 三域 + 客户端辅助层；模块 D 范围内单文件全部 `< 300`                                      |
| 9    | anyhunt/console        | 模块 E（playground-shared/stores/页面编排）         | 预扫描 + 分步重构与修复（E-0~E-2）           | done   | `pnpm --filter @anyhunt/console lint` + `typecheck` + `test:unit`（pass）                                                                                                                                                                                                                                                       | 2026-02-26 | 新增 `PlaygroundLoadingState`、`PlaygroundCodeExampleCard`；`Scrape/Crawl` 页面迁移到 `PlaygroundPageShell`；新增 `scrape/crawl` 请求区与结果区组件并统一状态分发                                                                                                                     |
| 10   | anyhunt/console        | 项目复盘（整项目一致性）                            | 全项目 Review（A~E）                         | done   | `pnpm --filter @anyhunt/console lint` + `typecheck` + `test:unit`（pass）                                                                                                                                                                                                                                                       | 2026-02-26 | `anyhunt/console` 已完成首个项目闭环：模块 A~E 全部完成并回写；进入下一个项目时沿用同一流程模板                                                                                                                                                                                       |
| 11   | anyhunt/console        | 项目收口（状态片段化补扫）                          | 补扫已改范围并修复同类问题                   | done   | `pnpm --filter @anyhunt/console lint` + `typecheck` + `test:unit`（pass）                                                                                                                                                                                                                                                       | 2026-02-26 | `AgentBrowserLayoutPage` 布局模式改为状态片段独立渲染，移除 UI 条件混排；总索引与专项台账同步为“1/2/3 全流程完成”                                                                                                                                                                     |
| 12   | anyhunt/docs           | 项目范围调整                                        | 忽略本项目（不纳入本轮专项）                 | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 按用户确认，`apps/anyhunt/docs` 从本轮组件优化专项中移除                                                                                                                                                                                                                              |
| 13   | moryflow/docs          | 项目范围调整                                        | 忽略本项目（不纳入本轮专项）                 | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 按用户确认，`apps/moryflow/docs` 从本轮组件优化专项中移除                                                                                                                                                                                                                             |
| 14   | moryflow/pc            | 模块 A（auth/settings-dialog/payment-dialog）       | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 输出 `S1x4 / S2x2 / S3x2`，详见 `docs/code-review/moryflow-pc.md`；已给出 `A-1~A-6` 修复计划与验证命令                                                                                                                                                                                |
| 15   | moryflow/pc            | 模块 A（auth/settings-dialog/payment-dialog）       | 分步重构与修复（A-1~A-6）                    | done   | `pnpm --filter @moryflow/pc typecheck`（fail，缺少 node_modules） + `pnpm --filter @moryflow/pc test:unit`（fail，`vitest` 缺失）                                                                                                                                                                                               | 2026-02-26 | A-1~A-6 全部代码改造完成：`ProviderDetails/LoginPanel/McpDetails` 拆分，`McpSection/CloudSyncSection/SectionContent/PaymentDialog` 状态收敛，`AddModelDialog/EditModelDialog` 迁移到 RHF + zod/v3；待依赖安装后补齐验证                                                               |
| 16   | moryflow/pc            | 模块 B（chat-pane/input-dialog/command-palette）    | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 输出 `S1x3 / S2x3 / S3x2`，详见 `docs/code-review/moryflow-pc.md`；已给出 `B-1~B-6` 修复计划与验证命令                                                                                                                                                                                |
| 17   | moryflow/pc            | 模块 B（chat-pane/input-dialog/command-palette）    | 一次性重构与修复（B-1~B-6）                  | done   | `pnpm --filter @moryflow/pc typecheck`（fail，缺少 node_modules 与 workspace 依赖） + `pnpm --filter @moryflow/pc test:unit`（fail，`vitest` 缺失）                                                                                                                                                                             | 2026-02-26 | B-1~B-6 全部完成：`ChatPane/ChatPromptInput/ChatMessage` 分层拆分；`PlusMenu` 配置化；`useChatSessions` 生命周期显式化；`InputDialog` 关闭链路去重并新增回归测试；`McpPanel/TaskHoverPanel` 状态分发去链式三元                                                                        |
| 18   | moryflow/pc            | 模块 C（editor/workspace）                          | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 输出 `S1x3 / S2x3 / S3x2`，详见 `docs/code-review/moryflow-pc.md`；已给出 `C-1~C-6` 一次性修复计划与验证命令                                                                                                                                                                          |
| 19   | moryflow/pc            | 模块 C（editor/workspace）                          | 一次性重构与修复（C-1~C-6）                  | done   | `pnpm --filter @moryflow/pc typecheck`（fail，缺少 node_modules 与 workspace 依赖） + `pnpm --filter @moryflow/pc test:unit`（fail，`vitest` 缺失） + `pnpm --filter @moryflow/pc test:unit -- src/renderer/workspace`（fail，`vitest` 缺失）                                                                                   | 2026-02-26 | C-1~C-6 全部完成：`DesktopWorkspaceShell` 三层拆分、`useDocumentState` 副作用分段、`handle.ts` 编排层瘦身、`Sidebar/EditorPanel` 状态分发收敛、`useVaultTreeState` effect 分层、`NotionEditor` 配置与加载态外提；待依赖安装后补齐验证                                                 |
| 20   | moryflow/pc            | 模块 B（chat-pane/input-dialog/command-palette）    | follow-up（参数收敛复检）                    | done   | `pnpm --filter @moryflow/pc typecheck`（fail，缺少 node_modules 与 workspace 依赖）                                                                                                                                                                                                                                             | 2026-02-26 | `ChatMessage` 继续收敛：新增 `MessageBodyModel` 分组模型与 `useMessageToolModel`，`MessageBody/ToolPart` 改为对象化参数输入；并完成 `apps/moryflow/pc/src/renderer` 同类问题扫描                                                                                                      |
| 21   | moryflow/pc            | 模块 B/C/E（store-first）                           | 二次改造方案设计（待审核）                   | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 已回写“仅 store（禁用新增 context）”方案：`SF-1~SF-4` 覆盖 `ChatFooter/PromptOverlays/FileContextPanel/WorkspaceShellMainContent/AgentSubPanels/ProviderDetailsPreset`，详见 `docs/code-review/moryflow-pc.md`                                                                        |
| 22   | moryflow/pc            | 模块 B/C/E + 模块 A follow-up（store-first）        | 二次改造执行（SF-1~SF-4）                    | done   | `pnpm --filter @moryflow/pc typecheck`（fail，缺少 node_modules 与 workspace 依赖）                                                                                                                                                                                                                                             | 2026-02-26 | 已落地 `chat-pane-footer-store/chat-prompt-overlay-store/workspace-shell-view-store/sidebar-panels-store`；`WorkspaceShellMainContent/WorkspaceShellOverlays/AgentSubPanels/ChatFooter/PromptOverlays` 改为 selector 取数；`ProviderDetailsPreset` 收敛为 `form/list/dialog` 三段模型 |
| 23   | moryflow/site-template | 模块 A（layouts/templates）                         | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 输出 `S1x2 / S2x3 / S3x1`，详见 `docs/code-review/moryflow-site-template.md`                                                                                                                                                                                                          |
| 24   | moryflow/site-template | 模块 A（layouts/templates）                         | 分步重构与修复（A-1~A-5）                    | done   | `pnpm --filter @moryflow/site-template typecheck`（pass） + `build`（pass） + `sync`（skip，避免跨目录生成物变更）                                                                                                                                                                                                              | 2026-02-26 | 完成模板单一真源收敛（移除 `src/layouts`）、`head` 占位契约统一、模板片段化注入、`build` 契约校验接入，并同步 `apps/moryflow/site-template/CLAUDE.md`                                                                                                                                 |
| 25   | moryflow/site-template | 模块 B（components/styles）                         | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 输出 `S1x2 / S2x2 / S3x1`，详见 `docs/code-review/moryflow-site-template.md`                                                                                                                                                                                                          |
| 26   | moryflow/site-template | 模块 B（components/styles）                         | 分步重构与修复（B-1~B-5）                    | done   | `pnpm --filter @moryflow/site-template typecheck`（pass） + `build`（pass）                                                                                                                                                                                                                                                     | 2026-02-26 | 完成 `src/components` 孤岛层清理、`app.css` 分片重构（tokens/base/layout）、移动端遮罩 `pointer-events` 修复、`--toc-width` 清理，并同步 `apps/moryflow/site-template/CLAUDE.md`                                                                                                      |
| 27   | moryflow/site-template | 模块 C（scripts/生成逻辑）                          | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 输出 `S1x2 / S2x2 / S3x2`，详见 `docs/code-review/moryflow-site-template.md`                                                                                                                                                                                                          |
| 28   | moryflow/site-template | 模块 C（scripts/生成逻辑）                          | 分步重构与修复（C-1~C-5）                    | done   | `pnpm --filter @moryflow/site-template typecheck`（pass） + `build`（pass） + `sync`（定向输出，pass）                                                                                                                                                                                                                          | 2026-02-26 | 完成主题脚本单一真源、`sync` 稳定排序与去时间戳、`dist` 新鲜度守卫、`build` import 显式失败策略、输出计数修正，并同步 `apps/moryflow/site-template/CLAUDE.md`                                                                                                                         |
| 29   | moryflow/site-template | 项目复盘（整项目一致性）                            | 全项目 Review（A/B/C）                       | done   | `pnpm --filter @moryflow/site-template typecheck`（pass） + `build`（pass） + `sync`（定向输出，双次哈希一致）                                                                                                                                                                                                                  | 2026-02-26 | `site-template` 已完成模块 A/B/C 与项目收口，专项结项                                                                                                                                                                                                                                 |
| 30   | moryflow/site-template | 分支全量 review 回合                                | 问题修复收口（R-2）                          | done   | `pnpm --filter @moryflow/site-template typecheck` + `test:unit` + `build` + `sync`（pass）                                                                                                                                                                                                                                      | 2026-02-26 | 修复全量 review 发现项：PC 模板生成物漂移、`sync` mtime 守卫脆弱；补齐 build/sync 回归单测并同步 `site-template/CLAUDE.md`                                                                                                                                                            |
| 31   | moryflow/pc            | 模块 D（cloud-sync/share/site-publish/vault-files） | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 输出 `S1x3 / S2x3 / S3x1`，详见 `docs/code-review/moryflow-pc.md`；给出 `D-1~D-6` 一次性修复计划                                                                                                                                                                                      |
| 32   | moryflow/pc            | 模块 D（cloud-sync/share/site-publish/vault-files） | 一次性重构与修复（D-1~D-6）                  | done   | `pnpm --filter @moryflow/pc typecheck`（fail，`node_modules` 缺失）                                                                                                                                                                                                                                                             | 2026-02-26 | 完成 `vault-files` store-first（移除 Context）、`cloud-sync` 容器化拆分、`site-list/publish-dialog` 状态机与大文件拆分；`share` 复扫无新增 S1/S2 问题                                                                                                                                 |
| 33   | moryflow/pc            | 模块 D（cloud-sync/share/site-publish/vault-files） | follow-up（稳定性回归）                      | done   | `pnpm --filter @moryflow/pc typecheck`（pass） + `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/site-publish/use-site-publish.test.tsx src/renderer/components/settings-dialog/components/cloud-sync-section-model.test.ts src/renderer/components/vault-files/handle.test.ts`（pass）                     | 2026-02-26 | 修复 `cloud-sync-section` 条件 `return` 后 hook 顺序风险，新增 `cloud-sync-section-model` 纯函数与单测；补齐 `vault-files/handle` 回归测试并通过                                                                                                                                      |
| 34   | moryflow/pc            | 模块 E（renderer hooks/contexts/transport/stores）  | 预扫描（仅问题清单）                         | done   | n/a                                                                                                                                                                                                                                                                                                                             | 2026-02-26 | 输出 `S1x2 / S2x1 / S3x1`：核心问题为 workspace controller/shell 仍使用 Context，且存在未引用 context 死代码                                                                                                                                                                          |
| 35   | moryflow/pc            | 模块 E（renderer hooks/contexts/transport/stores）  | 一次性重构与修复（E-1~E-4）                  | done   | `pnpm --filter @moryflow/pc typecheck`（pass） + `pnpm --filter @moryflow/pc exec vitest run src/renderer/workspace/components/sites/index.test.tsx src/renderer/workspace/hooks/use-navigation.test.tsx src/renderer/workspace/hooks/use-document-state.test.tsx src/renderer/workspace/hooks/use-vault-tree.test.tsx`（pass） | 2026-02-26 | 完成 workspace controller/shell 去 Context 化（store-first），删除 `renderer/contexts/app-context.tsx`，并同步 `workspace/CLAUDE.md` 边界说明                                                                                                                                         |
| 36   | moryflow/pc            | 项目复盘（整项目一致性）                            | 全项目 Review（A/B/C/D/E）                   | done   | `pnpm exec turbo run lint --filter=@moryflow/pc`（pass） + `pnpm --filter @moryflow/pc typecheck`（pass） + `pnpm --filter @moryflow/pc test:unit`（pass）                                                                                                                                                                      | 2026-02-26 | 复盘结论：无新增 S1；清理 `chat-pane-portal` 多状态链式三元并抽离 `chat-pane-portal-model`；`@moryflow/pc` 专项闭环完成                                                                                                                                                               |
| 37   | moryflow/pc            | 分支全量 Code Review follow-up                      | 按 findings 一次性修复                       | done   | `pnpm --filter @moryflow/pc typecheck`（pass） + `pnpm --filter @moryflow/pc test:unit`（pass）                                                                                                                                                                                                                                 | 2026-02-26 | 修复 workspace provider render-phase store 写入（迁移到 `useLayoutEffect`）、恢复 `useWorkspaceCommandActions` 的 workspace key 强类型、为 `chat-pane-footer-store/chat-prompt-overlay-store` 增加 `shouldSync` 快照比较                                                              |

## 5. 回写格式（统一）

每完成一步，至少补充以下信息：

1. `Status`：`todo / in_progress / done / blocked`
2. `Action`：`scan / refactor / review`
3. `Validation`：执行了哪些命令与结果（pass/fail）
4. `Notes`：本步结论（例如 `S1x2/S2x3 已修复`）

---

最后更新：2026-02-26
