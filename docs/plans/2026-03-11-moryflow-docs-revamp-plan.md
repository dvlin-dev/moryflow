# Moryflow Docs Revamp Frozen Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 一次性完成 Moryflow 全量 docs 改造，修正文档失真、补齐缺失事实源、收缩过时专题，并统一去掉新版本不再使用的旧视觉口径。

**Architecture:** 这次改造只动文档，不动产品代码。执行顺序固定为：先读现状，再修索引，再修 WWW，再补 PC，再收口历史文档。所有变更都回写到稳定事实源正文、必要索引和已经失真的 `CLAUDE.md`；不把执行过程写进 design/runbook 正文。

**Tech Stack:** Markdown, repo docs conventions, Electron/React code reading, TanStack Start route reading, ripgrep

---

## 1. 冻结范围

这次改造的目标不是“补几篇文档”，而是把当前仓库里 Moryflow docs 的主干梳理到可继续维护的状态。

本次必须完成：

1. 修正 Moryflow Features 索引。
2. 重写 Moryflow WWW 当前架构事实源。
3. 重写 Moryflow WWW SEO 内容规范。
4. 新增 PC 账号与会员事实源。
5. 新增 PC 设置体系信息架构事实源。
6. 收口 Chat 输入与 Pre-thread 文档边界。
7. 清理所有“新版本已无旧视觉占位”的文档口径。
8. 收缩 Features 下历史 `completed` 专题的索引暴露面。

本次明确不做：

1. 不把尚未落地的 Memory 设计提前写入 `docs/design/*`。
2. 不把执行日志写进正式 design/reference/runbook。
3. 不为了“看起来完整”保留旧版页面、旧版配图描述、旧版 IA 描述。

## 2. 冻结决策

这些决策已经定稿，执行时不要再反复讨论：

1. 新版本官网文档不再出现“产品大图占位”“后续补图”“Hero 视觉位”“配图区域”等表述。
2. 官网文档允许保留 `ogImage` 这类 SEO 元数据字段，但不能再把“单页 OG 待设计”写成当前事实。
3. `chat-input-and-chat-pane.md` 作为 PC Chat 主事实源；`pre-thread-explore-panel.md` 不再作为平级主文档维护。
4. `features/index.md` 按当前产品路径组织，不按历史专题堆叠。
5. 每个执行任务完成后，都要回写本计划中的进度区，只写当前状态和结果，不写流水账。

## 3. 执行纪律

1. 每一步开始前，先读指定代码和文档，不猜。
2. 每一步只改当前任务涉及的文档，不顺手扩散。
3. 每一步完成后，同步更新本文件的“执行进度”表和该任务下的“完成记录”。
4. 如果发现某个 `CLAUDE.md` 已失真，和正文一起修；如果没失真，不动。
5. 正文语气保持人工写作风格：短句、清楚、少套话，不写 AI 腔。

## 4. 执行进度

| Task | 状态 | 结果摘要 |
| ---- | ---- | -------- |
| 0. 前置阅读与范围确认 | DONE | 已完成 docs 规则、Features 索引、WWW registry 与 PC settings schema 的前置阅读。 |
| 1. 修正 Features 索引 | DONE | 已按当前产品路径重排索引，并补上缺失的 Pre-thread 入口。 |
| 2. 重写 WWW 架构文档 | DONE | 已按当前页面体系、首页顺序、导航入口和下载口径重写正文，并同步修正 WWW CLAUDE。 |
| 3. 重写 WWW SEO 规范 | DONE | 已按当前 `site-pages.ts` 契约、内链和 CTA 规则重写规范。 |
| 4. 清理旧视觉口径 | DONE | 已从本次交付涉及的稳定事实源中移除旧视觉占位和未来补图口径。 |
| 5. 新增 PC 账号与会员文档 | DONE | 已新增账号页事实源，覆盖登录、注册、会员、积分与删号链路。 |
| 6. 新增 PC 设置体系文档 | DONE | 已新增设置 IA 文档，明确 section 顺序、职责和滚动版式边界。 |
| 7. 收口 Chat / Pre-thread 文档 | DONE | 已把 pre-thread 合并进 Chat 主文档，并删除平级旧文档。 |
| 8. 收缩历史 completed 专题 | DONE | 已把历史专题从逐条主入口降级为归档说明，仅保留仍被引用的主文档。 |
| 9. 全量回读与索引复核 | DONE | 已完成全文回读、索引复核、文件存在性检查和旧图像口径终检。 |

状态只允许使用：`TODO` / `DOING` / `DONE` / `BLOCKED`

## 5. 前置阅读顺序

执行前必须按顺序读这些内容。

### 5.1 先读 docs 规则

1. `docs/index.md`
2. `docs/reference/collaboration-and-delivery.md`
3. `docs/reference/repository-context.md`

### 5.2 再读当前 Moryflow 设计与索引

1. `docs/design/moryflow/core/index.md`
2. `docs/design/moryflow/features/index.md`
3. `docs/design/moryflow/runbooks/index.md`
4. `docs/design/moryflow/features/moryflow-www-agent-first-site-architecture.md`
5. `docs/reference/moryflow-www-seo-content-guidelines.md`
6. `docs/design/moryflow/features/chat-input-and-chat-pane.md`
7. 执行开始时还需读取 `docs/design/moryflow/features/pre-thread-explore-panel.md`；该文档已在 `Task 7` 收口删除

### 5.3 最后读代码事实源

#### WWW

1. `apps/moryflow/www/src/lib/site-pages.ts`
2. `apps/moryflow/www/src/lib/homepage-sections.ts`
3. `apps/moryflow/www/src/components/layout/Header.tsx`
4. `apps/moryflow/www/src/components/layout/Footer.tsx`
5. `apps/moryflow/www/src/routes/{-$locale}/index.tsx`
6. `apps/moryflow/www/src/routes/{-$locale}/download.tsx`
7. `apps/moryflow/www/src/routes/{-$locale}/pricing.tsx`
8. `apps/moryflow/www/CLAUDE.md`

#### PC

1. `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts`
2. `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
3. `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/index.tsx`
4. `apps/moryflow/pc/src/renderer/workspace/components/skills/index.tsx`
5. `apps/moryflow/pc/src/renderer/workspace/components/sites/index.tsx`
6. `apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts`
7. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account-section.tsx`
8. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/`
9. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers-section.tsx`
10. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp-section.tsx`
11. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx`
12. `apps/moryflow/pc/src/renderer/components/chat-pane/components/pre-thread-view.tsx`
13. `apps/moryflow/pc/src/renderer/components/chat-pane/components/pre-thread-explore-panel/const.ts`
14. `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`

## 6. 旧视觉口径清理范围

这部分必须在执行中显式处理。

已确认需要清理或改写旧视觉口径的稳定文档：

1. `docs/design/moryflow/features/moryflow-www-agent-first-site-architecture.md`
2. `apps/moryflow/www/CLAUDE.md`

执行时要顺手核对这些实现/文本源，避免新文档继续引用旧视觉心智：

1. `apps/moryflow/www/src/components/landing/AgentFirstHero.tsx`
2. `apps/moryflow/www/src/components/landing/FeatureAgents.tsx`
3. `apps/moryflow/www/src/components/landing/FeaturePublish.tsx`
4. `apps/moryflow/www/src/lib/i18n.ts`

处理原则：

1. 文档不再描述视觉占位、配图 alt、待补图。
2. 如果代码里还有图像占位，那是实现事实；文档只能写“当前首页为纯文案和功能区块组合”，不能继续写“预留产品大图位”。
3. 旧的 `docs/plans/www-*proposal.md` 不作为事实源，不需要为了历史方案保留旧视觉口径。

## 7. 执行步骤

### Task 0: 前置阅读与范围确认

**Files:**
- Read: `docs/index.md`
- Read: `docs/reference/collaboration-and-delivery.md`
- Read: `docs/design/moryflow/features/index.md`
- Read: `apps/moryflow/www/src/lib/site-pages.ts`
- Read: `apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts`

**Step 1: 读取 docs 规则与 Moryflow 当前索引**

Run:

```bash
sed -n '1,220p' docs/index.md
sed -n '1,260p' docs/reference/collaboration-and-delivery.md
sed -n '1,240p' docs/design/moryflow/features/index.md
```

**Step 2: 读取 WWW 与 PC 的主事实源**

Run:

```bash
sed -n '1,240p' apps/moryflow/www/src/lib/site-pages.ts
sed -n '1,220p' apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts
```

**Step 3: 把 Task 0 状态改为 `DONE`**

同步本文件：

- `Task 0` 状态改为 `DONE`
- `结果摘要` 写明已确认阅读范围

**完成标准**

- 后续任务不再需要扩展阅读清单
- 读什么、按什么顺序执行已经固定

**完成记录**

- 状态：DONE
- 完成内容：已完成 docs 规则、Moryflow Features 索引、WWW registry 和 PC settings schema 的前置阅读，并确认执行范围。
- 偏差：无

### Task 1: 修正 Features 索引

**Files:**
- Modify: `docs/design/moryflow/features/index.md`

**Step 1: 列出当前 features 正文**

Run:

```bash
find docs/design/moryflow/features -maxdepth 1 -type f | sort
```

**Step 2: 对照索引找缺失项和误导项**

Run:

```bash
sed -n '1,240p' docs/design/moryflow/features/index.md
```

**Step 3: 重写索引结构**

分组固定为：

1. WWW
2. Workspace / Chat
3. Publishing
4. PC Settings / Account
5. Search / Memory
6. Historical topics

**Step 4: 补齐缺失正文入口**

至少补上：

1. `pre-thread-explore-panel.md`
2. 后续新增的 `pc-account-and-membership.md`
3. 后续新增的 `pc-settings-information-architecture.md`

**Step 5: 回写进度**

把 `Task 1` 改为 `DONE`，写明索引已经改成按产品路径组织。

**完成标准**

- 索引没有漏文档
- 历史 `completed` 专题不再占据主入口

**完成记录**

- 状态：DONE
- 完成内容：已把 Features 索引改成按当前产品路径组织，并补入 `pre-thread-explore-panel.md`。
- 偏差：无

### Task 2: 重写 WWW 架构文档

**Files:**
- Modify: `docs/design/moryflow/features/moryflow-www-agent-first-site-architecture.md`
- Modify: `apps/moryflow/www/CLAUDE.md`

**Step 1: 提取当前页面体系**

Run:

```bash
find apps/moryflow/www/src/routes -maxdepth 3 -type f | sort
sed -n '1,240p' apps/moryflow/www/src/lib/site-pages.ts
```

**Step 2: 提取当前首页结构与导航入口**

Run:

```bash
sed -n '1,220p' apps/moryflow/www/src/lib/homepage-sections.ts
sed -n '1,260p' apps/moryflow/www/src/components/layout/Header.tsx
sed -n '1,220p' apps/moryflow/www/src/components/layout/Footer.tsx
```

**Step 3: 删除旧事实**

从文档中移除：

1. `/features`
2. `/use-cases`
3. `/about`
4. “SEO/compare 仅英文发布”
5. “Hero 预留产品大图位”
6. “后续补单页 OG”这类未来时口径

**Step 4: 用当前实现重写正文**

正文必须写清：

1. 当前页面分类
2. `site-pages.ts` 的职责
3. locale 现状
4. 首页 section 顺序
5. Compare / Pricing / Docs / GitHub / Download 的关系
6. 当前下载与定价口径

**Step 5: 同步修正 `apps/moryflow/www/CLAUDE.md`**

去掉：

1. 产品大图占位符
2. 页面单页 OG 待补

保留当前稳定结构、技术栈、下载口径、路由结构。

**Step 6: 回写进度**

把 `Task 2` 改为 `DONE`，写明 WWW 事实源和 `CLAUDE.md` 已对齐。

**完成标准**

- 文档不再提旧视觉占位
- 文档中的页面和首页结构与代码一致

**完成记录**

- 状态：DONE
- 完成内容：已按当前 route、registry、header/footer 和 homepage sections 重写 WWW 架构文档，并同步修正 `apps/moryflow/www/CLAUDE.md`。
- 偏差：无

### Task 3: 重写 WWW SEO 规范

**Files:**
- Modify: `docs/reference/moryflow-www-seo-content-guidelines.md`

**Step 1: 读取当前 registry 结构**

Run:

```bash
sed -n '1,240p' apps/moryflow/www/src/lib/site-pages.ts
```

**Step 2: 检查旧字段和旧页面路径**

Run:

```bash
rg -n "canonical|keywordCluster|redirects|/features|/use-cases" docs/reference/moryflow-www-seo-content-guidelines.md
```

**Step 3: 重写 registry 章节**

以当前 `SitePageDefinition` 为准，写清：

1. `id`
2. `path`
3. `kind`
4. `indexable`
5. `locales`
6. `schema`
7. `changefreq`
8. `priority`
9. `lastModified`
10. `ogImage`

**Step 4: 重写页面类型、内链和 CTA**

改成当前口径：

1. 以 `/download` 为主转化入口
2. 以 `/pricing`、`/compare/*`、相关 SEO 页为辅助内链
3. 不再引用 `/features`、`/use-cases`

**Step 5: 重写 locale 规则**

按当前双语发布现状写，不再延续旧的“英文优先”假设。

**Step 6: 清理残留并回写进度**

Run:

```bash
rg -n "/features|/use-cases|canonical|keywordCluster|redirects" docs/reference/moryflow-www-seo-content-guidelines.md
```

把 `Task 3` 改为 `DONE`。

**完成标准**

- 搜索命令无输出
- SEO 规范与 `site-pages.ts` 一致

**完成记录**

- 状态：DONE
- 完成内容：已按当前 `SitePageDefinition`、内链目标和 CTA 规则重写 SEO 规范，并去掉旧 registry 字段与旧页面路径。
- 偏差：无

### Task 4: 清理旧视觉口径

**Files:**
- Modify: `docs/design/moryflow/features/moryflow-www-agent-first-site-architecture.md`
- Modify: `apps/moryflow/www/CLAUDE.md`
- Review: 其他本次修改的 docs

**Step 1: 搜索旧视觉相关文案**

Run:

```bash
rg -n "旧视觉占位|产品大图占位|Hero 视觉位|单页 OG|待补图" docs apps/moryflow/www/CLAUDE.md -g '*.md'
```

**Step 2: 只处理稳定事实源**

本次只清理：

1. 本次改到的 design/reference 正文
2. 已失真的 `CLAUDE.md`

不需要为了旧 plan 文档做大规模历史清理。

**Step 3: 把文案改成当前口径**

统一写法：

- 不写旧视觉占位
- 不写占位
- 不写未来待补图

**Step 4: 回写进度**

把 `Task 4` 改为 `DONE`，写明旧视觉口径已从稳定事实源清除。

**完成标准**

- 本次交付涉及的稳定文档里不再出现旧视觉心智

**完成记录**

- 状态：DONE
- 完成内容：已从 WWW 架构文档和 WWW CLAUDE 中清理产品大图占位、预留视觉位和单页 OG 待补等口径。
- 偏差：无

### Task 5: 新增 PC 账号与会员文档

**Files:**
- Create: `docs/design/moryflow/features/pc-account-and-membership.md`

**Step 1: 盘点 account 目录**

Run:

```bash
sed -n '1,220p' apps/moryflow/pc/src/renderer/components/settings-dialog/components/account-section.tsx
find apps/moryflow/pc/src/renderer/components/settings-dialog/components/account -maxdepth 1 -type f | sort
```

**Step 2: 固定当前能力边界**

正文必须覆盖：

1. 登录
2. 资料展示与编辑
3. 密码重置
4. 订阅
5. Credit Packs
6. 删除账号

**Step 3: 写清与 settings 的关系**

明确这是 Settings 的 `account` section，不是独立页面。

**Step 4: 写清与 core auth 文档的边界**

本文写用户可见能力，不写底层 token 与 server auth 机制。

**Step 5: 写正文并更新索引**

同步更新 `docs/design/moryflow/features/index.md`。

**Step 6: 回写进度**

把 `Task 5` 改为 `DONE`。

**完成标准**

- 读这篇文档就能理解 PC 当前账号和会员体系

**完成记录**

- 状态：DONE
- 完成内容：已新增 `pc-account-and-membership.md`，覆盖账号页分流、登录注册、找回密码、会员升级、积分包和删号流程。
- 偏差：无

### Task 6: 新增 PC 设置体系文档

**Files:**
- Create: `docs/design/moryflow/features/pc-settings-information-architecture.md`
- Modify: `docs/design/moryflow/features/index.md`

**Step 1: 读取设置分区定义**

Run:

```bash
sed -n '1,220p' apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts
```

**Step 2: 读取关键 section 实现**

Run:

```bash
sed -n '1,220p' apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers-section.tsx
sed -n '1,260p' apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp-section.tsx
sed -n '1,260p' apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx
```

**Step 3: 写正文**

正文必须覆盖：

1. section 清单
2. 每个 section 的职责
3. 用户资料和运行时配置的边界
4. 与 core 文档的边界

**Step 4: 更新索引**

把新文档加入 `features/index.md`。

**Step 5: 回写进度**

把 `Task 6` 改为 `DONE`。

**完成标准**

- 设置页 IA 已有单一事实源

**完成记录**

- 状态：DONE
- 完成内容：已新增 `pc-settings-information-architecture.md`，明确 section 顺序、职责边界、Workspace 关系和滚动版式约束。
- 偏差：无

### Task 7: 收口 Chat / Pre-thread 文档

**Files:**
- Modify: `docs/design/moryflow/features/chat-input-and-chat-pane.md`
- Delete: `docs/design/moryflow/features/pre-thread-explore-panel.md`
- Modify: `docs/design/moryflow/features/index.md`

**Step 1: 再读当前实现**

Run:

```bash
sed -n '1,220p' apps/moryflow/pc/src/renderer/components/chat-pane/components/pre-thread-view.tsx
sed -n '1,260p' apps/moryflow/pc/src/renderer/components/chat-pane/components/pre-thread-explore-panel/const.ts
sed -n '1,280p' apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx
```

**Step 2: 把 Pre-thread 事实并入主文档**

并入内容包括：

1. 新建会话入口
2. Explore Bar / Explore Panel
3. Get Started 和 Skills 提示
4. 与输入框的衔接

**Step 3: 删除平级旧文档**

删除 `pre-thread-explore-panel.md`，避免双轨维护。

**Step 4: 更新索引**

从 `features/index.md` 去掉旧文档，保留主文档入口。

**Step 5: 回写进度**

把 `Task 7` 改为 `DONE`。

**完成标准**

- Chat 相关事实只剩一个主文档

**完成记录**

- 状态：DONE
- 完成内容：已重写 `chat-input-and-chat-pane.md`，并把 `pre-thread-explore-panel.md` 删除，索引只保留 Chat 主文档入口。
- 偏差：无

### Task 8: 收缩历史 completed 专题

**Files:**
- Modify: `docs/design/moryflow/features/index.md`
- Review: `docs/design/moryflow/features/moryflow-pc-remote-agents-home-module.md`
- Review: `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`
- Review: `docs/design/moryflow/features/pc-skills-builtin-online-sync.md`

**Step 1: 审核这些文档是否仍有独立边界**

保留条件只有两个：

1. 仍是独立架构边界
2. 仍会被频繁引用

**Step 2: 先从索引层降级**

即使暂时不删正文，也先把它们移出主入口分组。

**Step 3: 对 Remote Agents / Telegram 作出收口判断**

如果 Telegram 只是 `Remote Agents` 的细节，就不再把两篇都作为主入口。

**Step 4: 回写进度**

把 `Task 8` 改为 `DONE`。

**完成标准**

- Features 索引主入口只剩当前产品路径

**完成记录**

- 状态：DONE
- 完成内容：已在索引中收缩历史专题，只保留仍被 core 文档引用的两篇作为显式入口，其余降级为归档说明。
- 偏差：无

### Task 9: 全量回读与索引复核

**Files:**
- Read: `docs/design/moryflow/features/index.md`
- Read: `docs/design/moryflow/features/moryflow-www-agent-first-site-architecture.md`
- Read: `docs/reference/moryflow-www-seo-content-guidelines.md`
- Read: `docs/design/moryflow/features/pc-account-and-membership.md`
- Read: `docs/design/moryflow/features/pc-settings-information-architecture.md`
- Read: `docs/design/moryflow/features/chat-input-and-chat-pane.md`
- Read: `apps/moryflow/www/CLAUDE.md`

**Step 1: 全量回读**

Run:

```bash
sed -n '1,260p' docs/design/moryflow/features/index.md
sed -n '1,280p' docs/design/moryflow/features/moryflow-www-agent-first-site-architecture.md
sed -n '1,320p' docs/reference/moryflow-www-seo-content-guidelines.md
sed -n '1,280p' docs/design/moryflow/features/pc-account-and-membership.md
sed -n '1,280p' docs/design/moryflow/features/pc-settings-information-architecture.md
sed -n '1,320p' docs/design/moryflow/features/chat-input-and-chat-pane.md
sed -n '1,280p' apps/moryflow/www/CLAUDE.md
```

**Step 2: 做一次旧视觉口径终检**

Run:

```bash
rg -n "旧视觉占位|产品大图占位|Hero 视觉位|单页 OG|待补图" docs apps/moryflow/www/CLAUDE.md -g '*.md'
```

**Step 3: 检查索引是否引用了不存在的文件**

Run:

```bash
find docs/design/moryflow/features -maxdepth 1 -type f | sort
```

**Step 4: 回写最终进度**

把 `Task 9` 改为 `DONE`，并把所有任务状态复核一遍。

**完成标准**

- 所有任务均为 `DONE`
- 索引和正文一致
- 稳定事实源不再带旧视觉口径

**完成记录**

- 状态：DONE
- 完成内容：已完成索引、WWW、SEO、PC、Chat 和 WWW CLAUDE 的回读复核，并确认新增文件存在、旧 pre-thread 文档已删除、旧图像口径检索无输出。
- 偏差：无

## 8. 每步完成后的回写方式

每个 Task 完成后，必须同时做两件事：

1. 更新第 4 节“执行进度”表。
2. 在对应 Task 下面补一行 `完成记录`。

格式固定如下：

```md
**完成记录**

- 状态：DONE
- 完成内容：一句话写清这一步实际做了什么
- 偏差：没有则写“无”
```

不要写：

1. “我做了很多工作”
2. “经过多轮分析”
3. 详细时间线
4. review 过程播报

## 9. 验证命令

执行完成后至少跑一次：

```bash
find docs/design/moryflow/features -maxdepth 1 -type f | sort
sed -n '1,240p' docs/design/moryflow/features/index.md
sed -n '1,280p' docs/design/moryflow/features/moryflow-www-agent-first-site-architecture.md
sed -n '1,320p' docs/reference/moryflow-www-seo-content-guidelines.md
test -f docs/design/moryflow/features/pc-account-and-membership.md
test -f docs/design/moryflow/features/pc-settings-information-architecture.md
test ! -f docs/design/moryflow/features/pre-thread-explore-panel.md
rg -n "旧视觉占位|产品大图占位|Hero 视觉位|单页 OG|待补图" docs apps/moryflow/www/CLAUDE.md -g '*.md'
```

## 10. 交付标准

交付完成时，应满足：

1. Moryflow docs 主干已经按当前产品结构重排。
2. WWW 事实源与 SEO 规范和当前实现一致。
3. PC 账号、会员、设置体系都有稳定事实源。
4. Chat 文档边界已经收口。
5. 新版本不再使用的旧视觉口径已从稳定文档中清掉。
6. 本计划文档本身已经回写完整进度，能够作为冻结执行稿存档。
