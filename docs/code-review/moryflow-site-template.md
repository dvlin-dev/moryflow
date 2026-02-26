---
title: Moryflow Site Template Code Review
date: 2026-02-26
scope: apps/moryflow/site-template
status: done
---

<!--
[INPUT]: apps/moryflow/site-template（模块 A：layouts/templates；模块 B：components/styles；模块 C：scripts/生成逻辑）
[OUTPUT]: 模块 A/B/C 问题清单（S1/S2/S3）+ 修复落地记录 + 进度台账
[POS]: Phase 3 / P2 模块审查记录（Moryflow Site Template）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Moryflow Site Template Code Review

## 范围

- 项目：`apps/moryflow/site-template`
- 本轮模块：`src/layouts`、`src/templates`、`src/components`、`src/styles`、`scripts`、`src/build.ts`、`src/scripts`
- 约束：仅处理 `apps/moryflow/site-template`；`apps/anyhunt/docs` 与 `apps/moryflow/docs` 不纳入本轮

## 结论摘要（模块 A：修复完成）

- `S1`（必须改）：2 项
- `S2`（建议本轮改）：3 项
- `S3`（可延后）：1 项
- 当前状态：模块 A 已完成 A-1~A-5 修复落地与文档回写

## 发现（按严重度排序）

- [S1][已修复] 布局模板“双真源”导致语义漂移
  - 证据：
    - 删除 `src/layouts/*`，保留 `src/templates/*` 作为发布模板真源
    - `build` 增加模板契约校验：`src/build.ts:18`、`src/build.ts:79`
  - 修复：
    - 移除 React 布局双轨实现，发布模板统一回到 `src/templates/*`

- [S1][已修复] `layouts` 产物与发布导出链路脱节
  - 证据：
    - `build` 不再产出 `single/multi.html`，只生成样式并做契约校验：`src/build.ts:98`、`src/build.ts:111`
    - `sync` 继续从 `src/templates/*` 导出：`scripts/sync.ts:135`、`scripts/sync.ts:192`
  - 修复：
    - 消除“改 layouts 不生效”的路径，发布链路单一且可验证

- [S2][已修复] 主题切换按钮在多模板重复粘贴
  - 证据：
    - 页面模板改为片段占位：`src/templates/page.html:26`、`src/templates/index-page.html:17`
    - 统一片段源：`src/templates/fragments/theme-toggle-button.html:1`
    - `sync` 片段注入：`scripts/sync.ts:45`、`scripts/sync.ts:88`
  - 修复：
    - 主题按钮维护点收敛为单文件

- [S2][已修复] `MultiPage` 内联样式导致样式源分散
  - 证据：
    - `src/layouts/MultiPage.tsx` 已移除，布局样式统一由 `src/styles` + `src/templates/*.css` 承载
  - 修复：
    - 删除内联样式路径，消除分散样式源

- [S2][已修复] `page.html` 与 `sidebar.html` 插槽契约不显式
  - 证据：
    - 页面插槽注释显式化：`src/templates/page.html:14`
    - 侧边栏片段契约注释：`src/templates/sidebar.html:1`
  - 修复：
    - 明确插槽边界，降低重排误改风险

- [S3][已修复] 品牌外链文案多点硬编码
  - 证据：
    - 模板改为占位：`src/templates/page.html:36`、`src/templates/index-page.html:25`
    - 统一片段源：`src/templates/fragments/brand-footer-link.html:1`
  - 修复：
    - 品牌文案收敛为单一片段源

## 修复执行（模块 A）

1. A-1：删除 `src/layouts/*`，发布模板真源收敛为 `src/templates/*`。
2. A-2：统一 `favicon` 占位写法；在 `sync` 对非 page 模板落地默认值 `/favicon.ico`。
3. A-3：新增模板片段目录 `src/templates/fragments/`，抽离 theme-toggle 与品牌 footer。
4. A-4：移除 `MultiPage` 内联样式来源（随 layouts 删除完成收敛）。
5. A-5：`build` 新增模板契约校验（占位符缺失即失败），并执行模块级命令验证。

## 模块 A 验证命令（修复阶段执行）

```bash
pnpm --filter @moryflow/site-template typecheck
pnpm --filter @moryflow/site-template build
pnpm --filter @moryflow/site-template sync
rg -n "PAGE_TEMPLATE|SIDEBAR_TEMPLATE|INDEX_PAGE_TEMPLATE|ERROR_404_TEMPLATE|THEME_TOGGLE_SCRIPT|favicon" apps/moryflow/pc/src/main/site-publish/template
```

## 验证结果

- `pnpm --filter @moryflow/site-template typecheck`：**pass**
- `pnpm --filter @moryflow/site-template build`：**pass**
- `pnpm --filter @moryflow/site-template sync`：**skip**（本轮按范围仅改 `site-template`，避免触发 `apps/moryflow/pc/src/main/site-publish/template/*` 生成物变更）
- 静态校验：**pass**
  - `src/layouts` 已删除；
  - `page/index/404` 已统一 `{{favicon}}` 占位；
  - `THEME_TOGGLE_BUTTON` / `BRAND_FOOTER_LINK` 片段占位已接入；
  - `build` 契约校验已生效。

## 模块 B 预扫描范围（Step B-0）

- 目录：`src/components`、`src/styles`
- 目标：组件层与样式层职责收敛，清理死代码与交互样式风险

## 结论摘要（模块 B：修复完成）

- `S1`（必须改）：2 项
- `S2`（建议本轮改）：2 项
- `S3`（可延后）：1 项
- 当前状态：模块 B 已完成 B-1~B-5 修复落地与文档回写

## 模块 B 发现与修复（按严重度排序）

- [S1][已修复] `components` 目录成为发布链路“孤岛层”，脚本真源分叉
  - 证据：
    - `src/components/*` 已删除；`src` 目录仅保留 `build.ts` / `main.tsx` / `scripts` / `styles` / `templates`
    - 发布链路脚本真源仍收敛在 `sync.ts`：`scripts/sync.ts:33`、`scripts/sync.ts:35`、`scripts/sync.ts:37`
    - 页面模板直接消费片段占位：`src/templates/page.html:26`、`src/templates/index-page.html:17`
  - 修复：
    - 删除无入口组件层，发布链路维护面收敛到 `templates + styles + sync` 单一真源

- [S1][已修复] 移动端遮罩层默认可点击拦截，存在交互阻断风险
  - 证据：
    - 遮罩默认态改为不可交互：`src/styles/layout.css:172`、`src/styles/layout.css:180`
    - 可见态才恢复交互：`src/styles/layout.css:184`、`src/styles/layout.css:187`
    - 移动端仍按需显示遮罩层：`src/styles/layout.css:296`
    - 模板始终输出遮罩节点：`src/templates/page.html:39`
    - 菜单脚本只切换 `visible` 类，不控制 pointer-events：`scripts/sync.ts:37`
  - 修复：
    - 遮罩由“是否显示”和“是否可点击”双态一致控制，消除透明层误拦截

- [S2][已修复] 组件内联样式与 `app.css` 类样式并存，样式职责双轨
  - 证据：
    - 组件目录移除后，布局样式仅由 `src/styles/*.css` 提供
    - 样式入口文件仅保留 import manifest：`src/styles/app.css:10`、`src/styles/app.css:13`
  - 修复：
    - 删除组件内联样式路径，样式真源收敛为样式分片文件

- [S2][已修复] `app.css` 文件规模过大且职责混排，变更定位成本高
  - 证据：
    - tokens 独立：`src/styles/tokens.css:5`
    - base/utility 独立：`src/styles/base.css:5`
    - layout/navigation/theme/responsive 独立：`src/styles/layout.css:10`
    - `app.css` 收敛为入口 manifest：`src/styles/app.css:10`、`src/styles/app.css:13`
  - 修复：
    - 样式拆分为职责清晰分片，降低跨区块连带修改风险

- [S3][已修复] 移除 TOC 布局后仍保留未使用设计 token
  - 证据：
    - `tokens.css` 中仅保留使用中的布局 token：`src/styles/tokens.css:90`、`src/styles/tokens.css:94`
    - `rg -- "--toc-width" apps/moryflow/site-template/src/styles` 无匹配
  - 修复：
    - 移除未使用 token，减少样式认知噪音

## 修复执行（模块 B）

1. B-1：删除发布链路无入口的 `src/components/*`，移除组件孤岛层。
2. B-2：修复移动端遮罩可点击拦截（默认 `pointer-events: none`，仅 `.visible` 启用）。
3. B-3：统一样式真源（删除组件内联样式路径，样式仅保留 `src/styles/*`）。
4. B-4：拆分 `app.css` 为 `tokens/base/layout` 分片并保留入口 manifest。
5. B-5：清理无效 token（移除 `--toc-width`）并执行模块级验证。

## 模块 B 验证命令（修复阶段执行）

```bash
pnpm --filter @moryflow/site-template typecheck
pnpm --filter @moryflow/site-template build
rg -n "sidebar-overlay|pointer-events|menu-open|theme-toggle|toc-width" apps/moryflow/site-template/src/styles apps/moryflow/site-template/src/templates/page.html
```

## 模块 B 验证结果

- `pnpm --filter @moryflow/site-template typecheck`：**pass**
- `pnpm --filter @moryflow/site-template build`：**pass**
- 静态校验：**pass**
  - `src/components` 已删除；
  - `app.css` 已收敛为 import manifest；
  - `sidebar-overlay` 默认不可交互、`.visible` 才可点击；
  - `--toc-width` 已清理。

## 模块 C 预扫描范围（Step C-0）

- 目录：`scripts`、`src/build.ts`、`src/scripts`
- 目标：生成链路单一真源、可重复产出、同步流程可验证

## 结论摘要（模块 C：修复完成）

- `S1`（必须改）：2 项
- `S2`（建议本轮改）：2 项
- `S3`（可延后）：2 项
- 当前状态：模块 C 已完成 C-1~C-5 修复落地与文档回写

## 模块 C 发现与修复（按严重度排序）

- [S1][已修复] 主题脚本存在“双真源”，易产生发布行为漂移
  - 证据：
    - 主题脚本真源收敛到 `src/scripts/theme.ts`：`src/scripts/theme.ts:7`、`src/scripts/theme.ts:9`
    - `sync.ts` 改为导入主题脚本，而非内联重复定义：`scripts/sync.ts:12`
    - 导出 `scripts.ts` 使用统一来源常量：`scripts/sync.ts:173`、`scripts/sync.ts:177`
  - 修复：
    - 去除主题脚本双轨维护，发布行为与源码保持一致

- [S1][已修复] `sync` 产物非确定性（时间戳 + 非排序读取），引入无意义 diff
  - 证据：
    - 文件头移除动态时间戳：`scripts/sync.ts:26`
    - 片段与模板读取均按字典序排序：`scripts/sync.ts:76`、`scripts/sync.ts:158`
    - 两次 `sync` 定向输出哈希比对无差异（`diff -u /tmp/site-template-sync-hash-1.txt /tmp/site-template-sync-hash-2.txt` 空输出）
  - 修复：
    - `sync` 产物改为可重复、可比对，避免无意义 diff 噪音

- [S2][已修复] `sync` 仅校验 `dist` 存在，不校验是否过期
  - 证据：
    - 新增新鲜度守卫：`scripts/sync.ts:113`
    - 在主流程强制执行守卫：`scripts/sync.ts:147`
    - 守卫失败时给出明确重建指令：`scripts/sync.ts:129`
  - 修复：
    - `sync` 对陈旧 `dist` 显式失败，阻止导出过期样式

- [S2][已修复] `build` 的 CSS import 解析对非相对 import 静默丢弃
  - 证据：
    - import 解析覆盖所有 `@import`：`src/build.ts:84`
    - 非支持 import 改为直接报错：`src/build.ts:90`、`src/build.ts:92`
    - 残留非常规 `@import` 语法也会报错：`src/build.ts:101`、`src/build.ts:103`
  - 修复：
    - 构建阶段对不受支持 import 显式失败，禁止静默吞掉

- [S3][已修复] `sync` 摘要统计的输出文件数量与真实产物不一致
  - 证据：
    - 可选 favicon 仍独立生成：`scripts/sync.ts:185`
    - 摘要改为按可选文件动态统计：`scripts/sync.ts:251`
  - 修复：
    - 同步摘要与真实产物数量一致

- [S3][已修复] `sync.ts` 的示例命令过滤器与包名口径不一致
  - 证据：
    - 注释命令已改为正确过滤器：`scripts/sync.ts:6`
    - 包名仍为 `@moryflow/site-template`：`apps/moryflow/site-template/package.json:2`
  - 修复：
    - 命令口径与包名一致，降低协作噪音

## 修复执行（模块 C）

1. C-1：统一主题脚本真源（`src/scripts/theme.ts`），`sync.ts` 改为消费单一来源导出。
2. C-2：改造 `sync` 为确定性产出（移除时间戳扰动 + 文件列表排序 + 稳定导出顺序）。
3. C-3：增加 `sync` 的样式新鲜度守卫（过期 `dist` 直接失败并提示先执行 `build`）。
4. C-4：收紧 `build` 的 `@import` 解析策略（对不支持来源显式报错，禁止静默吞掉）。
5. C-5：修正摘要计数与命令注释，补充 `SITE_TEMPLATE_OUTPUT_DIR` 本地验证路径并同步 `site-template/CLAUDE.md`。

## 模块 C 验证命令（修复阶段执行）

```bash
pnpm --filter @moryflow/site-template typecheck
pnpm --filter @moryflow/site-template build
SITE_TEMPLATE_OUTPUT_DIR=dist/sync-preview pnpm --filter @moryflow/site-template sync
find apps/moryflow/site-template/dist/sync-preview -type f | sort | xargs shasum > /tmp/site-template-sync-hash-1.txt
SITE_TEMPLATE_OUTPUT_DIR=dist/sync-preview pnpm --filter @moryflow/site-template sync
find apps/moryflow/site-template/dist/sync-preview -type f | sort | xargs shasum > /tmp/site-template-sync-hash-2.txt
diff -u /tmp/site-template-sync-hash-1.txt /tmp/site-template-sync-hash-2.txt
```

## 模块 C 验证结果

- `pnpm --filter @moryflow/site-template typecheck`：**pass**
- `pnpm --filter @moryflow/site-template build`：**pass**
- `SITE_TEMPLATE_OUTPUT_DIR=dist/sync-preview pnpm --filter @moryflow/site-template sync`：**pass**
- 确定性校验：**pass**（两次同步后产物哈希 `diff` 无输出）
- 静态校验：**pass**
  - 主题脚本由 `src/scripts/theme.ts` 单一来源导出；
  - `sync` 已移除时间戳并启用稳定排序；
  - `sync` 已接入 `dist` 新鲜度守卫；
  - `build` 对不支持 `@import` 显式报错；
  - `site-template/CLAUDE.md` 已同步更新。

## 项目复盘（Step R-1）

- 复盘范围：`apps/moryflow/site-template`（`templates/styles/scripts/build/sync` 全链路）
- 复盘结果：未发现新增 `S1/S2/S3` 问题，模块 A/B/C 改造后结构与约束一致
- 最终结论：
  - 发布链路已收敛为 `templates + styles + scripts(theme) + sync/build` 单一真源；
  - `sync` 具备确定性与新鲜度守卫，可避免陈旧样式与无意义 diff；
  - 样式与脚本职责边界清晰，维护入口可预测。

## 项目复盘验证命令

```bash
pnpm --filter @moryflow/site-template typecheck
pnpm --filter @moryflow/site-template build
SITE_TEMPLATE_OUTPUT_DIR=dist/sync-preview pnpm --filter @moryflow/site-template sync
find apps/moryflow/site-template/dist/sync-preview -type f | sort | xargs shasum > /tmp/site-template-review-hash-1.txt
SITE_TEMPLATE_OUTPUT_DIR=dist/sync-preview pnpm --filter @moryflow/site-template sync
find apps/moryflow/site-template/dist/sync-preview -type f | sort | xargs shasum > /tmp/site-template-review-hash-2.txt
diff -u /tmp/site-template-review-hash-1.txt /tmp/site-template-review-hash-2.txt
```

## 项目复盘验证结果

- `typecheck/build/sync`：**pass**
- 产物确定性：**pass**（两次哈希 `diff` 无输出）
- 结项状态：**done**（`site-template` 模块 A/B/C + 项目复盘闭环）

## 分支全量 Review 回合（Step R-2）

- 触发背景：分支全量 code review 发现 1 个 P1 + 2 个 P2（生成物漂移、mtime 守卫脆弱、缺少回归测试）。
- 修复动作：
  1. 同步 `site-template -> pc` 生成物，消除运行时代码与模板真源漂移。
  2. 将 `sync` 新鲜度守卫从 mtime 比较升级为内容比较（基于 `build-utils` 重新计算期望 `styles.min.css`）。
  3. 抽取 `build-utils.ts` 与 `sync-utils.ts` 纯函数模块，并新增 6 条单测覆盖关键链路。
- 关键变更：
  - `apps/moryflow/site-template/src/build-utils.ts`
  - `apps/moryflow/site-template/scripts/sync-utils.ts`
  - `apps/moryflow/site-template/src/build-utils.test.ts`
  - `apps/moryflow/site-template/scripts/sync-utils.test.ts`
  - `apps/moryflow/pc/src/main/site-publish/template/*`（sync 后产物对齐）

## Step R-2 验证命令

```bash
pnpm --filter @moryflow/site-template typecheck
pnpm --filter @moryflow/site-template test:unit
pnpm --filter @moryflow/site-template build
pnpm --filter @moryflow/site-template sync
```

## Step R-2 验证结果

- `typecheck`：**pass**
- `test:unit`：**pass**（6/6）
- `build`：**pass**
- `sync`：**pass**（PC 模板目录已更新到当前真源）

## 进度记录

| Step | Module            | Action                    | Status | Validation                                              | Updated At | Notes                                                                      |
| ---- | ----------------- | ------------------------- | ------ | ------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| A-0  | layouts/templates | 预扫描（仅问题清单）      | done   | n/a                                                     | 2026-02-26 | 输出 `S1x2 / S2x3 / S3x1`，待确认后进入 A-1                                |
| A-1  | layouts/templates | 分步重构与修复（A-1~A-5） | done   | `typecheck` pass + `build` pass；`sync` 按范围 skip     | 2026-02-26 | 完成单一真源收敛、模板片段化、契约校验接入、`site-template/CLAUDE.md` 同步 |
| B-0  | components/styles | 预扫描（仅问题清单）      | done   | n/a                                                     | 2026-02-26 | 输出 `S1x2 / S2x2 / S3x1`，待确认后进入 B-1                                |
| B-1  | components/styles | 分步重构与修复（B-1~B-5） | done   | `typecheck` pass + `build` pass                         | 2026-02-26 | 完成组件孤岛层清理、样式分片收敛、移动端遮罩交互修复、死 token 清理        |
| C-0  | scripts/生成逻辑  | 预扫描（仅问题清单）      | done   | n/a                                                     | 2026-02-26 | 输出 `S1x2 / S2x2 / S3x2`，待确认后进入 C-1                                |
| C-1  | scripts/生成逻辑  | 分步重构与修复（C-1~C-5） | done   | `typecheck` pass + `build` pass + `sync`(定向输出) pass | 2026-02-26 | 完成脚本单一真源、确定性同步、新鲜度守卫与构建 import 显式失败策略         |
| R-1  | project-review    | 项目复盘与结项            | done   | `typecheck` + `build` + `sync` + 双次哈希比对 pass      | 2026-02-26 | `site-template` 模块 A/B/C 全部闭环，无新增问题                            |
| R-2  | branch-review     | 全量 review 问题修复收口  | done   | `typecheck` + `test:unit` + `build` + `sync` pass       | 2026-02-26 | 修复生成物漂移、内容级新鲜度守卫、补齐生成链路回归测试                     |
